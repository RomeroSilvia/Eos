import { routinesRepository } from './routines.repository';
import { ApiError } from '../../utils/ApiError';
import type {
  RoutineInsert,
  RoutineRow,
  RoutineUpdate,
  RoutineStepInsert,
  RoutineStepUpdate
} from '../../database/schema.types';

type Role = 'user' | 'specialist' | 'center_admin';

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

  createRoutine: (data: RoutineInsert) => {
    return routinesRepository.create(data);
  },

  updateRoutine: async (routineId: string, userId: string, role: Role, data: RoutineUpdate) => {
    await assertRoutineEditable(routineId, userId, role);

    return routinesRepository.update(routineId, {
      ...data,
      updated_at: new Date().toISOString()
    });
  },

  deleteRoutine: async (routineId: string, userId: string, role: Role) => {
    await assertRoutineEditable(routineId, userId, role);
    return routinesRepository.remove(routineId);
  },

  getStepsByRoutine: async (routineId: string, userId: string, role: Role) => {
    await assertRoutineReadable(routineId, userId, role);
    return routinesRepository.findStepsByRoutineId(routineId);
  },

  createStep: async (routineId: string, userId: string, role: Role, data: Omit<RoutineStepInsert, 'routine_id'>) => {
    await assertRoutineEditable(routineId, userId, role);
    const stepOrder = data.step_order ?? await getNextStepOrder(routineId, data.category ?? null);

    return routinesRepository.createStep({
      ...data,
      routine_id: routineId,
      step_order: stepOrder
    });
  },

  updateStep: async (
    stepId: string,
    userId: string,
    role: Role,
    data: RoutineStepUpdate,
    expectedRoutineId?: string
  ) => {
    await assertStepEditable(stepId, userId, role, expectedRoutineId);

    return routinesRepository.updateStep(stepId, {
      ...data,
      updated_at: new Date().toISOString()
    });
  },

  deleteStep: async (stepId: string, userId: string, role: Role, expectedRoutineId?: string) => {
    await assertStepEditable(stepId, userId, role, expectedRoutineId);
    return routinesRepository.removeStep(stepId);
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
