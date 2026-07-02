import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';
import type { CenterAdminRow, CenterRow } from './centers.types';

const CENTER_SELECT = 'id, name, address, phone, city, province, image_url, is_active, created_at, updated_at';

type CenterMutation = {
  name?: string;
  address?: string | null;
  phone?: string | null;
  city?: string | null;
  province?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  updated_at?: string;
};

type SpecialistCenterStatsRow = {
  id: string;
  license_status: string;
};

type ClientRelationRow = {
  client_id: string;
};

type SpecialistCountRow = {
  center_id: string | null;
};

type CenterSpecialistRow = {
  id: string;
  user_id: string;
  specialty: string;
  license_status: string;
  center_id: string | null;
};

type CenterSpecialistProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type UploadFileInput = {
  bucket: string;
  path: string;
  buffer: Buffer;
  contentType: string;
};

export const centersRepository = {
  findActiveByAdminId: async (adminUserId: string): Promise<CenterRow[]> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.centerAdmins)
      .select(`centers(${CENTER_SELECT})`)
      .eq('user_id', adminUserId)
      .eq('role', 'center_admin');

    if (error) throw error;

    return (data ?? [])
      .map((row: { centers?: CenterRow | CenterRow[] | null }) => {
        const center = Array.isArray(row.centers) ? row.centers[0] : row.centers;
        return center ?? null;
      })
      .filter((center: CenterRow | null): center is CenterRow => Boolean(center?.is_active));
  },

  findActiveCenters: async (): Promise<CenterRow[]> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.centers)
      .select(CENTER_SELECT)
      .eq('is_active', true);

    if (error) throw error;
    return data ?? [];
  },

  findById: async (centerId: string): Promise<CenterRow | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.centers)
      .select(CENTER_SELECT)
      .eq('id', centerId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  findAdminAssignment: async (adminUserId: string, centerId: string): Promise<CenterAdminRow | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.centerAdmins)
      .select('id, user_id, center_id, role, created_at')
      .eq('user_id', adminUserId)
      .eq('center_id', centerId)
      .eq('role', 'center_admin')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  create: async (
    data: Required<Pick<CenterMutation, 'name'>> & Pick<CenterMutation, 'address' | 'phone' | 'city' | 'province' | 'image_url'>
  ): Promise<CenterRow> => {
    const db = supabase as any;
    const { data: created, error } = await db
      .from(TABLE_NAMES.centers)
      .insert(data)
      .select(CENTER_SELECT)
      .single();

    if (error) throw error;
    return created;
  },

  createAdminAssignment: async (adminUserId: string, centerId: string): Promise<void> => {
    const db = supabase as any;
    const { error } = await db
      .from(TABLE_NAMES.centerAdmins)
      .insert({
        user_id: adminUserId,
        center_id: centerId,
        role: 'center_admin'
      });

    if (error) throw error;
  },

  update: async (centerId: string, data: CenterMutation): Promise<CenterRow | null> => {
    const db = supabase as any;
    const { data: updated, error, count } = await db
      .from(TABLE_NAMES.centers)
      .update(data, { count: 'exact' })
      .eq('id', centerId)
      .eq('is_active', true)
      .select(CENTER_SELECT)
      .maybeSingle();

    if (error) throw error;
    if (updated) return updated;
    if (count === 0) return null;

    const refreshed = await centersRepository.findById(centerId);
    if (!refreshed?.is_active) return null;

    return refreshed;
  },

  softDelete: async (centerId: string): Promise<CenterRow | null> => {
    const db = supabase as any;
    const { data: updated, error } = await db
      .from(TABLE_NAMES.centers)
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', centerId)
      .eq('is_active', true)
      .select(CENTER_SELECT)
      .maybeSingle();

    if (error) throw error;
    return updated;
  },

  findSpecialistStatsByCenterId: async (centerId: string): Promise<SpecialistCenterStatsRow[]> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .select('id, license_status')
      .eq('center_id', centerId);

    if (error) throw error;
    return data ?? [];
  },

  findSpecialistCountsByCenterIds: async (centerIds: string[]): Promise<Map<string, number>> => {
    if (centerIds.length === 0) {
      return new Map();
    }

    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .select('center_id')
      .in('center_id', centerIds);

    if (error) throw error;

    const counts = new Map<string, number>();

    for (const row of (data ?? []) as SpecialistCountRow[]) {
      if (!row.center_id) continue;
      counts.set(row.center_id, (counts.get(row.center_id) ?? 0) + 1);
    }

    return counts;
  },

  findSpecialistsByCenterId: async (centerId: string): Promise<CenterSpecialistRow[]> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .select('id, user_id, specialty, license_status, center_id')
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  findProfilesByIds: async (userIds: string[]): Promise<CenterSpecialistProfileRow[]> => {
    if (userIds.length === 0) {
      return [];
    }

    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.profiles)
      .select('id, full_name, email')
      .in('id', userIds);

    if (error) throw error;
    return data ?? [];
  },

  uploadFile: async (input: UploadFileInput): Promise<void> => {
    const { error } = await supabase.storage.from(input.bucket).upload(input.path, input.buffer, {
      contentType: input.contentType,
      upsert: true
    });

    if (error) throw error;
  },

  getPublicUrl: (bucket: string, path: string): string => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  findActiveClientRelationsBySpecialistIds: async (specialistIds: string[]): Promise<ClientRelationRow[]> => {
    if (specialistIds.length === 0) {
      return [];
    }

    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.clientSpecialistRelations)
      .select('client_id')
      .in('specialist_id', specialistIds)
      .eq('status', 'active');

    if (error) throw error;
    return data ?? [];
  }
};
