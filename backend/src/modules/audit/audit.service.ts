import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/ApiError';
import { auditRepository } from './audit.repository';
import type { AuditLogFilters, AuditLogPage, RecordAuditLogParams } from './audit.types';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * M4 contract: best-effort audit logging.
 * Never throw to avoid blocking primary business flows.
 */
export async function recordAuditLog(params: RecordAuditLogParams): Promise<void> {
  try {
    const db = supabase as any;
    const payload = {
      actor_id: params.actorId,
      actor_role: params.actorRole,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId,
      before: params.before ?? null,
      after: params.after ?? null,
      metadata: params.metadata ?? null
    };

    const { error } = await db.from('audit_logs').insert(payload);

    if (error) {
      // Best-effort by contract. Keep a debug trace in non-production only.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[audit] No se pudo registrar evento', {
          message: error.message,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId
        });
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[audit] Error inesperado al registrar evento', error);
    }
  }
}

export function isIsoDate(date: string): boolean {
  if (!ISO_DATE_PATTERN.test(date)) {
    return false;
  }

  return !Number.isNaN(new Date(`${date}T00:00:00.000Z`).getTime());
}

export async function getAuditLogs(rawFilters: {
  entity?: string;
  entityId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
}): Promise<AuditLogPage> {
  const filters = normalizeFilters(rawFilters);
  const { data, total } = await auditRepository.findAuditLogs(filters);

  return {
    items: data,
    total,
    page: filters.page,
    limit: filters.limit
  };
}

function normalizeFilters(rawFilters: {
  entity?: string;
  entityId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
}): AuditLogFilters {
  if (rawFilters.from && !isIsoDate(rawFilters.from)) {
    throw new ApiError(400, 'El parámetro "from" debe usar el formato YYYY-MM-DD.');
  }

  if (rawFilters.to && !isIsoDate(rawFilters.to)) {
    throw new ApiError(400, 'El parámetro "to" debe usar el formato YYYY-MM-DD.');
  }

  if (rawFilters.from && rawFilters.to && rawFilters.from > rawFilters.to) {
    throw new ApiError(400, 'El parámetro "from" no puede ser posterior a "to".');
  }

  const page = normalizePositiveInt(rawFilters.page, 1, 1);
  const limit = normalizePositiveInt(rawFilters.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  return {
    entity: rawFilters.entity as AuditLogFilters['entity'],
    entityId: rawFilters.entityId,
    actorId: rawFilters.actorId,
    from: rawFilters.from,
    to: rawFilters.to,
    page,
    limit
  };
}

function normalizePositiveInt(value: string | undefined, fallback: number, max: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(400, 'Los parámetros de paginación deben ser números enteros positivos.');
  }

  return Math.min(parsed, max);
}
