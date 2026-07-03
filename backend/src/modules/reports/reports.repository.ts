import { supabase } from '../../config/supabase';
import type { AdminReportFilters, CenterMetricSummary } from './reports.types';

type SpecialistRow = {
  user_id: string;
  center_id?: string | null;
};

const M3_DEPENDENCY_WARNING = 'No se pudo aplicar el filtro por centro porque aun no esta disponible el esquema de centros (M3).';

export const reportsRepository = {
  async getSummary(filters: AdminReportFilters): Promise<{ summary: Omit<CenterMetricSummary, 'centerId' | 'centerName'>; scopeWarning: string | null }> {
    const specialistsResult = await listSpecialists(filters.centerId);
    const specialistIds = specialistsResult.specialistIds;

    const relationRows = await listActiveRelationsBySpecialists(specialistIds);
    const relationIds = relationRows.map((relation) => relation.id as string);
    const clientIds = [...new Set(relationRows.map((relation) => relation.client_id as string))];

    const clients = filters.centerId ? clientIds.length : await countProfilesByRole('user');

    const consultations = await countChatMessages(relationIds, filters);
    const assignedRoutines = await countAssignedRoutines(specialistIds, filters);
    const averageCompliance = await calculateAverageCompliance(filters, clientIds);

    return {
      summary: {
        clients,
        specialists: specialistIds.length,
        consultations,
        assignedRoutines,
        averageCompliance
      },
      scopeWarning: specialistsResult.scopeWarning
    };
  },

  async getCenterBreakdown(filters: AdminReportFilters): Promise<CenterMetricSummary[]> {
    const db = supabase as any;
    const { data: centers, error: centerError } = await db
      .from('centers')
      .select('id, name')
      .order('name', { ascending: true });

    if (centerError) {
      if (isMissingTableOrColumnError(centerError)) {
        return [];
      }

      throw centerError;
    }

    const centerRows = (centers ?? []) as Array<{ id: string; name: string }>;
    const summaries: CenterMetricSummary[] = [];

    for (const center of centerRows) {
      const { summary } = await this.getSummary({ ...filters, centerId: center.id });
      summaries.push({
        centerId: center.id,
        centerName: center.name,
        clients: summary.clients,
        specialists: summary.specialists,
        consultations: summary.consultations,
        assignedRoutines: summary.assignedRoutines,
        averageCompliance: summary.averageCompliance
      });
    }

    return summaries;
  }
};

async function listSpecialists(centerId?: string): Promise<{ specialistIds: string[]; scopeWarning: string | null }> {
  const db = supabase as any;
  let query = db
    .from('specialist_profiles')
    .select('user_id, center_id')
    .eq('license_status', 'verified');

  if (centerId) {
    query = query.eq('center_id', centerId);
  }

  const { data, error } = await query;

  if (error) {
    if (centerId && isMissingTableOrColumnError(error)) {
      const fallback = await db
        .from('specialist_profiles')
        .select('user_id')
        .eq('license_status', 'verified');

      if (fallback.error) throw fallback.error;

      const specialistIds = [
        ...new Set(
          ((fallback.data ?? []) as SpecialistRow[])
            .map((row) => row.user_id)
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
        )
      ];

      return {
        specialistIds,
        scopeWarning: M3_DEPENDENCY_WARNING
      };
    }

    throw error;
  }

  return {
    specialistIds: [...new Set(((data ?? []) as SpecialistRow[]).map((row) => row.user_id))],
    scopeWarning: null
  };
}

async function listActiveRelationsBySpecialists(specialistIds: string[]): Promise<any[]> {
  if (specialistIds.length === 0) {
    return [];
  }

  const db = supabase as any;
  const { data, error } = await db
    .from('client_specialist_relations')
    .select('id, client_id, specialist_id')
    .eq('status', 'active')
    .in('specialist_id', specialistIds);

  if (error) throw error;
  return data ?? [];
}

async function countChatMessages(relationIds: string[], filters: AdminReportFilters): Promise<number> {
  if (relationIds.length === 0) {
    return 0;
  }

  const db = supabase as any;
  let query = db
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .in('relation_id', relationIds);

  if (filters.from) {
    query = query.gte('created_at', filters.from);
  }
  if (filters.to) {
    query = query.lte('created_at', filters.to);
  }

  const { count, error } = await query;
  if (error) throw error;

  return count ?? 0;
}

async function countAssignedRoutines(specialistIds: string[], filters: AdminReportFilters): Promise<number> {
  if (specialistIds.length === 0) {
    return 0;
  }

  const db = supabase as any;
  let query = db
    .from('routines')
    .select('id', { count: 'exact', head: true })
    .in('assigned_by', specialistIds);

  if (filters.from) {
    query = query.gte('created_at', filters.from);
  }
  if (filters.to) {
    query = query.lte('created_at', filters.to);
  }

  const { count, error } = await query;
  if (error) throw error;

  return count ?? 0;
}

async function calculateAverageCompliance(filters: AdminReportFilters, clientIds: string[]): Promise<number> {
  const db = supabase as any;

  let query = db
    .from('routine_logs')
    .select('completion_percentage');

  if (filters.centerId) {
    if (clientIds.length === 0) {
      return 0;
    }

    query = query.in('user_id', clientIds);
  }

  if (filters.from) {
    query = query.gte('log_date', filters.from.slice(0, 10));
  }
  if (filters.to) {
    query = query.lte('log_date', filters.to.slice(0, 10));
  }

  const { data, error } = await query;

  if (error) throw error;

  const values = (data ?? [])
    .map((row: { completion_percentage?: number | string | null }) => Number(row.completion_percentage ?? 0))
    .filter((value: number) => Number.isFinite(value));

  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((acc: number, value: number) => acc + value, 0);
  return Number((total / values.length).toFixed(2));
}

async function countProfilesByRole(role: string): Promise<number> {
  const db = supabase as any;
  const { count, error } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', role);

  if (error) throw error;
  return count ?? 0;
}

function isMissingTableOrColumnError(error: { code?: string; message?: string }): boolean {
  const message = String(error.message ?? '').toLowerCase();

  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    message.includes('does not exist') ||
    message.includes('not find')
  );
}
