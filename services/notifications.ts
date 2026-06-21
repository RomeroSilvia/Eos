import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiRequest } from '@/services/api/client';
import type { AppNotification, AppNotificationKind } from '@/types/notification';
import type { Reminder } from '@/types/reminder';

let schedulingPromise: Promise<void> | null = null;

export async function requestNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleRoutineReminder(title: string, body: string, seconds = 60): Promise<string | null> {
  const granted = await requestNotificationPermissions();

  if (!granted) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, seconds) }
  });
}

export async function scheduleRemindersByTime(reminders: Reminder[]): Promise<void> {
  if (schedulingPromise) {
    await schedulingPromise;
    return;
  }

  schedulingPromise = scheduleRemindersByTimeInternal(reminders);

  try {
    await schedulingPromise;
  } finally {
    schedulingPromise = null;
  }
}

async function scheduleRemindersByTimeInternal(reminders: Reminder[]): Promise<void> {
  const granted = await requestNotificationPermissions();

  if (!granted) {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;

    const { hour, minute } = parseReminderTime(reminder.time);
    if (hour === null || minute === null) continue;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: `Es hora de tu ${reminder.title.toLowerCase()}`,
          sound: 'default'
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute
        }
      });
    } catch (error) {
      console.error(`Error scheduling reminder ${reminder.id}:`, error);
    }
  }
}

export async function registerPushToken(): Promise<void> {
  // getExpoPushTokenAsync no funciona en Expo Go desde SDK 53; solo en dev/prod builds
  if (Constants.appOwnership === 'expo') return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

  await apiRequest({
    path: '/notifications/token',
    method: 'POST',
    body: JSON.stringify({ expoToken: tokenData.data, platform: Platform.OS })
  });
}

export async function unregisterPushToken(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  try {
    await apiRequest({ path: '/notifications/token', method: 'DELETE' });
  } catch {
    // Si el token ya no existía en el servidor no bloqueamos el logout.
  }
}

export async function areNotificationsEnabled(): Promise<boolean> {
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.granted;
}

export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  if (!enabled) {
    await unregisterPushToken();
    return false;
  }

  const granted = await requestNotificationPermissions();

  if (!granted) {
    return false;
  }

  await registerPushToken();
  return true;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const rows = await apiRequest<Array<{
    id: string; title: string; body: string; kind: string; is_read: boolean; created_at: string;
  }>>({ path: '/notifications', method: 'GET' });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    kind: row.kind as AppNotificationKind,
    isRead: row.is_read,
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest({ path: `/notifications/${id}/read`, method: 'PATCH' });
}

function parseReminderTime(timeString: string): { hour: number | null; minute: number | null } {
  const match = timeString.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return { hour: null, minute: null };

  return {
    hour: parseInt(match[1], 10),
    minute: parseInt(match[2], 10)
  };
}
