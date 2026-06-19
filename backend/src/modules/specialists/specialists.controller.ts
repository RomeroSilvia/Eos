import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { specialistsService } from './specialists.service';

export const specialistsHealth: RequestHandler = (_req, res) => {
  res.json(specialistsService.getHealth());
};

export const getSpecialists: RequestHandler = asyncHandler(async (req, res) => {
  const name = typeof req.query.name === 'string' ? req.query.name : undefined;
  const specialty = typeof req.query.specialty === 'string' ? req.query.specialty : undefined;

  const specialists = await specialistsService.searchSpecialists({ name, specialty });

  res.json({ specialists });
});

export const linkSpecialist: RequestHandler = asyncHandler(async (req, res) => {
  const specialistId = (req.body as { specialistId?: unknown }).specialistId;

  if (typeof specialistId !== 'string') {
    throw new ApiError(400, 'specialistId es requerido.');
  }

  const result = await specialistsService.linkSpecialist(req.user.id, specialistId);
  res.status(201).json(result);
});

export const unlinkSpecialist: RequestHandler = asyncHandler(async (req, res) => {
  await specialistsService.unlinkSpecialist(req.user.id);
  res.status(204).send();
});

export const getMySpecialist: RequestHandler = asyncHandler(async (req, res) => {
  const relation = await specialistsService.getMySpecialist(req.user.id);
  res.json({ relation });
});

export const getMyPatients: RequestHandler = asyncHandler(async (req, res) => {
  const patients = await specialistsService.getMyPatients(req.user.id);
  res.json({ patients });
});
