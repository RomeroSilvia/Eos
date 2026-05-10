import { routinesRepository } from './routines.repository';
import type {
  RoutineInsert,
  RoutineUpdate,
  RoutineStepInsert,
  RoutineStepUpdate
} from '../../database/schema.types';

export const routinesService = {
  getHealth: () => ({
    module: 'routines',
    status: 'ready'
  }),

  getUserRoutines: (userId: string) => {
    return routinesRepository.findAllByUserId(userId);
  },

  getRoutineById: (routineId: string, userId: string) => {
    return routinesRepository.findById(routineId, userId);
  },

  createRoutine: (data: RoutineInsert) => {
    return routinesRepository.create(data);
  },

  updateRoutine: (routineId: string, userId: string, data: RoutineUpdate) => {
    return routinesRepository.update(routineId, userId, {
      ...data,
      updated_at: new Date().toISOString()
    });
  },

  deleteRoutine: (routineId: string, userId: string) => {
    return routinesRepository.remove(routineId, userId);
  },

  getStepsByRoutine: (routineId: string) => {
    return routinesRepository.findStepsByRoutineId(routineId);
  },

  createStep: async (routineId: string, data: Omit<RoutineStepInsert, 'routine_id'>) => {
    const stepOrder = data.step_order ?? await getNextStepOrder(routineId, data.category ?? null);

    return routinesRepository.createStep({
      ...data,
      routine_id: routineId,
      step_order: stepOrder
    });
  },

  updateStep: (stepId: string, data: RoutineStepUpdate) => {
    return routinesRepository.updateStep(stepId, {
      ...data,
      updated_at: new Date().toISOString()
    });
  },

  deleteStep: (stepId: string) => {
    return routinesRepository.removeStep(stepId);
  }
};

async function getNextStepOrder(routineId: string, category: string | null) {
  const steps = await routinesRepository.findStepsByRoutineId(routineId);
  const matchingSteps = steps.filter((step) => (step.category ?? null) === category);

  return Math.max(0, ...matchingSteps.map((step) => step.step_order ?? 0)) + 1;
}
