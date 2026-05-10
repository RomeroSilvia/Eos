import type { RequestHandler } from 'express';
import { routinesService } from './routines.service';
import type {
  RoutineInsert,
  RoutineUpdate,
  RoutineStepInsert,
  RoutineStepUpdate
} from '../../database/schema.types';

type RoutineParams = { id: string };
type StepParams = { stepId: string };

type CreateRoutineBody = Omit<RoutineInsert, 'user_id'>;
type UpdateRoutineBody = RoutineUpdate;

type CreateStepBody = Omit<RoutineStepInsert, 'routine_id'>;
type UpdateStepBody = RoutineStepUpdate;

/* RUTINAS */

export const getUserRoutines: RequestHandler = async (req, res) => {
  try {
    const userId = req.user.id;

    const routines = await routinesService.getUserRoutines(userId);

    return res.json(routines);
  } catch {
    return res.status(500).json({ error: 'Error fetching routines' });
  }
};

export const getRoutineById: RequestHandler<RoutineParams> = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const routine = await routinesService.getRoutineById(id, userId);

    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    return res.json(routine);
  } catch {
    return res.status(500).json({ error: 'Error fetching routine' });
  }
};

export const createRoutine: RequestHandler<{}, unknown, CreateRoutineBody> = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, time_of_day, is_active } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }

    if (time_of_day && !['morning', 'night', 'custom'].includes(time_of_day)) {
      return res.status(400).json({ error: 'invalid time_of_day' });
    }

    const routine = await routinesService.createRoutine({
      user_id: userId,
      name: name.trim(),
      description: description ?? null,
      time_of_day: time_of_day ?? null,
      is_active: is_active ?? true
    });

    return res.status(201).json(routine);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error creating routine' });
  }
};

export const updateRoutine: RequestHandler<RoutineParams, unknown, UpdateRoutineBody> = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, time_of_day } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return res.status(400).json({ error: 'invalid name' });
    }

    if (time_of_day && !['morning', 'night', 'custom'].includes(time_of_day)) {
      return res.status(400).json({ error: 'invalid time_of_day' });
    }

    const updated = await routinesService.updateRoutine(id, userId, req.body);

    if (!updated) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error updating routine' });
  }
};

export const deleteRoutine: RequestHandler<RoutineParams> = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const success = await routinesService.deleteRoutine(id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Error deleting routine' });
  }
};

/* PASOS */

export const getStepsByRoutine: RequestHandler<RoutineParams> = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'routine id is required' });
    }

    const steps = await routinesService.getStepsByRoutine(id);

    return res.json(steps);
  } catch {
    return res.status(500).json({ error: 'Error fetching steps' });
  }
};

export const createStep: RequestHandler<RoutineParams, unknown, CreateStepBody> = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, step_order, is_required } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'routine id is required' });
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }

    if (step_order !== undefined && typeof step_order !== 'number') {
      return res.status(400).json({ error: 'step_order must be a number' });
    }

    const step = await routinesService.createStep(id, {
      name: name.trim(),
      description: req.body.description ?? null,
      category: req.body.category ?? null,
      step_order,
      is_required: is_required ?? false
    });

    return res.status(201).json(step);
  } catch {
    return res.status(500).json({ error: 'Error creating step' });
  }
};

export const updateStep: RequestHandler<StepParams, unknown, UpdateStepBody> = async (req, res) => {
  try {
    const { stepId } = req.params;
    const { name, step_order } = req.body;

    if (!stepId) {
      return res.status(400).json({ error: 'stepId is required' });
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return res.status(400).json({ error: 'invalid name' });
    }

    if (step_order !== undefined && typeof step_order !== 'number') {
      return res.status(400).json({ error: 'step_order must be a number' });
    }

    const updated = await routinesService.updateStep(stepId, req.body);

    if (!updated) {
      return res.status(404).json({ error: 'Step not found' });
    }

    return res.json(updated);
  } catch {
    return res.status(500).json({ error: 'Error updating step' });
  }
};

export const deleteStep: RequestHandler<StepParams> = async (req, res) => {
  try {
    const { stepId } = req.params;

    if (!stepId) {
      return res.status(400).json({ error: 'stepId is required' });
    }

    const success = await routinesService.deleteStep(stepId);

    if (!success) {
      return res.status(404).json({ error: 'Step not found' });
    }

    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Error deleting step' });
  }
};

export const routinesHealth: RequestHandler = (_req, res) => {
  return res.json(routinesService.getHealth());
};
