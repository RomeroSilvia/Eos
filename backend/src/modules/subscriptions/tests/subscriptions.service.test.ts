/// <reference types="jest" />

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ApiError } from '../../../utils/ApiError';
import { subscriptionsRepository } from '../subscriptions.repository';
import { subscriptionsService } from '../subscriptions.service';

jest.mock('../subscriptions.repository', () => ({
  subscriptionsRepository: {
    listPlans: jest.fn(),
    createPlan: jest.fn(),
    updatePlan: jest.fn(),
    findPlanById: jest.fn(),
    listSubscriptions: jest.fn(),
    findUserById: jest.fn(),
    findActiveCenterById: jest.fn(),
    findAdminCenterAssignment: jest.fn(),
    createSubscription: jest.fn(),
    deactivateActiveSubscriptions: jest.fn()
  }
}));

jest.mock('../../audit/audit.service', () => ({
  recordAuditLog: jest.fn(async () => undefined)
}));

const mockedRepository = jest.mocked(subscriptionsRepository);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('subscriptionsService', () => {
  it('deberia crear un plan valido', async () => {
    mockedRepository.createPlan.mockResolvedValue({
      id: 'plan-1',
      name: 'Premium',
      level: 'premium',
      price: 25,
      features: { support: 'vip' },
      is_active: true,
      created_at: '2026-07-01T10:00:00.000Z',
      updated_at: '2026-07-01T10:00:00.000Z'
    });

    const result = await subscriptionsService.createPlan(
      {
        name: 'Premium',
        level: 'premium',
        price: 25,
        features: { chatEnabled: true }
      },
      { id: 'admin-1', role: 'center_admin' }
    );

    expect(result.name).toBe('Premium');
    expect(result.isActive).toBe(true);
  });

  it('deberia permitir guardar capacidades de chat y videollamadas en el plan', async () => {
    mockedRepository.createPlan.mockResolvedValue({
      id: 'plan-2',
      name: 'Profesional',
      level: 'premium',
      price: 50,
      features: {
        durationDays: 30,
        chatEnabled: true,
        chatImagesEnabled: true,
        videoCallsEnabled: true,
        maxMonthlyVideoCalls: 12,
        canAccessGroupSessions: true
      },
      is_active: true,
      created_at: '2026-07-01T10:00:00.000Z',
      updated_at: '2026-07-01T10:00:00.000Z'
    });

    const result = await subscriptionsService.createPlan(
      {
        name: 'Profesional',
        level: 'premium',
        price: 50,
        features: {
          durationDays: 30,
          chatEnabled: true,
          chatImagesEnabled: true,
          videoCallsEnabled: true,
          maxMonthlyVideoCalls: 12,
          canAccessGroupSessions: true
        }
      },
      { id: 'admin-1', role: 'center_admin' }
    );

    expect(result.features.videoCallsEnabled).toBe(true);
    expect(result.features.maxMonthlyVideoCalls).toBe(12);
  });

  it('deberia rechazar features invalidas para videollamadas', async () => {
    await expect(
      subscriptionsService.createPlan(
        {
          name: 'Plan roto',
          level: 'premium',
          price: 50,
          features: {
            videoCallsEnabled: 'si' as unknown as boolean
          }
        },
        { id: 'admin-1', role: 'center_admin' }
      )
    ).rejects.toMatchObject({ statusCode: 400 } as Partial<ApiError>);
  });

  it('deberia rechazar ownerType invalido al asignar suscripcion', async () => {
    await expect(
      subscriptionsService.assignSubscription(
        {
          ownerType: 'otro' as any,
          ownerId: 'owner-1',
          planId: 'plan-1'
        },
        { id: 'admin-1', role: 'center_admin' }
      )
    ).rejects.toMatchObject({ statusCode: 400 } as Partial<ApiError>);
  });

  it('deberia rechazar asignacion cuando el plan no existe', async () => {
    mockedRepository.findUserById.mockResolvedValue({ id: 'user-1', role: 'user' });
    mockedRepository.findPlanById.mockResolvedValue(null);

    await expect(
      subscriptionsService.assignSubscription(
        {
          ownerType: 'user',
          ownerId: 'user-1',
          planId: 'missing'
        },
        { id: 'admin-1', role: 'center_admin' }
      )
    ).rejects.toMatchObject({ statusCode: 404 } as Partial<ApiError>);
  });

  it('deberia asignar una suscripcion y cerrar activa previa', async () => {
    mockedRepository.findUserById.mockResolvedValue({ id: 'user-1', role: 'user' });
    mockedRepository.findPlanById.mockResolvedValue({
      id: 'plan-1',
      is_active: true
    });
    mockedRepository.deactivateActiveSubscriptions.mockResolvedValue(undefined);
    mockedRepository.createSubscription.mockResolvedValue({
      id: 'sub-1',
      owner_type: 'user',
      owner_id: 'user-1',
      plan_id: 'plan-1',
      status: 'active',
      started_at: '2026-07-01T10:00:00.000Z',
      ends_at: null,
      created_at: '2026-07-01T10:00:00.000Z',
      updated_at: '2026-07-01T10:00:00.000Z',
      subscription_plans: {
        id: 'plan-1',
        name: 'Premium',
        level: 'premium',
        price: 25,
        features: {},
        is_active: true,
        created_at: '2026-07-01T10:00:00.000Z',
        updated_at: '2026-07-01T10:00:00.000Z'
      }
    });

    const result = await subscriptionsService.assignSubscription(
      {
        ownerType: 'user',
        ownerId: 'user-1',
        planId: 'plan-1'
      },
      { id: 'admin-1', role: 'center_admin' }
    );

    expect(mockedRepository.deactivateActiveSubscriptions).toHaveBeenCalledWith('user', 'user-1');
    expect(result.ownerType).toBe('user');
    expect(result.plan?.id).toBe('plan-1');
  });

  it('deberia rechazar asignacion cuando el usuario owner no existe', async () => {
    mockedRepository.findUserById.mockResolvedValue(null);

    await expect(
      subscriptionsService.assignSubscription(
        {
          ownerType: 'user',
          ownerId: 'user-missing',
          planId: 'plan-1'
        },
        { id: 'admin-1', role: 'center_admin' }
      )
    ).rejects.toMatchObject({ statusCode: 404 } as Partial<ApiError>);

    expect(mockedRepository.findPlanById).not.toHaveBeenCalled();
  });

  it('deberia rechazar asignacion cuando ownerType es center', async () => {

    await expect(
      subscriptionsService.assignSubscription(
        {
          ownerType: 'center',
          ownerId: 'center-1',
          planId: 'plan-1'
        },
        { id: 'admin-1', role: 'center_admin' }
      )
    ).rejects.toMatchObject({ statusCode: 400 } as Partial<ApiError>);

    expect(mockedRepository.findActiveCenterById).not.toHaveBeenCalled();
    expect(mockedRepository.findPlanById).not.toHaveBeenCalled();
  });
});
