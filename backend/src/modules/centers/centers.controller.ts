import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { centersService } from './centers.service';

export const listCenters: RequestHandler = asyncHandler(async (req, res) => {
  const centers = await centersService.listCenters(req.user.id);
  res.json({ centers });
});

export const createCenter: RequestHandler = asyncHandler(async (req, res) => {
  const center = await centersService.createCenter(req.user.id, req.body);
  res.status(201).json({ center });
});

export const updateCenter: RequestHandler = asyncHandler(async (req, res) => {
  const centerId = getCenterId(req.params.centerId);
  const center = await centersService.updateCenter(req.user.id, centerId, req.body);
  res.json({ center });
});

export const getCenterDashboard: RequestHandler = asyncHandler(async (req, res) => {
  const centerId = getCenterId(req.params.centerId);
  const dashboard = await centersService.getDashboard(req.user.id, centerId);
  res.json(dashboard);
});

export const deleteCenter: RequestHandler = asyncHandler(async (req, res) => {
  const centerId = getCenterId(req.params.centerId);
  await centersService.deleteCenter(req.user.id, centerId);
  res.status(204).send();
});

function getCenterId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, 'centerId es requerido.');
  }

  return value;
}
