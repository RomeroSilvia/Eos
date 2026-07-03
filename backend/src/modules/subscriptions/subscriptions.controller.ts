import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { subscriptionsService } from './subscriptions.service';

export const listSubscriptionPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await subscriptionsService.listPlans();
  res.json({ plans });
});

export const createSubscriptionPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await subscriptionsService.createPlan(req.body, {
    id: req.user.id,
    role: req.user.role ?? 'user'
  });

  res.status(201).json({ plan });
});

export const updateSubscriptionPlan = asyncHandler(async (req: Request, res: Response) => {
  const planId = String(req.params.planId);

  const plan = await subscriptionsService.updatePlan(planId, req.body, {
    id: req.user.id,
    role: req.user.role ?? 'user'
  });

  res.json({ plan });
});

export const listSubscriptions = asyncHandler(async (_req: Request, res: Response) => {
  const subscriptions = await subscriptionsService.listSubscriptions();
  res.json({ subscriptions });
});

export const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await subscriptionsService.getMySubscription(req.user.id);
  res.json({ subscription });
});

export const cancelMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await subscriptionsService.cancelMySubscription(req.user.id, {
    id: req.user.id,
    role: req.user.role ?? 'user'
  });

  res.json({ subscription });
});

export const listAssignableUsers = asyncHandler(async (req: Request, res: Response) => {
  const email = typeof req.query.email === 'string' ? req.query.email : '';
  const users = await subscriptionsService.searchAssignableUsersByEmail(email);
  res.json({ users });
});

export const assignSubscription = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await subscriptionsService.assignSubscription(req.body, {
    id: req.user.id,
    role: req.user.role ?? 'user'
  });

  res.status(201).json({ subscription });
});

export const updateSubscriptionStatus = asyncHandler(async (req: Request, res: Response) => {
  const subscriptionId = String(req.params.subscriptionId);

  const subscription = await subscriptionsService.updateSubscriptionStatus(subscriptionId, req.body, {
    id: req.user.id,
    role: req.user.role ?? 'user'
  });

  res.json({ subscription });
});
