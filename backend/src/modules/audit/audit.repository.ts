import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';
import type { AuditLogFilters, AuditLogRow } from './audit.types';

const AUDIT_LOG_SELECT = 'id, actor_id, actor_role, action, entity, entity_id, before, after, metadata, created_at';

export type SpecialistProfileRow = {
  id: string;
  user_id: string;
  specialty: string;
};

export type SubscriptionRow = {
  id: string;
  plan_id: string | null;
};

export const auditRepository = {
  findAuditLogs: async (filters: AuditLogFilters): Promise<{ data: AuditLogRow[]; total: number }> => {
    const db = supabase as any;
    const offset = (filters.page - 1) * filters.limit;

    let query = db
      .from(TABLE_NAMES.auditLogs)
      .select(AUDIT_LOG_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + filters.limit - 1);

    if (filters.entity) {
      query = query.eq('entity', filters.entity);
    }

    if (filters.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }

    if (filters.entityIdIn) {
      query = query.in('entity_id', filters.entityIdIn);
    }

    if (filters.actorId) {
      query = query.eq('actor_id', filters.actorId);
    }

    if (filters.from) {
      query = query.gte('created_at', `${filters.from}T00:00:00.000Z`);
    }

    if (filters.to) {
      query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return { data: data ?? [], total: count ?? 0 };
  },

  findProfileNamesByIds: async (ids: string[]): Promise<Map<string, string>> => {
    if (ids.length === 0) return new Map();

    const db = supabase as any;
    const { data, error } = await db.from(TABLE_NAMES.profiles).select('id, full_name').in('id', ids);

    if (error) throw error;

    return new Map((data ?? []).map((row: { id: string; full_name: string }) => [row.id, row.full_name]));
  },

  findProfileIdsByRole: async (role: string): Promise<string[]> => {
    const db = supabase as any;
    const { data, error } = await db.from(TABLE_NAMES.profiles).select('id').eq('role', role);

    if (error) throw error;

    return (data ?? []).map((row: { id: string }) => row.id);
  },

  findRoutineNamesByIds: async (ids: string[]): Promise<Map<string, string>> => {
    if (ids.length === 0) return new Map();

    const db = supabase as any;
    const { data, error } = await db.from(TABLE_NAMES.routines).select('id, name').in('id', ids);

    if (error) throw error;

    return new Map((data ?? []).map((row: { id: string; name: string }) => [row.id, row.name]));
  },

  findProductNamesByIds: async (ids: string[]): Promise<Map<string, string>> => {
    if (ids.length === 0) return new Map();

    const db = supabase as any;
    const { data, error } = await db.from(TABLE_NAMES.products).select('id, name').in('id', ids);

    if (error) throw error;

    return new Map((data ?? []).map((row: { id: string; name: string }) => [row.id, row.name]));
  },

  findCenterNamesByIds: async (ids: string[]): Promise<Map<string, string>> => {
    if (ids.length === 0) return new Map();

    const db = supabase as any;
    const { data, error } = await db.from(TABLE_NAMES.centers).select('id, name').in('id', ids);

    if (error) throw error;

    return new Map((data ?? []).map((row: { id: string; name: string }) => [row.id, row.name]));
  },

  findSpecialistProfileRows: async (ids: string[]): Promise<SpecialistProfileRow[]> => {
    if (ids.length === 0) return [];

    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .select('id, user_id, specialty')
      .in('id', ids);

    if (error) throw error;

    return data ?? [];
  },

  findSpecialtyByUserIds: async (userIds: string[]): Promise<Map<string, string>> => {
    if (userIds.length === 0) return new Map();

    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .select('user_id, specialty')
      .in('user_id', userIds);

    if (error) throw error;

    return new Map((data ?? []).map((row: { user_id: string; specialty: string }) => [row.user_id, row.specialty]));
  },

  findSubscriptionRows: async (ids: string[]): Promise<SubscriptionRow[]> => {
    if (ids.length === 0) return [];

    const db = supabase as any;
    const { data, error } = await db.from(TABLE_NAMES.subscriptions).select('id, plan_id').in('id', ids);

    if (error) throw error;

    return data ?? [];
  },

  findSubscriptionPlanNamesByIds: async (ids: string[]): Promise<Map<string, string>> => {
    if (ids.length === 0) return new Map();

    const db = supabase as any;
    const { data, error } = await db.from(TABLE_NAMES.subscriptionPlans).select('id, name').in('id', ids);

    if (error) throw error;

    return new Map((data ?? []).map((row: { id: string; name: string }) => [row.id, row.name]));
  }
};
