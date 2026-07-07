import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/requireRole.middleware';
import {
  assignSubscription,
  cancelMySubscription,
  createSubscriptionPlan,
  getMySubscription,
  listAssignableUsers,
  listSubscriptionPlans,
  listSubscriptions,
  updateSubscriptionStatus,
  updateSubscriptionPlan
} from './subscriptions.controller';

export const subscriptionsRouter = Router();

subscriptionsRouter.use(authenticate);

subscriptionsRouter.get('/me', getMySubscription);
subscriptionsRouter.patch('/me/cancel', cancelMySubscription);

subscriptionsRouter.use(requireRole('center_admin'));

subscriptionsRouter.get('/plans', listSubscriptionPlans);
subscriptionsRouter.post('/plans', createSubscriptionPlan);
subscriptionsRouter.patch('/plans/:planId', updateSubscriptionPlan);
subscriptionsRouter.get('/users/search', listAssignableUsers);
subscriptionsRouter.get('/', listSubscriptions);
subscriptionsRouter.post('/', assignSubscription);
subscriptionsRouter.patch('/:subscriptionId/status', updateSubscriptionStatus);
