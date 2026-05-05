import { supabase } from '../../config/supabase';
import type { ProfileInsert, ProfileRow } from '../../database/schema.types';

export const authRepository = {
  findProfileById: async (userId: string): Promise<ProfileRow | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    return data;
  },

  upsertProfile: async (data: ProfileInsert): Promise<ProfileRow> => {
    const profilesTable = supabase.from('profiles') as any;
    const { data: profile, error } = await profilesTable
      .upsert(data, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;

    return profile as ProfileRow;
  }
};
