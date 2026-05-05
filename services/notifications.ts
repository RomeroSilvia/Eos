import * as Notifications from 'expo-notifications';
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
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds }
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

  // Cancelar notificaciones previas
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;

    const { hour, minute } = parseReminderTime(reminder.time);
    if (hour === null || minute === null) continue;

    const now = new Date();
    const reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);

    // Si la hora ya pasó hoy, programar para mañana
    if (reminderTime < now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const secondsUntilReminder = Math.floor((reminderTime.getTime() - now.getTime()) / 1000);

    if (secondsUntilReminder > 0) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.title,
            body: `Es hora de tu ${reminder.title.toLowerCase()}`,
            sound: 'default'
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilReminder,
            repeats: true
          }
        });
      } catch (error) {
        console.error(`Error scheduling reminder ${reminder.id}:`, error);
      }
    }
  }
}

function parseReminderTime(timeString: string): { hour: number | null; minute: number | null } {
  // Parsear "1:00 hs" o "12:00 hs"
  const match = timeString.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return { hour: null, minute: null };

  return {
    hour: parseInt(match[1], 10),
    minute: parseInt(match[2], 10)
  };
}
