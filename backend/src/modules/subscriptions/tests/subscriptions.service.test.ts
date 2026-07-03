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
        features: { support: 'vip' }
      },
      { id: 'admin-1', role: 'center_admin' }
    );

    expect(result.name).toBe('Premium');
    expect(result.isActive).toBe(true);
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
    mockedRepository.findPlanById.mockResolvedValue({
      id: 'plan-1',
      is_active: true
    });
    mockedRepository.deactivateActiveSubscriptions.mockResolvedValue(undefined);
    mockedRepository.createSubscription.mockResolvedValue({
      id: 'sub-1',
      owner_type: 'center',
      owner_id: 'center-1',
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
        ownerType: 'center',
        ownerId: 'center-1',
        planId: 'plan-1'
      },
      { id: 'admin-1', role: 'center_admin' }
    );

    expect(mockedRepository.deactivateActiveSubscriptions).toHaveBeenCalledWith('center', 'center-1');
    expect(result.ownerType).toBe('center');
    expect(result.plan?.id).toBe('plan-1');
  });
});
