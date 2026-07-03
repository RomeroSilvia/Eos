import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';

export type AdminSpecialistProfileRow = {
  id: string;
  user_id: string;
  specialty: string;
  license_number: string;
  license_status: string;
  rejection_reason: string | null;
  center_id: string | null;
  created_at: string;
};

export type AdminSpecialistDocumentsRow = {
  id: string;
  dni_photo_url: string | null;
  title_photo_url: string | null;
};

export type AdminProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
};

export type AdminCenterRow = {
  id: string;
  name: string;
};

export type SpecialistStatusUpdate = {
  license_status: 'verified' | 'rejected';
  rejection_reason: string | null;
  center_id?: string | null;
};

export type SpecialistCenterUpdate = {
  center_id: string | null;
};

export const adminRepository = {
  findAllSpecialists: async (): Promise<AdminSpecialistProfileRow[]> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .select('id, user_id, specialty, license_number, license_status, rejection_reason, center_id, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  findPendingSpecialists: async (): Promise<AdminSpecialistProfileRow[]> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .select('id, user_id, specialty, license_number, license_status, rejection_reason, center_id, created_at')
      .eq('license_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  findActiveCentersByIds: async (centerIds: string[]): Promise<AdminCenterRow[]> => {
    if (centerIds.length === 0) {
      return [];
    }

    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.centers)
      .select('id, name')
      .in('id', centerIds)
      .eq('is_active', true);

    if (error) throw error;
    return data ?? [];
  },

  findProfilesByIds: async (userIds: string[]): Promise<AdminProfileRow[]> => {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAMES.profiles)
      .select('id, full_name, email')
      .in('id', userIds);

    if (error) throw error;
    return data ?? [];
  },

  findSpecialistDocumentsById: async (specialistProfileId: string): Promise<AdminSpecialistDocumentsRow | null> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.specialistProfiles)
      .select('id, dni_photo_url, title_photo_url')
      .eq('id', specialistProfileId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  findSpecialistById: async (specialistProfileId: string): Promise<AdminSpecialistProfileRow | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .select('id, user_id, specialty, license_number, license_status, rejection_reason, center_id, created_at')
      .eq('id', specialistProfileId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  updateSpecialistStatus: async (
    specialistProfileId: string,
    data: SpecialistStatusUpdate
  ): Promise<AdminSpecialistProfileRow | null> => {
    const db = supabase as any;
    const { data: updated, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .update(data)
      .eq('id', specialistProfileId)
      .eq('license_status', 'pending')
      .select('id, user_id, specialty, license_number, license_status, rejection_reason, center_id, created_at')
      .maybeSingle();

    if (error) throw error;
    return updated;
  },

  updateSpecialistCenter: async (
    specialistProfileId: string,
    data: SpecialistCenterUpdate
  ): Promise<AdminSpecialistProfileRow | null> => {
    const db = supabase as any;
    const { data: updated, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .update(data)
      .eq('id', specialistProfileId)
      .select('id, user_id, specialty, license_number, license_status, rejection_reason, center_id, created_at')
      .maybeSingle();

    if (error) throw error;
    return updated;
  }
};
