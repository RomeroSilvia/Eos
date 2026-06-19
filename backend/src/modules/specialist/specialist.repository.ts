import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import type { Database } from '../../database/database.types';
import type { SpecialistProfileInsert, SpecialistProfileRow } from '../../database/schema.types';
import { TABLE_NAMES } from '../../database/tableNames';

type SupabaseDbClient = SupabaseClient<Database>;

export type SpecialistLicenseStatus = 'pending' | 'rejected' | 'verified' | 'not_submitted';
export type SpecialistSpecialty = 'dermatologo' | 'cosmetologo';

export type SpecialistStatus = {
  license_status: SpecialistLicenseStatus;
  rejection_reason: string | null;
  specialty: SpecialistSpecialty | null;
  license_number: string | null;
  full_name: string | null;
};

export const specialistRepository = {
  findByLicenseNumber: async (licenseNumber: string): Promise<SpecialistProfileRow | null> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.specialistProfiles)
      .select('*')
      .eq('license_number', licenseNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  findByUserId: async (userId: string, client: SupabaseDbClient = supabase): Promise<SpecialistProfileRow | null> => {
    const { data, error } = await client
      .from(TABLE_NAMES.specialistProfiles)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  findFullNameByUserId: async (userId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.profiles)
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.full_name ?? null;
  },

  create: async (
    data: SpecialistProfileInsert,
    client: SupabaseDbClient = supabase
  ): Promise<SpecialistProfileRow | null> => {
    const { data: created, error } = await client
      .from(TABLE_NAMES.specialistProfiles)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  }
};
