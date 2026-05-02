import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database/database.types';
import { env } from './env';
 
const supabaseKey = env.supabaseServiceRoleKey || env.supabaseAnonKey;
 
if (!env.supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials are not configured yet. Add them to backend/.env when ready.');
}
 
export const supabase = createClient<Database>(
  env.supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);