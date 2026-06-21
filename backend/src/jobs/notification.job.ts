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

  // Usuarios que tienen token registrado Y al menos una rutina activa
  const { data, error } = await db
    .from('push_tokens')
    .select('user_id, routines!inner(id)')
    .eq('routines.is_active', true);

  if (error) {
    console.error('[notification.job] Error consultando tokens:', error.message);
    return;
  }

  if (!data || data.length === 0) return;

  // Deduplicar por user_id (un usuario puede tener varias rutinas activas)
  const userIds: string[] = [...new Set<string>(data.map((row: { user_id: string }) => row.user_id))];

  const title = 'Es hora de tu rutina ✨';
  const body = 'No olvides completar tu rutina de skincare de hoy.';

  await Promise.allSettled(
    userIds.map((userId) => notificationsService.sendToUser(userId, title, body))
  );

  console.log(`[notification.job] Recordatorios enviados a ${userIds.length} usuario(s).`);
}

// Corre cada minuto; solo actúa cuando la hora coincide con uno de los horarios fijos
cron.schedule('* * * * *', async () => {
  if (!REMINDER_TIMES.includes(currentHHmm())) return;
  await sendRoutineReminders();
});

console.log('[notification.job] Scheduler iniciado. Recordatorios a las', REMINDER_TIMES.join(' y '), 'hs.');
