import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';
import type { AuditLogFilters, AuditLogRow } from './audit.types';

const AUDIT_LOG_SELECT = 'id, actor_id, actor_role, action, entity, entity_id, before, after, metadata, created_at';

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
  }
};
