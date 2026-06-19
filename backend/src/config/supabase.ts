import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database/database.types';
import { env } from './env';

export const supabase = createClient<Database>(
  env.supabaseUrl!,
  env.supabaseServiceRoleKey!,
  {
    db: {
      schema: 'public'
    }
  }
);

export function createSupabaseUserClient(accessToken: string) {
  return createClient<Database>(
    env.supabaseUrl!,
    env.supabaseAnonKey!,
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
