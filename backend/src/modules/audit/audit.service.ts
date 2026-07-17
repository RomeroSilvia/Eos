import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/ApiError';
import { auditRepository } from './audit.repository';
import type { AuditLogEntry, AuditLogFilters, AuditLogPage, AuditLogRow, RecordAuditLogParams } from './audit.types';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ENTITY_NOT_FOUND_LABEL = 'Registro eliminado o no disponible';

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

  if (filters.entity === 'user_profile') {
    const userProfileIds = await auditRepository.findProfileIdsByRole('user');

    if (userProfileIds.length === 0) {
      return { items: [], total: 0, page: filters.page, limit: filters.limit };
    }

    filters.entityIdIn = userProfileIds;
  }

  const { data, total } = await auditRepository.findAuditLogs(filters);

  return {
    items: await enrichAuditLogEntries(data),
    total,
    page: filters.page,
    limit: filters.limit
  };
}

async function enrichAuditLogEntries(rows: AuditLogRow[]): Promise<AuditLogEntry[]> {
  const specialistActorIds = [
    ...new Set(rows.filter((row) => row.actor_role === 'specialist' && row.actor_id).map((row) => row.actor_id as string))
  ];
  const namedActorIds = [
    ...new Set(rows.filter((row) => row.actor_role !== 'center_admin' && row.actor_id).map((row) => row.actor_id as string))
  ];
  const routineStepIds = [
    ...new Set(
      rows
        .map((row) => getRoutineStepMetadata(row.metadata)?.stepId)
        .filter((stepId): stepId is string => Boolean(stepId))
    )
  ];

  const [actorNames, actorSpecialties, stepsWithProducts, subscriptionOwnerNames] = await Promise.all([
    auditRepository.findProfileNamesByIds(namedActorIds),
    auditRepository.findSpecialtyByUserIds(specialistActorIds),
    auditRepository.findStepsWithProducts(routineStepIds),
    resolveSubscriptionOwnerNames(rows)
  ]);

  const entityLabelsByEntity = await resolveEntityLabelsByType(groupEntityIdsByType(rows));

  return rows.map((row) => {
    const { actorName, actorProfile } = resolveActor(row, actorNames, actorSpecialties);
    const entityLabel =
      entityLabelsByEntity.get(row.entity)?.get(row.entity_id) ??
      deriveFallbackEntityLabel(row.entity, row.before, row.after) ??
      ENTITY_NOT_FOUND_LABEL;

    const isSubscription = row.entity === 'subscription';

    return {
      id: row.id,
      actorId: row.actor_id,
      actorRole: row.actor_role,
      actorName,
      actorProfile,
      action: row.action,
      entity: row.entity,
      entityId: row.entity_id,
      entityLabel,
      routineStepDetail: buildRoutineStepDetail(row.metadata, stepsWithProducts),
      before: isSubscription ? sanitizeSubscriptionPayload(row.before, subscriptionOwnerNames) : row.before,
      after: isSubscription ? sanitizeSubscriptionPayload(row.after, subscriptionOwnerNames) : row.after,
      metadata: row.metadata,
      createdAt: row.created_at
    };
  });
}

async function resolveSubscriptionOwnerNames(rows: AuditLogRow[]): Promise<Map<string, string>> {
  const userOwnerIds = new Set<string>();
  const centerOwnerIds = new Set<string>();

  for (const row of rows) {
    if (row.entity !== 'subscription') continue;

    for (const payload of [row.before, row.after]) {
      if (!isPlainObject(payload)) continue;

      const ownerId = payload.owner_id ?? payload.ownerId;
      const ownerType = payload.owner_type ?? payload.ownerType;

      if (typeof ownerId !== 'string') continue;

      if (ownerType === 'center') {
        centerOwnerIds.add(ownerId);
      } else {
        userOwnerIds.add(ownerId);
      }
    }
  }

  const [userNames, centerNames] = await Promise.all([
    auditRepository.findProfileNamesByIds([...userOwnerIds]),
    auditRepository.findCenterNamesByIds([...centerOwnerIds])
  ]);

  return new Map([...userNames, ...centerNames]);
}

function sanitizeSubscriptionPayload(payload: unknown, ownerNames: Map<string, string>): unknown {
  if (!isPlainObject(payload)) return payload;

  const { owner_id, ownerId, ...rest } = payload;
  const rawOwnerId = owner_id ?? ownerId;

  if (typeof rawOwnerId !== 'string') {
    return rest;
  }

  return { ...rest, owner: ownerNames.get(rawOwnerId) ?? 'No disponible' };
}

type RoutineStepMetadata = { changeType: 'routine_step'; stepId: string | null; stepName: string | null; category: string | null };

function getRoutineStepMetadata(metadata: unknown): RoutineStepMetadata | null {
  if (!isPlainObject(metadata) || metadata.changeType !== 'routine_step') {
    return null;
  }

  return metadata as unknown as RoutineStepMetadata;
}

