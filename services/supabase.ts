import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAccessToken } from '@/services/session';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let cachedClient: SupabaseClient | null = null;

export async function prepareSupabaseRealtimeClient(): Promise<SupabaseClient | null> {
  const client = getSupabaseClient();

  if (!client) {
    return null;
  }

  const accessToken = await getAccessToken();

  if (accessToken) {
    client.realtime.setAuth(accessToken);
  }

  return client;
}

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
  }

  return cachedClient;
}
