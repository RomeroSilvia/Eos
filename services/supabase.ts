import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const accessTokenKey = 'eos-access-token';

let cachedClient: SupabaseClient | null = null;

export async function prepareSupabaseRealtimeClient(): Promise<SupabaseClient | null> {
  const client = getSupabaseClient();

  if (!client) {
    return null;
  }

  const accessToken = await getStoredAccessToken();

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

async function getStoredAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(accessTokenKey);
  }

  return SecureStore.getItemAsync(accessTokenKey);
}
