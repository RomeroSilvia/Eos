import { progressRepository } from './progress.repository';
import { routinesRepository } from '../routines/routines.repository';
import type { RoutineLogRow, RoutineStepLogRow } from '../../database/schema.types';

export type RoutineDayProgress = {
  routine_log: RoutineLogRow;
  step_logs: RoutineStepLogRow[];
  completed_step_ids: string[];
  completion_percentage: number;
};

export function getProgressHealth() {
  return {
    module: 'progress',
    status: 'ready'
  };
}

export const progressService = {
  getRoutineDayProgress: async (
    userId: string,
    routineId: string,
    date = getTodayDate()
  ): Promise<RoutineDayProgress | null> => {
    const routine = await routinesRepository.findById(routineId, userId);

    if (!routine) return null;

    const routineLog = await getOrCreateRoutineLog(userId, routineId, date);
    const stepLogs = await progressRepository.findStepLogsByRoutineLogId(routineLog.id);

    return toRoutineDayProgress(routineLog, stepLogs);
  },

  setStepCompletion: async ({
    userId,
    routineId,
    stepId,
    isCompleted,
    date = getTodayDate()
  }: {
    userId: string;
    routineId: string;
    stepId: string;
    isCompleted: boolean;
    date?: string;
  }): Promise<RoutineDayProgress | null> => {
    const routine = await routinesRepository.findById(routineId, userId);

    if (!routine) return null;

    const steps = await routinesRepository.findStepsByRoutineId(routineId);
    const stepBelongsToRoutine = steps.some((step) => step.id === stepId);

    if (!stepBelongsToRoutine) return null;

    const routineLog = await getOrCreateRoutineLog(userId, routineId, date);

    await progressRepository.upsertStepLog(routineLog.id, stepId, isCompleted);

    const stepLogs = await progressRepository.findStepLogsByRoutineLogId(routineLog.id);
    const completionPercentage = calculateCompletionPercentage(stepLogs, steps.length);
    const completedAt = completionPercentage === 100 ? new Date().toISOString() : null;

    const updatedRoutineLog = await progressRepository.updateRoutineLog(routineLog.id, userId, {
      completion_percentage: completionPercentage,
      completed_at: completedAt,
      updated_at: new Date().toISOString()
    });

    return toRoutineDayProgress(updatedRoutineLog ?? routineLog, stepLogs);
  }
};

async function getOrCreateRoutineLog(userId: string, routineId: string, date: string) {
  const existing = await progressRepository.findRoutineLog(userId, routineId, date);

  if (existing) return existing;

  const created = await progressRepository.createRoutineLog({
    user_id: userId,
    routine_id: routineId,
    log_date: date,
    completion_percentage: 0
  });

  if (!created) {
    throw new Error('Routine log could not be created');
  }

  return created;
}

function toRoutineDayProgress(
  routineLog: RoutineLogRow,
  stepLogs: RoutineStepLogRow[]
): RoutineDayProgress {
  const completedStepIds = stepLogs
    .filter((stepLog) => stepLog.is_completed)
    .map((stepLog) => stepLog.step_id);

  return {
    routine_log: routineLog,
    step_logs: stepLogs,
    completed_step_ids: completedStepIds,
    completion_percentage: routineLog.completion_percentage
  };
}

function calculateCompletionPercentage(stepLogs: RoutineStepLogRow[], totalSteps: number) {
  if (totalSteps === 0) return 0;

  const completedSteps = stepLogs.filter((stepLog) => stepLog.is_completed).length;

  return Math.round((completedSteps / totalSteps) * 100);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}
