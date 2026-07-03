import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import type { Database } from '../../database/database.types';
import type { ProfileRow, SpecialistProfileRow } from '../../database/schema.types';
import { TABLE_NAMES } from '../../database/tableNames';

type SupabaseDbClient = SupabaseClient<Database>;
type CenterSummary = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  imageUrl: string | null;
};

type SpecialistProfileWithCenterId = SpecialistProfileRow & {
  center_id: string | null;
};

export const specialistsSharedRepository = {
  findSpecialistProfileByUserId: async (
    userId: string,
    client: SupabaseDbClient = supabase
  ): Promise<SpecialistProfileWithCenterId | null> => {
    const db = client as any;
    const { data, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .select('id, user_id, specialty, license_number, dni_photo_url, title_photo_url, license_status, rejection_reason, created_at, updated_at, center_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as SpecialistProfileWithCenterId | null;
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
  },

  findActiveCenterById: async (centerId: string | null | undefined): Promise<CenterSummary | null> => {
    if (!centerId) return null;

    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.centers)
      .select('id, name, address, city, province, phone, image_url, is_active')
      .eq('id', centerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || data.is_active !== true) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      address: data.address ?? null,
      city: data.city ?? null,
      province: data.province ?? null,
      phone: data.phone ?? null,
      imageUrl: data.image_url ?? null
    };
  }
};