function buildRoutineStepDetail(
  metadata: unknown,
  stepsWithProducts: Set<string>
): AuditLogEntry['routineStepDetail'] {
  const stepMetadata = getRoutineStepMetadata(metadata);

  if (!stepMetadata) {
    return null;
  }

  return {
    category: stepMetadata.category,
    stepName: stepMetadata.stepName,
    hasProducts: Boolean(stepMetadata.stepId) && stepsWithProducts.has(stepMetadata.stepId as string)
  };
}

function deriveFallbackEntityLabel(entity: string, before: unknown, after: unknown): string | undefined {
  const beforeObj = isPlainObject(before) ? before : null;
  const afterObj = isPlainObject(after) ? after : null;

  switch (entity) {
    case 'routine':
    case 'product':
    case 'center': {
      const name = readStringField(beforeObj, 'name') ?? readStringField(afterObj, 'name');
      return name ?? undefined;
    }
    case 'user_profile': {
      const name = readStringField(beforeObj, 'full_name') ?? readStringField(afterObj, 'full_name');
      return name ?? undefined;
    }
    case 'specialist_profile': {
      const specialty = readStringField(beforeObj, 'specialty') ?? readStringField(afterObj, 'specialty');
      return specialty ? `Especialista (${specialty})` : undefined;
    }
    case 'subscription': {
      const plan = beforeObj?.subscription_plans ?? afterObj?.subscription_plans;
      const planName = isPlainObject(plan) ? readStringField(plan, 'name') : undefined;
      return planName ? `Suscripción ${planName}` : undefined;
    }
    default:
      return undefined;
  }
}

function readStringField(value: Record<string, unknown> | null, key: string): string | undefined {
  const fieldValue = value?.[key];
  return typeof fieldValue === 'string' && fieldValue.length > 0 ? fieldValue : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveActor(
  row: AuditLogRow,
  actorNames: Map<string, string>,
  actorSpecialties: Map<string, string>
): { actorName: string; actorProfile: string | null } {
  if (row.actor_role === 'center_admin') {
    return { actorName: 'Administrador de Centro', actorProfile: 'Administrador de Centro' };
  }

  if (!row.actor_id) {
    return { actorName: 'Sistema', actorProfile: null };
  }

  const actorName = actorNames.get(row.actor_id) ?? 'Usuario no encontrado';

  if (row.actor_role === 'specialist') {
    const specialty = actorSpecialties.get(row.actor_id);
    return {
      actorName,
      actorProfile: specialty ? `Especialista - ${specialty}` : 'Especialista'
    };
  }

  return { actorName, actorProfile: 'Usuario' };
}

function groupEntityIdsByType(rows: AuditLogRow[]): Map<string, string[]> {
  const grouped = new Map<string, Set<string>>();

  for (const row of rows) {
    if (!grouped.has(row.entity)) {
      grouped.set(row.entity, new Set());
    }

    grouped.get(row.entity)!.add(row.entity_id);
  }

  return new Map([...grouped.entries()].map(([entity, ids]) => [entity, [...ids]]));
}

async function resolveEntityLabelsByType(entityIdsByType: Map<string, string[]>): Promise<Map<string, Map<string, string>>> {
  const result = new Map<string, Map<string, string>>();

  for (const [entity, ids] of entityIdsByType) {
    result.set(entity, await resolveEntityLabels(entity, ids));
  }

  return result;
}

async function resolveEntityLabels(entity: string, ids: string[]): Promise<Map<string, string>> {
  switch (entity) {
    case 'routine':
      return auditRepository.findRoutineNamesByIds(ids);
    case 'product':
      return auditRepository.findProductNamesByIds(ids);
    case 'center':
      return auditRepository.findCenterNamesByIds(ids);
    case 'user_profile':
      return auditRepository.findProfileNamesByIds(ids);
    case 'specialist_profile':
      return resolveSpecialistProfileLabels(ids);
    case 'subscription':
      return resolveSubscriptionLabels(ids);
    default:
      return new Map();
  }
}

async function resolveSpecialistProfileLabels(ids: string[]): Promise<Map<string, string>> {
  const specialistRows = await auditRepository.findSpecialistProfileRows(ids);
  const userIds = [...new Set(specialistRows.map((row) => row.user_id))];
  const profileNames = await auditRepository.findProfileNamesByIds(userIds);

  const labels = new Map<string, string>();

  for (const row of specialistRows) {
    const name = profileNames.get(row.user_id) ?? 'Especialista';
    labels.set(row.id, `${name} (${row.specialty})`);
  }

  return labels;
}

async function resolveSubscriptionLabels(ids: string[]): Promise<Map<string, string>> {
  const subscriptionRows = await auditRepository.findSubscriptionRows(ids);
  const planIds = [...new Set(subscriptionRows.map((row) => row.plan_id).filter((planId): planId is string => Boolean(planId)))];
  const planNames = await auditRepository.findSubscriptionPlanNamesByIds(planIds);

  const labels = new Map<string, string>();

  for (const row of subscriptionRows) {
    const planName = row.plan_id ? planNames.get(row.plan_id) : undefined;
    labels.set(row.id, planName ? `Suscripción ${planName}` : 'Suscripción');
  }

  return labels;
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

  const page = normalizePositiveInt(rawFilters.page, 1, Number.MAX_SAFE_INTEGER);
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
