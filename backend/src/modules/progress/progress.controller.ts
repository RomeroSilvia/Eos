import type { RequestHandler } from 'express';
import { env } from '../../config/env';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import {
  getDayDetailByDate as getProgressDayDetailByDate,
  getFullHistoryByUserId as getProgressFullHistoryByUserId,
  getHistoryByDate as getProgressHistoryByDate,
  getProgressHealth,
  getRoutineDayProgress as getProgressRoutineDayProgress,
  getStatsByUserId as getProgressStatsByUserId,
  getSummaryByUserId as getProgressSummaryByUserId,
  isIsoDate,
  setRoutineStepCompletion as setProgressRoutineStepCompletion
} from './progress.service';

const GENERIC_PROGRESS_ERROR = 'No pudimos obtener la información de progreso.';

export const progressHealth: RequestHandler = (_req, res) => {
  res.json(getProgressHealth());
};

export const getSummaryByUserId: RequestHandler = asyncHandler(async (req, res) => {
  const summary = await runProgressAction(() => getProgressSummaryByUserId(req.user.id));
  res.json(summary);
});

export const getHistoryByDate: RequestHandler = asyncHandler(async (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;

  if (!date) {
    throw new ApiError(400, 'date query param is required');
  }

  if (!isIsoDate(date)) {
    throw new ApiError(400, 'date must use YYYY-MM-DD format');
  }

  const history = await runProgressAction(() => getProgressHistoryByDate(req.user.id, date));
  res.json(history);
});

export const getFullHistoryByUserId: RequestHandler = asyncHandler(async (req, res) => {
  const history = await runProgressAction(() => getProgressFullHistoryByUserId(req.user.id));
  res.json(history);
});

export const getStatsByUserId: RequestHandler = asyncHandler(async (req, res) => {
  const stats = await runProgressAction(() => getProgressStatsByUserId(req.user.id));
  res.json(stats);
});

export const getDayDetailByDate: RequestHandler = asyncHandler(async (req, res) => {
  const date = typeof req.params.date === 'string' ? req.params.date : undefined;

  if (!date) {
    throw new ApiError(400, 'date is required');
  }

  if (!isIsoDate(date)) {
    throw new ApiError(400, 'date must use YYYY-MM-DD format');
  }

  const detail = await runProgressAction(() => getProgressDayDetailByDate(req.user.id, date));
  res.json(detail);
});

export const getRoutineDayProgress: RequestHandler = asyncHandler(async (req, res) => {
  const routineId = typeof req.params.routineId === 'string' ? req.params.routineId : undefined;

  if (!routineId) {
    throw new ApiError(400, 'routineId is required');
  }

  const progress = await runProgressAction(() => getProgressRoutineDayProgress(req.user.id, routineId));
  res.json(progress);
});

export const setRoutineStepCompletion: RequestHandler = asyncHandler(async (req, res) => {
  const routineId = typeof req.params.routineId === 'string' ? req.params.routineId : undefined;
  const stepId = typeof req.params.stepId === 'string' ? req.params.stepId : undefined;
  const isCompleted = req.body?.is_completed;

  if (!routineId) {
    throw new ApiError(400, 'routineId is required');
  }

  if (!stepId) {
    throw new ApiError(400, 'stepId is required');
  }

  if (typeof isCompleted !== 'boolean') {
    throw new ApiError(400, 'is_completed must be a boolean');
  }

  const progress = await runProgressAction(() => (
    setProgressRoutineStepCompletion(req.user.id, routineId, stepId, isCompleted)
  ));
  res.json(progress);
});

async function runProgressAction<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logProgressError(error);
    throw new ApiError(500, GENERIC_PROGRESS_ERROR);
  }
}

function logProgressError(error: unknown): void {
  if (env.nodeEnv !== 'development') return;

  console.error('[progress:error]', {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error)
  });
}
