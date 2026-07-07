import { ApiError } from '../../utils/ApiError';
import { recordAuditLog } from '../audit/audit.service';
import { subscriptionsRepository } from './subscriptions.repository';
import type {
  AssignSubscriptionInput,
  CreateSubscriptionPlanInput,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  UpdateSubscriptionPlanInput,
  UpdateSubscriptionStatusInput
} from './subscriptions.types';

const ALLOWED_STATUSES: SubscriptionStatus[] = ['active', 'pending', 'canceled', 'expired', 'past_due'];

export const subscriptionsService = {
  /**
   * E3 contract: subscriptions.status is informative and must not gate other modules.
   */
  async listPlans(): Promise<SubscriptionPlan[]> {
    const plans = await subscriptionsRepository.listPlans();
    return plans.map(mapPlanRow);
  },

  async createPlan(input: CreateSubscriptionPlanInput, actor: { id: string; role: string }): Promise<SubscriptionPlan> {
    const payload = {
      name: normalizeNonEmptyText(input.name, 'El nombre del plan es obligatorio.'),
      level: normalizeNonEmptyText(input.level, 'El nivel del plan es obligatorio.'),
      price: normalizeNonNegativeNumber(input.price, 'El precio del plan es obligatorio.'),
      features: input.features ?? {},
      is_active: true
    };

    const created = await subscriptionsRepository.createPlan(payload);

    void recordAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'create',
      entity: 'subscription',
      entityId: created.id,
      after: created,
      metadata: { target: 'subscription_plans' }
    });

    return mapPlanRow(created);
  },

  async updatePlan(
    planId: string,
    input: UpdateSubscriptionPlanInput,
    actor: { id: string; role: string }
  ): Promise<SubscriptionPlan> {
    if (!planId?.trim()) {
      throw new ApiError(400, 'El id del plan es obligatorio.');
    }

    const previous = await subscriptionsRepository.findPlanById(planId);
    if (!previous) {
      throw new ApiError(404, 'Plan no encontrado.');
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (typeof input.name !== 'undefined') {
      payload.name = normalizeNonEmptyText(input.name, 'El nombre del plan es obligatorio.');
    }
    if (typeof input.level !== 'undefined') {
      payload.level = normalizeNonEmptyText(input.level, 'El nivel del plan es obligatorio.');
    }
    if (typeof input.price !== 'undefined') {
      payload.price = normalizeNonNegativeNumber(input.price, 'El precio debe ser un numero mayor o igual a 0.');
    }
    if (typeof input.features !== 'undefined') {
      payload.features = input.features;
    }
    if (typeof input.isActive === 'boolean') {
      payload.is_active = input.isActive;
    }

    const updated = await subscriptionsRepository.updatePlan(planId, payload);

    if (!updated) {
      throw new ApiError(404, 'Plan no encontrado.');
    }

    void recordAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'update',
      entity: 'subscription',
      entityId: updated.id,
      before: previous,
      after: updated,
      metadata: { target: 'subscription_plans' }
    });

    return mapPlanRow(updated);
  },

  async listSubscriptions(): Promise<Subscription[]> {
    const rows = await subscriptionsRepository.listSubscriptions();
    return rows.map(mapSubscriptionRow);
  },

  async getMySubscription(userId: string): Promise<Subscription | null> {
    const normalizedUserId = normalizeNonEmptyText(userId, 'userId es obligatorio.');
    const row = await subscriptionsRepository.findCurrentSubscriptionByUserId(normalizedUserId);

    if (!row) {
      return null;
    }

    return mapSubscriptionRow(row);
  },

  async cancelMySubscription(userId: string, actor: { id: string; role: string }): Promise<Subscription> {
    const normalizedUserId = normalizeNonEmptyText(userId, 'userId es obligatorio.');
    const previous = await subscriptionsRepository.findCurrentSubscriptionByUserId(normalizedUserId);

    if (!previous) {
      throw new ApiError(404, 'No tenes una suscripcion activa para cancelar.');
    }

    const updated = await subscriptionsRepository.updateSubscriptionStatus(previous.id, {
      status: 'canceled',
      ends_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (!updated) {
      throw new ApiError(404, 'Suscripcion no encontrada.');
    }

    void recordAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'update',
      entity: 'subscription',
      entityId: updated.id,
      before: previous,
      after: updated,
      metadata: { target: 'subscriptions', updateType: 'self_cancel' }
    });

    return mapSubscriptionRow(updated);
  },

  async searchAssignableUsersByEmail(email: string): Promise<Array<{ id: string; fullName: string | null; email: string }>> {
    const normalizedEmail = normalizeOptionalEmailSearch(email);
    if (!normalizedEmail) {
      return [];
    }

    const rows = await subscriptionsRepository.searchUsersByEmail(normalizedEmail);
    return rows.map((row) => ({
      id: row.id,
      fullName: row.full_name ?? null,
      email: row.email
    }));
  },

  async assignSubscription(
    input: AssignSubscriptionInput,
    actor: { id: string; role: string }
  ): Promise<Subscription> {
    const ownerType = normalizeOwnerType(input.ownerType);
    const ownerId = normalizeNonEmptyText(input.ownerId, 'ownerId es obligatorio.');
    const planId = normalizeNonEmptyText(input.planId, 'planId es obligatorio.');
    const status = normalizeStatus(input.status ?? 'active');

    const plan = await subscriptionsRepository.findPlanById(planId);
    if (!plan) {
      throw new ApiError(404, 'Plan no encontrado.');
    }

    if (plan.is_active === false) {
      throw new ApiError(409, 'No se puede asignar un plan inactivo.');
    }

    const startedAt = input.startedAt ?? new Date().toISOString();
    const endsAt = resolveSubscriptionEndsAt(input.endsAt, startedAt, plan.features);

    await subscriptionsRepository.deactivateActiveSubscriptions(ownerType, ownerId);

    const created = await subscriptionsRepository.createSubscription({
      owner_type: ownerType,
      owner_id: ownerId,
      plan_id: planId,
      status,
      started_at: startedAt,
      ends_at: endsAt
    });

    void recordAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'update',
      entity: 'subscription',
      entityId: created.id,
      after: created,
      metadata: {
        target: 'subscriptions',
        ownerType,
        ownerId,
        planId,
        informativeOnly: true
      }
    });

    return mapSubscriptionRow(created);
  },

  async updateSubscriptionStatus(
    subscriptionId: string,
    input: UpdateSubscriptionStatusInput,
    actor: { id: string; role: string }
  ): Promise<Subscription> {
    if (!subscriptionId?.trim()) {
      throw new ApiError(400, 'El id de la suscripcion es obligatorio.');
    }

    const previous = await subscriptionsRepository.findSubscriptionById(subscriptionId);
    if (!previous) {
      throw new ApiError(404, 'Suscripcion no encontrada.');
    }

    const payload: Record<string, unknown> = {
      status: normalizeStatus(input.status),
      updated_at: new Date().toISOString()
    };

    if (typeof input.endsAt !== 'undefined') {
      payload.ends_at = input.endsAt;
    }

    const updated = await subscriptionsRepository.updateSubscriptionStatus(subscriptionId, payload);
    if (!updated) {
      throw new ApiError(404, 'Suscripcion no encontrada.');
    }

    void recordAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'update',
      entity: 'subscription',
      entityId: updated.id,
      before: previous,
      after: updated,
      metadata: { target: 'subscriptions', updateType: 'status' }
    });

    return mapSubscriptionRow(updated);
  }
};

