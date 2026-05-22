import type { RequestHandler } from 'express';
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
function serializeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    return JSON.stringify(error);
  }

  return String(error);
}

export const progressHealth: RequestHandler = (_req, res) => {
  res.json(getProgressHealth());
};


export const getSummaryByUserId: RequestHandler = async (req, res) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : undefined;

  if (!userId) {
    res.status(400).json({ message: 'userId is required' });
    return;
  }

  try {
    const summary = await getProgressSummaryByUserId(userId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get progress summary',
      error: error instanceof Error ? error.message : serializeError(error)
    });
  }
};

export const getHistoryByDate: RequestHandler = async (req, res) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : undefined;
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;

  if (!userId) {
    res.status(400).json({ message: 'userId is required' });
    return;
  }

  if (!date) {
    res.status(400).json({ message: 'date query param is required' });
    return;
  }

  if (!isIsoDate(date)) {
    res.status(400).json({ message: 'date must use YYYY-MM-DD format' });
    return;
  }

  try {
    const history = await getProgressHistoryByDate(userId, date);
    res.json(history);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get progress history',
      error: error instanceof Error ? error.message : serializeError(error)
    });
  }
};

export const getFullHistoryByUserId: RequestHandler = async (req, res) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : undefined;

  if (!userId) {
    res.status(400).json({ message: 'userId is required' });
    return;
  }

  try {
    const history = await getProgressFullHistoryByUserId(userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get progress history',
      error: error instanceof Error ? error.message : serializeError(error)
    });
  }
};

export const getStatsByUserId: RequestHandler = async (req, res) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : undefined;

  if (!userId) {
    res.status(400).json({ message: 'userId is required' });
    return;
  }

  try {
    const stats = await getProgressStatsByUserId(userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get progress stats',
      error: error instanceof Error ? error.message : serializeError(error)
    });
  }
};

export const getDayDetailByDate: RequestHandler = async (req, res) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : undefined;
  const date = typeof req.params.date === 'string' ? req.params.date : undefined;

  if (!userId) {
    res.status(400).json({ message: 'userId is required' });
    return;
  }

  if (!date) {
    res.status(400).json({ message: 'date is required' });
    return;
  }

  if (!isIsoDate(date)) {
    res.status(400).json({ message: 'date must use YYYY-MM-DD format' });
    return;
  }

  try {
    const detail = await getProgressDayDetailByDate(userId, date);
    res.json(detail);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get progress day detail',
      error: error instanceof Error ? error.message : serializeError(error)
    });
  }
};

export const getRoutineDayProgress: RequestHandler = async (req, res) => {
  const userId = req.user.id;
  const routineId = typeof req.params.routineId === 'string' ? req.params.routineId : undefined;

  if (!routineId) {
    res.status(400).json({ message: 'routineId is required' });
    return;
  }

  try {
    const progress = await getProgressRoutineDayProgress(userId, routineId);
    res.json(progress);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get routine day progress',
      error: error instanceof Error ? error.message : serializeError(error)
    });
  }
};

export const setRoutineStepCompletion: RequestHandler = async (req, res) => {
  const userId = req.user.id;
  const routineId = typeof req.params.routineId === 'string' ? req.params.routineId : undefined;
  const stepId = typeof req.params.stepId === 'string' ? req.params.stepId : undefined;
  const isCompleted = req.body?.is_completed;

  if (!routineId) {
    res.status(400).json({ message: 'routineId is required' });
    return;
  }

  if (!stepId) {
    res.status(400).json({ message: 'stepId is required' });
    return;
  }

  if (typeof isCompleted !== 'boolean') {
    res.status(400).json({ message: 'is_completed must be a boolean' });
    return;
  }

  try {
    const progress = await setProgressRoutineStepCompletion(userId, routineId, stepId, isCompleted);
    res.json(progress);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update routine step progress',
      error: error instanceof Error ? error.message : serializeError(error)
    });
  }
};
