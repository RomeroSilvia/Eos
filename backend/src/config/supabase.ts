import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database/database.types';
import { env } from './env';

const supabaseUrl = env.supabaseUrl?.trim();
const supabaseAnonKey = env.supabaseAnonKey?.trim();
const supabaseServiceRoleKey = env.supabaseServiceRoleKey?.trim();

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL no esta configurada en backend/.env.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY no esta configurada en backend/.env.');
}

if (supabaseAnonKey && supabaseServiceRoleKey === supabaseAnonKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY no puede ser igual a SUPABASE_ANON_KEY.');
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

export function createSupabaseUserClient(accessToken: string) {
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
}
