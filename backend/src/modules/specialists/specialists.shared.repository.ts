import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import type { Database } from '../../database/database.types';
import type { ProfileRow, SpecialistProfileRow } from '../../database/schema.types';
import { TABLE_NAMES } from '../../database/tableNames';

type SupabaseDbClient = SupabaseClient<Database>;

export const specialistsSharedRepository = {
  findSpecialistProfileByUserId: async (
    userId: string,
    client: SupabaseDbClient = supabase
  ): Promise<SpecialistProfileRow | null> => {
    const { data, error } = await client
      .from(TABLE_NAMES.specialistProfiles)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  findProfileById: async (userId: string): Promise<Pick<ProfileRow, 'id' | 'full_name' | 'email'> | null> => {
    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.profiles)
      .select('id, full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }
};
