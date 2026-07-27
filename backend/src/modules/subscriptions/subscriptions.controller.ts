import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { subscriptionsService } from './subscriptions.service';

export const subscriptionsHealth: RequestHandler = (_req, res) => {
  res.json(subscriptionsService.getHealth());
};

export const listSubscriptionPlans: RequestHandler = asyncHandler(async (_req, res) => {
  const plans = await subscriptionsService.listPlans();
  res.json({ plans });
});

export const createSubscriptionPlan: RequestHandler = asyncHandler(async (req, res) => {
  const plan = await subscriptionsService.createPlan(req.body, {
    id: req.user.id,
    role: req.user.role ?? 'user'
  });

  res.status(201).json({ plan });
});

export const updateSubscriptionPlan: RequestHandler = asyncHandler(async (req, res) => {
  const planId = String(req.params.planId);

  const plan = await subscriptionsService.updatePlan(planId, req.body, {
    id: req.user.id,
    role: req.user.role ?? 'user'
  });

  res.json({ plan });
});

export const listSubscriptions: RequestHandler = asyncHandler(async (_req, res) => {
  const subscriptions = await subscriptionsService.listSubscriptions();
  res.json({ subscriptions });
});

export const getMySubscription: RequestHandler = asyncHandler(async (req, res) => {
  const subscription = await subscriptionsService.getMySubscription(req.user.id);
  res.json({ subscription });
});

export const cancelMySubscription: RequestHandler = asyncHandler(async (req, res) => {
  const subscription = await subscriptionsService.cancelMySubscription(req.user.id, {
    id: req.user.id,
    role: req.user.role ?? 'user'
  });

  res.json({ subscription });
});

export const listAssignableUsers: RequestHandler = asyncHandler(async (req, res) => {
  const email = typeof req.query.email === 'string' ? req.query.email : '';
  const users = await subscriptionsService.searchAssignableUsersByEmail(email);
  res.json({ users });
});

export const assignSubscription: RequestHandler = asyncHandler(async (req, res) => {
  const subscription = await subscriptionsService.assignSubscription(req.body, {
    id: req.user.id,
    role: req.user.role ?? 'user'
  });

  res.status(201).json({ subscription });
});

export const updateSubscriptionStatus: RequestHandler = asyncHandler(async (req, res) => {
  const subscriptionId = String(req.params.subscriptionId);

  const subscription = await subscriptionsService.updateSubscriptionStatus(subscriptionId, req.body, {
    id: req.user.id,
    role: req.user.role ?? 'user'
  });

  res.json({ subscription });
});
