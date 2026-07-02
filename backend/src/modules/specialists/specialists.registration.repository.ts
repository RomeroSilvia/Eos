import { supabase } from '../../config/supabase';
import type { SpecialistProfileInsert, SpecialistProfileRow } from '../../database/schema.types';
import { TABLE_NAMES } from '../../database/tableNames';

export type SpecialistLicenseStatus = 'pending' | 'rejected' | 'verified' | 'not_submitted';
export type SpecialistSpecialty = 'dermatologo' | 'cosmetologo';

export type SpecialistStatus = {
  license_status: SpecialistLicenseStatus;
  rejection_reason: string | null;
  specialty: SpecialistSpecialty | null;
  license_number: string | null;
  full_name: string | null;
  center: {
    id: string;
    name: string;
  } | null;
};

export const specialistsRegistrationRepository = {
  findByLicenseNumber: async (licenseNumber: string): Promise<SpecialistProfileRow | null> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.specialistProfiles)
      .select('*')
      .eq('license_number', licenseNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  create: async (
    data: SpecialistProfileInsert,
    client: typeof supabase = supabase
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
