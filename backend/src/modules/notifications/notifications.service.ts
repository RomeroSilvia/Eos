import { supabase } from '../../config/supabase';

type PushTokenRow = {
  user_id: string;
  expo_token: string;
};

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

export const notificationsService = {
  sendToUser: async (
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> => {
    const tokenRow = await findTokenByUserId(userId);

    if (!tokenRow?.expo_token) {
      return;
    }

    try {
      await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          {
            to: tokenRow.expo_token,
            title,
            body,
            data: data ?? {}
          }
        ])
      });
    } catch {
      // No bloqueamos el flujo del chat por una falla de push.
    }
  }
};

async function findTokenByUserId(userId: string): Promise<PushTokenRow | null> {
  const db = supabase as any;

  const { data, error } = await db
    .from('push_tokens')
    .select('user_id, expo_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data ?? null;
}
