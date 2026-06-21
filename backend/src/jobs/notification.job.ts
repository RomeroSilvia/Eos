import cron from 'node-cron';
import { supabase } from '../config/supabase';
import { notificationsService } from '../modules/notifications/notifications.service';

// Horarios fijos en que se envían los recordatorios (HH:mm, hora del servidor)
const REMINDER_TIMES = ['08:00', '21:00'];

function currentHHmm(): string {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

async function sendRoutineReminders(): Promise<void> {
  const db = supabase as any;

  // Todos los usuarios con al menos una rutina activa (independiente de si tienen push token)
  const { data, error } = await db
    .from('routines')
    .select('user_id, name')
    .eq('is_active', true);

  if (error) {
    console.error('[notification.job] Error consultando rutinas activas:', error.message);
    return;
  }

  if (!data || data.length === 0) return;

  // Primera rutina activa por usuario (para incluir su nombre en la notificación)
  const userRoutineMap = new Map<string, string>();
  for (const row of data as { user_id: string; name: string }[]) {
    if (!userRoutineMap.has(row.user_id)) {
      userRoutineMap.set(row.user_id, row.name);
    }
  }

  const isMorning = currentHHmm() === '08:00';
  const kind = isMorning ? 'routine-morning' : 'routine-evening';

  await Promise.allSettled(
    Array.from(userRoutineMap.entries()).map(async ([userId, routineName]) => {
      const title = isMorning
        ? `Buen día ☀️ Hora de empezar tu rutina ${routineName}`
        : 'Es momento de cerrar el día 🌙';
      const body = isMorning
        ? 'Tenés una rutina pendiente.'
        : `No te duermas sin tu rutina ${routineName}`;
      await notificationsService.sendToUser(userId, title, body, { kind });
      await notificationsService.saveNotification(userId, title, body, kind);
    })
  );

  console.log(`[notification.job] Recordatorios enviados a ${userRoutineMap.size} usuario(s).`);
}

// Corre cada minuto; solo actúa cuando la hora coincide con uno de los horarios fijos
cron.schedule('* * * * *', async () => {
  if (!REMINDER_TIMES.includes(currentHHmm())) return;
  await sendRoutineReminders();
});

console.log('[notification.job] Scheduler iniciado. Recordatorios a las', REMINDER_TIMES.join(' y '), 'hs.');
