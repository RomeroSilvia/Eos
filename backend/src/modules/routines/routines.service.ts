import { routinesRepository } from './routines.repository';
import { ApiError } from '../../utils/ApiError';
import { recordAuditLog } from '../audit/audit.service';
import { auditRepository } from '../audit/audit.repository';
import type {
  RoutineInsert,
  RoutineRow,
  RoutineStepRow,
  RoutineUpdate,
  RoutineStepInsert,
  RoutineStepUpdate
} from '../../database/schema.types';

type Role = 'user' | 'specialist' | 'center_admin';

const ROUTINE_STEP_BATCH_WINDOW_MS = 10 * 60 * 1000;

export const routinesService = {
  getHealth: () => ({
    module: 'routines',
    status: 'ready'
  }),

  getUserRoutines: (userId: string) => {
    return routinesRepository.findAllByUserId(userId);
  },

  getRoutineById: async (routineId: string, userId: string, role: Role = 'user') => {
    const routine = await assertRoutineReadable(routineId, userId, role);
    return routinesRepository.findById(routineId, routine.user_id);
  },

  createRoutine: async (data: RoutineInsert, actorId: string, actorRole: Role) => {
    const created = await routinesRepository.create(data);

    if (created) {
      void recordAuditLog({
        actorId,
        actorRole,
        action: 'create',
        entity: 'routine',
        entityId: created.id,
        after: created,
        metadata: data.assigned_by ? { assignedBy: data.assigned_by } : undefined
      });
    }

    return created;
  },

  updateRoutine: async (routineId: string, userId: string, role: Role, data: RoutineUpdate) => {
    const before = await assertRoutineEditable(routineId, userId, role);

    const updated = await routinesRepository.update(routineId, {
      ...data,
      updated_at: new Date().toISOString()
    });

    if (updated) {
      void recordAuditLog({
        actorId: userId,
        actorRole: role,
        action: 'update',
        entity: 'routine',
        entityId: routineId,
        before,
        after: updated
      });
    }

    return updated;
  },

  deleteRoutine: async (routineId: string, userId: string, role: Role) => {
    const before = await assertRoutineEditable(routineId, userId, role);
    const removed = await routinesRepository.remove(routineId);

    if (removed) {
      void recordAuditLog({
        actorId: userId,
        actorRole: role,
        action: 'delete',
        entity: 'routine',
        entityId: routineId,
        before
      });
    }

    return removed;
  },

  getStepsByRoutine: async (routineId: string, userId: string, role: Role) => {
    await assertRoutineReadable(routineId, userId, role);
    return routinesRepository.findStepsByRoutineId(routineId);
  },

  createStep: async (routineId: string, userId: string, role: Role, data: Omit<RoutineStepInsert, 'routine_id'>) => {
    await assertRoutineEditable(routineId, userId, role);
    const stepOrder = data.step_order ?? await getNextStepOrder(routineId, data.category ?? null);

    const created = await routinesRepository.createStep({
      ...data,
      routine_id: routineId,
      step_order: stepOrder
    });

    if (created) {
      void recordRoutineStepAudit({
        actorId: userId,
        actorRole: role,
        action: 'create',
        routineId,
        after: created
      });
    }

    return created;
  },

  updateStep: async (
    stepId: string,
    userId: string,
    role: Role,
    data: RoutineStepUpdate,
    expectedRoutineId?: string
  ) => {
    const routine = await assertStepEditable(stepId, userId, role, expectedRoutineId);
    const before = await routinesRepository.findStepById(stepId);

    const updated = await routinesRepository.updateStep(stepId, {
      ...data,
      updated_at: new Date().toISOString()
    });

    if (updated) {
      void recordRoutineStepAudit({
        actorId: userId,
        actorRole: role,
        action: 'update',
        routineId: routine.id,
        before,
        after: updated
      });
    }

    return updated;
  },

  deleteStep: async (stepId: string, userId: string, role: Role, expectedRoutineId?: string) => {
    const routine = await assertStepEditable(stepId, userId, role, expectedRoutineId);
    const before = await routinesRepository.findStepById(stepId);
    const removed = await routinesRepository.removeStep(stepId);

    if (removed) {
      void recordRoutineStepAudit({
        actorId: userId,
        actorRole: role,
        action: 'delete',
        routineId: routine.id,
        before
      });
    }

    return removed;
  },

  getProductsByStep: async (stepId: string, userId: string, role: Role) => {
    await assertStepReadable(stepId, userId, role);
    return routinesRepository.findProductsByStepId(stepId);
  },

  setStepProducts: async (stepId: string, userId: string, role: Role, productIds: string[]) => {
    const routine = await assertStepEditable(stepId, userId, role);
    await assertProductsCanBeUsedInRoutine(productIds, routine, userId, role);
    return routinesRepository.setStepProducts(stepId, productIds);
  },

  attachProductToStep: async (stepId: string, userId: string, role: Role, productId: string) => {
    const routine = await assertStepEditable(stepId, userId, role);
    await assertProductsCanBeUsedInRoutine([productId], routine, userId, role);
    return routinesRepository.attachProductToStep(stepId, productId);
  },

  detachProductFromStep: async (stepId: string, userId: string, role: Role, productId: string) => {
    await assertStepEditable(stepId, userId, role);
    return routinesRepository.detachProductFromStep(stepId, productId);
  }
};

