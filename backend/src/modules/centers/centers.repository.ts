import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';
import type { CenterAdminRow, CenterRow } from './centers.types';

type CenterMutation = {
  name?: string;
  address?: string | null;
  phone?: string | null;
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

export const centersRepository = {
  findActiveByAdminId: async (adminUserId: string): Promise<CenterRow[]> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.centerAdmins)
      .select('centers(id, name, address, phone, is_active, created_at, updated_at)')
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
      .select('id, name, address, phone, is_active, created_at, updated_at')
      .eq('is_active', true);

    if (error) throw error;
    return data ?? [];
  },

  findById: async (centerId: string): Promise<CenterRow | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.centers)
      .select('id, name, address, phone, is_active, created_at, updated_at')
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

  create: async (data: Required<Pick<CenterMutation, 'name'>> & Pick<CenterMutation, 'address' | 'phone'>): Promise<CenterRow> => {
    const db = supabase as any;
    const { data: created, error } = await db
      .from(TABLE_NAMES.centers)
      .insert(data)
      .select('id, name, address, phone, is_active, created_at, updated_at')
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
    const { data: updated, error } = await db
      .from(TABLE_NAMES.centers)
      .update(data)
      .eq('id', centerId)
      .eq('is_active', true)
      .select('id, name, address, phone, is_active, created_at, updated_at')
      .maybeSingle();

    if (error) throw error;
    return updated;
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
      .select('id, name, address, phone, is_active, created_at, updated_at')
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
