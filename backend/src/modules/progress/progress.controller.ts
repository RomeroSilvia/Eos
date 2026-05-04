import type { RequestHandler } from 'express';
import { getProgressHealth, progressService } from './progress.service';

type RoutineParams = { routineId: string };
type StepParams = { routineId: string; stepId: string };
type DateQuery = { date?: string };
type SetStepCompletionBody = { is_completed?: boolean };

export const progressHealth: RequestHandler = (_req, res) => {
  res.json(getProgressHealth());
};

export const getRoutineDayProgress: RequestHandler<RoutineParams, unknown, unknown, DateQuery> = async (req, res) => {
  try {
    const userId = req.user.id;
    const { routineId } = req.params;
    const { date } = req.query;

    if (!routineId) {
      return res.status(400).json({ error: 'routineId is required' });
    }

    const progress = await progressService.getRoutineDayProgress(userId, routineId, date);

    if (!progress) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    return res.json(progress);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error fetching routine progress' });
  }
};

export const setStepCompletion: RequestHandler<StepParams, unknown, SetStepCompletionBody, DateQuery> = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const { routineId, stepId } = req.params;
    const { date } = req.query;
    const { is_completed } = req.body;

    if (!routineId) {
      return res.status(400).json({ error: 'routineId is required' });
    }

    if (!stepId) {
      return res.status(400).json({ error: 'stepId is required' });
    }

    if (typeof is_completed !== 'boolean') {
      return res.status(400).json({ error: 'is_completed must be a boolean' });
    }

    const progress = await progressService.setStepCompletion({
      userId,
      routineId,
      stepId,
      isCompleted: is_completed,
      date
    });

    if (!progress) {
      return res.status(404).json({ error: 'Routine or step not found' });
    }

    return res.json(progress);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error updating step progress' });
  }
};