async function recordRoutineStepAudit(params: {
  actorId: string;
  actorRole: Role;
  action: 'create' | 'update' | 'delete';
  routineId: string;
  before?: RoutineStepRow | null;
  after?: RoutineStepRow | null;
}): Promise<void> {
  try {
    const step = params.after ?? params.before ?? null;
    const stepEntry = {
      stepId: step?.id ?? null,
      stepName: step?.name ?? null,
      category: step?.category ?? null,
      before: params.before ?? undefined,
      after: params.after ?? undefined
    };

    const sinceIso = new Date(Date.now() - ROUTINE_STEP_BATCH_WINDOW_MS).toISOString();
    const existingBatch = await auditRepository.findRecentRoutineStepBatch({
      routineId: params.routineId,
      actorId: params.actorId,
      action: params.action,
      sinceIso
    });

    if (existingBatch) {
      const existingMetadata = (existingBatch.metadata ?? {}) as { steps?: unknown[] };
      const existingSteps = Array.isArray(existingMetadata.steps) ? existingMetadata.steps : [];

      await auditRepository.updateRoutineStepBatch(
        existingBatch.id,
        { changeType: 'routine_step_batch', steps: [...existingSteps, stepEntry] },
        new Date().toISOString()
      );

      return;
    }

    void recordAuditLog({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      entity: 'routine',
      entityId: params.routineId,
      metadata: { changeType: 'routine_step_batch', steps: [stepEntry] }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[audit] Error inesperado al consolidar auditoría de pasos de rutina', error);
    }
  }
}

async function getNextStepOrder(routineId: string, category: string | null) {
  const steps = await routinesRepository.findStepsByRoutineId(routineId);
  const matchingSteps = steps.filter((step) => (step.category ?? null) === category);

  return Math.max(0, ...matchingSteps.map((step) => step.step_order ?? 0)) + 1;
}

async function assertRoutineReadable(routineId: string, userId: string, role: Role): Promise<RoutineRow> {
  const routine = await routinesRepository.findRawById(routineId);

  if (!routine) {
    throw new ApiError(404, 'Rutina no encontrada.');
  }

  return ensureRoutineReadable(routine, userId, role);
}

function ensureRoutineReadable(routine: RoutineRow, userId: string, role: Role): RoutineRow {
  if (routine.user_id === userId || (role === 'specialist' && routine.assigned_by === userId)) {
    return routine;
  }

  throw new ApiError(404, 'Rutina no encontrada.');
}

async function assertRoutineEditable(routineId: string, userId: string, role: Role): Promise<RoutineRow> {
  const routine = await routinesRepository.findRawById(routineId);

  if (!routine) {
    throw new ApiError(404, 'Rutina no encontrada.');
  }

  return ensureRoutineEditable(routine, userId, role);
}

function ensureRoutineEditable(routine: RoutineRow, userId: string, role: Role): RoutineRow {
  if (routine.assigned_by) {
    if (role === 'specialist' && routine.assigned_by === userId) {
      return routine;
    }

    throw new ApiError(403, 'No podés modificar una rutina asignada por un especialista.');
  }

  if (routine.user_id === userId) {
    return routine;
  }

  throw new ApiError(404, 'Rutina no encontrada.');
}

async function assertStepReadable(stepId: string, userId: string, role: Role): Promise<RoutineRow> {
  const routine = await routinesRepository.findRoutineByStepId(stepId);

  if (!routine) {
    throw new ApiError(404, 'Paso de rutina no encontrado.');
  }

  return ensureRoutineReadable(routine, userId, role);
}

async function assertStepEditable(
  stepId: string,
  userId: string,
  role: Role,
  expectedRoutineId?: string
): Promise<RoutineRow> {
  const routine = await routinesRepository.findRoutineByStepId(stepId);

  if (!routine) {
    throw new ApiError(404, 'Paso de rutina no encontrado.');
  }

  if (expectedRoutineId && routine.id !== expectedRoutineId) {
    throw new ApiError(404, 'Paso de rutina no encontrado.');
  }

  return ensureRoutineEditable(routine, userId, role);
}

async function assertProductsCanBeUsedInRoutine(
  productIds: string[],
  routine: RoutineRow,
  userId: string,
  role: Role
): Promise<void> {
  const uniqueProductIds = [...new Set(productIds)];

  if (uniqueProductIds.length === 0) {
    return;
  }

  const products = await routinesRepository.findProductsByIds(uniqueProductIds);
  const allowedOwnerIds = new Set([routine.user_id]);

  if (role === 'specialist' && routine.assigned_by === userId) {
    allowedOwnerIds.add(userId);
  }

  const everyProductIsAllowed =
    products.length === uniqueProductIds.length &&
    products.every((product) => allowedOwnerIds.has(product.user_id));

  if (!everyProductIsAllowed) {
    throw new ApiError(403, 'No podés asociar productos ajenos a esta rutina.');
  }
}
