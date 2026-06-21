import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { notificationsService } from './notifications.service';

export const notificationsHealth: RequestHandler = (_req, res) => {
  res.json({ status: 'ok', module: 'notifications' });
};

export const registerToken: RequestHandler = asyncHandler(async (req, res) => {
  const { expoToken, platform } = req.body as { expoToken?: unknown; platform?: unknown };

  if (typeof expoToken !== 'string' || expoToken.trim().length === 0) {
    throw new ApiError(400, 'expoToken es requerido.');
  }

  if (platform !== 'ios' && platform !== 'android') {
    throw new ApiError(400, 'platform debe ser "ios" o "android".');
  }

  await notificationsService.registerToken(req.user.id, expoToken.trim(), platform);

  res.status(200).json({ ok: true });
});

export const unregisterToken: RequestHandler = asyncHandler(async (req, res) => {
  await notificationsService.deleteToken(req.user.id);
  res.status(204).send();
});

export const getNotifications: RequestHandler = asyncHandler(async (req, res) => {
  const notifications = await notificationsService.getNotifications(req.user.id);
  res.json(notifications);
});

export const markNotificationRead: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (typeof id !== 'string' || id.trim() === '') {
    throw new ApiError(400, 'id es requerido.');
  }
  await notificationsService.markNotificationRead(id, req.user.id);
  res.status(204).send();
});
