import type { RequestHandler } from 'express';
import {
  getHistoryByDate as getProgressHistoryByDate,
  getProgressHealth,
  getSummaryByUserId as getProgressSummaryByUserId,
  isIsoDate
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
