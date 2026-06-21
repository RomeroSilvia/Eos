import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { specialistsDirectoryService } from './specialists.directory.service';

export const specialistsHealth: RequestHandler = (_req, res) => {
  res.json(specialistsDirectoryService.getHealth());
};

export const getSpecialists: RequestHandler = asyncHandler(async (req, res) => {
  const name = typeof req.query.name === 'string' ? req.query.name : undefined;
  const specialty = typeof req.query.specialty === 'string' ? req.query.specialty : undefined;

  const specialists = await specialistsDirectoryService.searchSpecialists({ name, specialty });

  res.json({ specialists });
});

export const linkSpecialist: RequestHandler = asyncHandler(async (req, res) => {
  const specialistId = (req.body as { specialistId?: unknown }).specialistId;

  if (typeof specialistId !== 'string') {
    throw new ApiError(400, 'specialistId es requerido.');
  }

  const result = await specialistsDirectoryService.linkSpecialist(req.user.id, specialistId);
  res.status(201).json(result);
});

export const unlinkSpecialist: RequestHandler = asyncHandler(async (req, res) => {
  await specialistsDirectoryService.unlinkSpecialist(req.user.id);
  res.status(204).send();
});

export const getMySpecialist: RequestHandler = asyncHandler(async (req, res) => {
  const relation = await specialistsDirectoryService.getMySpecialist(req.user.id);
  res.json({ relation });
});

export const getMyPatients: RequestHandler = asyncHandler(async (req, res) => {
  const patients = await specialistsDirectoryService.getMyPatients(req.user.id);
  res.json({ patients });
});
