import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';
import type { ProfileRow, ProfileUpdate } from '../../database/schema.types';

export const profileRepository = {
  findById: async (userId: string): Promise<ProfileRow | null> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.profiles)
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  updateById: async (userId: string, data: ProfileUpdate): Promise<ProfileRow> => {
    const { data: profile, error } = await supabase
      .from(TABLE_NAMES.profiles)
      .update(data)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return profile;
  }
};
