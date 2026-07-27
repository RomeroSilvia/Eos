import { notificationsRepository, type NotificationHistoryRow } from './notifications.repository';
import { env } from '../../config/env';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

export const notificationsService = {
  getHealth: () => ({
    module: 'notifications',
    status: 'ready'
  }),

  registerToken: async (
    userId: string,
    expoToken: string,
    platform: 'ios' | 'android'
  ) => {
    return notificationsRepository.upsertToken(userId, expoToken, platform);
  },

  deleteToken: async (userId: string): Promise<void> => {
    await notificationsRepository.deleteToken(userId);
  },

  sendToUser: async (
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> => {
    const tokenRow = await notificationsRepository.findTokenByUserId(userId);

    if (!tokenRow?.expo_token) {
      return;
    }

    try {
      await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { to: tokenRow.expo_token, title, body, data: data ?? {} }
        ])
      });
    } catch (error) {
      // No bloqueamos el flujo del llamador por una falla de push.
      if (env.nodeEnv === 'development') {
        console.error('[notifications] Error enviando push a Expo:', error);
      }
    }
  },

  saveNotification: async (
    userId: string,
    title: string,
    body: string,
    kind: string
  ): Promise<void> => {
    await notificationsRepository.saveNotification(userId, title, body, kind);
  },

  getNotifications: async (userId: string): Promise<NotificationHistoryRow[]> => {
    return notificationsRepository.findNotificationsByUserId(userId);
  },

  markNotificationRead: async (id: string, userId: string): Promise<void> => {
    await notificationsRepository.markNotificationRead(id, userId);
  }
};
