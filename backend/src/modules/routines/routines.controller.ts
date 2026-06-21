import type { Request, RequestHandler } from 'express';
import { routinesService } from './routines.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import type {
  RoutineInsert,
  RoutineStepInsert,
  RoutineStepUpdate,
  RoutineUpdate
} from '../../database/schema.types';

type Role = 'user' | 'specialist' | 'center_admin';
type CreateRoutineBody = Omit<RoutineInsert, 'user_id'>;
type UpdateRoutineBody = RoutineUpdate;
type CreateStepBody = Omit<RoutineStepInsert, 'routine_id'>;
type UpdateStepBody = RoutineStepUpdate;

function roleOf(req: Request): Role {
  return req.user.role ?? 'user';
}

function requiredParam(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError(400, `${name} is required`);
  }

  return value;
}

export const getUserRoutines: RequestHandler = asyncHandler(async (req, res) => {
  const routines = await routinesService.getUserRoutines(req.user.id);
  res.json(routines);
});

export const getRoutineById: RequestHandler = asyncHandler(async (req, res) => {
  const routineId = requiredParam(req.params.id, 'id');
  const routine = await routinesService.getRoutineById(routineId, req.user.id, roleOf(req));

  if (!routine) {
    throw new ApiError(404, 'Rutina no encontrada.');
  }

  res.json(routine);
});

export const createRoutine: RequestHandler<{}, unknown, CreateRoutineBody> = asyncHandler(async (req, res) => {
  const { name, description, time_of_day, is_active } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new ApiError(400, 'name is required');
  }

  if (time_of_day && !['morning', 'night', 'custom'].includes(time_of_day)) {
    throw new ApiError(400, 'invalid time_of_day');
  }

  const routine = await routinesService.createRoutine({
    user_id: req.user.id,
    name: name.trim(),
    description: description ?? null,
    time_of_day: time_of_day ?? null,
    is_active: is_active ?? true
  });

  res.status(201).json(routine);
});

export const updateRoutine: RequestHandler<{}, unknown, UpdateRoutineBody> = asyncHandler(async (req, res) => {
  const routineId = requiredParam(req.params.id, 'id');
  const { name, time_of_day } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    throw new ApiError(400, 'invalid name');
  }

  if (time_of_day && !['morning', 'night', 'custom'].includes(time_of_day)) {
    throw new ApiError(400, 'invalid time_of_day');
  }

  const updated = await routinesService.updateRoutine(routineId, req.user.id, roleOf(req), req.body);

  if (!updated) {
    throw new ApiError(404, 'Rutina no encontrada.');
  }

  res.json(updated);
});

export const deleteRoutine: RequestHandler = asyncHandler(async (req, res) => {
  const routineId = requiredParam(req.params.id, 'id');
  const success = await routinesService.deleteRoutine(routineId, req.user.id, roleOf(req));

  if (!success) {
    throw new ApiError(404, 'Rutina no encontrada.');
  }

  res.status(204).send();
});

export const getStepsByRoutine: RequestHandler = asyncHandler(async (req, res) => {
  const routineId = requiredParam(req.params.id, 'routine id');
  const steps = await routinesService.getStepsByRoutine(routineId, req.user.id, roleOf(req));
  res.json(steps);
});

export const createStep: RequestHandler<{}, unknown, CreateStepBody> = asyncHandler(async (req, res) => {
  const routineId = requiredParam(req.params.id, 'routine id');
  const { name, step_order, is_required } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new ApiError(400, 'name is required');
  }

  if (step_order !== undefined && typeof step_order !== 'number') {
    throw new ApiError(400, 'step_order must be a number');
  }

  const step = await routinesService.createStep(routineId, req.user.id, roleOf(req), {
    name: name.trim(),
    description: req.body.description ?? null,
    category: req.body.category ?? null,
    step_order,
    is_required: is_required ?? false
  });

  res.status(201).json(step);
});

export const updateStep: RequestHandler<{}, unknown, UpdateStepBody> = asyncHandler(async (req, res) => {
  const stepId = requiredParam(req.params.stepId, 'stepId');
  const { name, step_order } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    throw new ApiError(400, 'invalid name');
  }

  if (step_order !== undefined && typeof step_order !== 'number') {
    throw new ApiError(400, 'step_order must be a number');
  }

  const updated = await routinesService.updateStep(stepId, req.user.id, roleOf(req), req.body);

  if (!updated) {
    throw new ApiError(404, 'Paso de rutina no encontrado.');
  }

  res.json(updated);
});

export const deleteStep: RequestHandler = asyncHandler(async (req, res) => {
  const stepId = requiredParam(req.params.stepId, 'stepId');
  const success = await routinesService.deleteStep(stepId, req.user.id, roleOf(req));

  if (!success) {
    throw new ApiError(404, 'Paso de rutina no encontrado.');
  }

  res.status(204).send();
});

export const routinesHealth: RequestHandler = (_req, res) => {
  res.json(routinesService.getHealth());
};

export const getStepProducts: RequestHandler = asyncHandler(async (req, res) => {
  const stepId = requiredParam(req.params.stepId, 'stepId');
  const products = await routinesService.getProductsByStep(stepId, req.user.id, roleOf(req));
  res.json(products);
});

export const setStepProducts: RequestHandler<{}, unknown, { product_ids: string[] }> = asyncHandler(async (req, res) => {
  const stepId = requiredParam(req.params.stepId, 'stepId');
  const { product_ids } = req.body;

  if (!Array.isArray(product_ids)) {
    throw new ApiError(400, 'product_ids must be an array');
  }

  await routinesService.setStepProducts(stepId, req.user.id, roleOf(req), product_ids);
  res.status(204).send();
});

export const attachProduct: RequestHandler<{}, unknown, { product_id: string }> = asyncHandler(async (req, res) => {
  const stepId = requiredParam(req.params.stepId, 'stepId');
  const { product_id } = req.body;

  if (!product_id || typeof product_id !== 'string') {
    throw new ApiError(400, 'product_id is required');
  }

  const result = await routinesService.attachProductToStep(stepId, req.user.id, roleOf(req), product_id);
  res.status(201).json(result);
});

export const detachProduct: RequestHandler = asyncHandler(async (req, res) => {
  const stepId = requiredParam(req.params.stepId, 'stepId');
  const productId = requiredParam(req.params.productId, 'productId');
  const success = await routinesService.detachProductFromStep(stepId, req.user.id, roleOf(req), productId);

  if (!success) {
    throw new ApiError(404, 'Asociacion no encontrada.');
  }

  res.status(204).send();
});
