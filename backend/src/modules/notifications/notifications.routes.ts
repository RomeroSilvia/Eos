import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  getNotifications,
  markNotificationRead,
  notificationsHealth,
  registerToken,
  unregisterToken
} from './notifications.controller';

export const notificationsRouter = Router();

notificationsRouter.get('/health', notificationsHealth);

notificationsRouter.use(authenticate);

notificationsRouter.post('/token', registerToken);
notificationsRouter.delete('/token', unregisterToken);
notificationsRouter.get('/', getNotifications);
notificationsRouter.patch('/:id/read', markNotificationRead);
