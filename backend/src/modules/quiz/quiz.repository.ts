import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';
import type { SkinProfileInsert, SkinProfileRow } from '../../database/schema.types';

type MaybeError = { code?: string; message: string } | null;

const SKIN_PROFILE_SELECT = 'id, user_id, age_range, skin_type, imperfections, main_goal, routine_steps, created_at';

export const quizRepository = {
  findLatestByUserId: async (userId: string): Promise<SkinProfileRow | null> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.skinProfiles)
      .select(SKIN_PROFILE_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  insert: async (data: SkinProfileInsert): Promise<SkinProfileRow> => {
    const { data: skinProfile, error } = await supabase
      .from(TABLE_NAMES.skinProfiles)
      .insert(data)
      .select(SKIN_PROFILE_SELECT)
      .single();

    if (error) throw error;
    return skinProfile;
  },

  updateProfileSkinType: async (userId: string, skinType: string): Promise<MaybeError> => {
    const { error } = await supabase
      .from(TABLE_NAMES.profiles)
      .update({ skin_type: skinType })
      .eq('id', userId);

    return error;
  }
};