function mapPlanRow(row: any): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price ?? 0),
    level: row.level,
    features: (row.features ?? {}) as Record<string, unknown>,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSubscriptionRow(row: any): Subscription {
  return {
    id: row.id,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    planId: row.plan_id,
    status: row.status,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    plan: row.subscription_plans ? mapPlanRow(row.subscription_plans) : null
  };
}

function normalizeOwnerType(value: unknown): 'user' | 'center' {
  if (value === 'user' || value === 'center') {
    return value;
  }

  throw new ApiError(400, 'ownerType debe ser user o center.');
}

function normalizeStatus(value: unknown): SubscriptionStatus {
  if (typeof value !== 'string' || !ALLOWED_STATUSES.includes(value as SubscriptionStatus)) {
    throw new ApiError(400, 'Estado de suscripcion invalido.');
  }

  return value as SubscriptionStatus;
}

function normalizeNonEmptyText(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, message);
  }

  return value.trim();
}

function normalizeNonNegativeNumber(value: unknown, message: string): number {
  const asNumber = Number(value);

  if (!Number.isFinite(asNumber) || asNumber < 0) {
    throw new ApiError(400, message);
  }

  return asNumber;
}

function resolveSubscriptionEndsAt(inputEndsAt: string | null | undefined, startedAt: string, features: unknown): string | null {
  if (typeof inputEndsAt !== 'undefined') {
    return inputEndsAt;
  }

  const durationDays = extractDurationDays(features);
  if (!durationDays) {
    return null;
  }

  const startedAtDate = new Date(startedAt);
  startedAtDate.setDate(startedAtDate.getDate() + durationDays);
  return startedAtDate.toISOString();
}

function extractDurationDays(features: unknown): number | null {
  if (!features || typeof features !== 'object') {
    return null;
  }

  const maybeRecord = features as Record<string, unknown>;
  const asNumber = Number(maybeRecord.durationDays);

  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    return null;
  }

  return Math.floor(asNumber);
}

function normalizeOptionalEmailSearch(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim().toLowerCase();
  if (trimmedValue.length < 3) {
    return null;
  }

  return trimmedValue;
}
