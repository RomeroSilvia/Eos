import type { Request, Response } from 'express';
import {
  assignSubscription,
  createSubscriptionPlan,
  listSubscriptionPlans,
  listSubscriptions,
  updateSubscriptionPlan
} from '../subscriptions.controller';
import { subscriptionsService } from '../subscriptions.service';

jest.mock('../subscriptions.service', () => ({
  subscriptionsService: {
    listPlans: jest.fn(),
    createPlan: jest.fn(),
    updatePlan: jest.fn(),
    listSubscriptions: jest.fn(),
    assignSubscription: jest.fn()
  }
}));

const mockedService = jest.mocked(subscriptionsService);

function makeResponse(): Response & { json: jest.Mock; status: jest.Mock } {
  return {
    json: jest.fn(),
    status: jest.fn().mockReturnThis()
  } as unknown as Response & { json: jest.Mock; status: jest.Mock };
}

describe('subscriptionsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deberia listar planes', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedService.listPlans.mockResolvedValue([{ id: 'plan-1' }] as any);

    listSubscriptionPlans({} as Request, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.json).toHaveBeenCalledWith({
      plans: [{ id: 'plan-1' }]
    });
  });

  it('deberia crear plan', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedService.createPlan.mockResolvedValue({ id: 'plan-1' } as any);

    createSubscriptionPlan(
      {
        body: { name: 'Premium', level: 'premium', price: 20 },
        user: { id: 'admin-1', role: 'center_admin', accessToken: 'token' }
      } as unknown as Request,
      res,
      next
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      plan: { id: 'plan-1' }
    });
  });

  it('deberia actualizar plan', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedService.updatePlan.mockResolvedValue({ id: 'plan-1', name: 'Actualizado' } as any);

    updateSubscriptionPlan(
      {
        params: { planId: 'plan-1' },
        body: { name: 'Actualizado' },
        user: { id: 'admin-1', role: 'center_admin', accessToken: 'token' }
      } as unknown as Request,
      res,
      next
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.json).toHaveBeenCalledWith({
      plan: { id: 'plan-1', name: 'Actualizado' }
    });
  });

  it('deberia listar suscripciones', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedService.listSubscriptions.mockResolvedValue([{ id: 'sub-1' }] as any);

    listSubscriptions({} as Request, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.json).toHaveBeenCalledWith({
      subscriptions: [{ id: 'sub-1' }]
    });
  });

  it('deberia asignar suscripcion', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedService.assignSubscription.mockResolvedValue({ id: 'sub-1' } as any);

    assignSubscription(
      {
        body: {
          ownerType: 'user',
          ownerId: 'user-1',
          planId: 'plan-1'
        },
        user: { id: 'admin-1', role: 'center_admin', accessToken: 'token' }
      } as unknown as Request,
      res,
      next
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      subscription: { id: 'sub-1' }
    });
  });
});
