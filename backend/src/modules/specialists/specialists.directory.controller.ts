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

export const getMyPatientDetail: RequestHandler = asyncHandler(async (req, res) => {
  const patientId = req.params.patientId;

  if (typeof patientId !== 'string') {
    throw new ApiError(400, 'patientId es requerido.');
  }

  const patient = await specialistsDirectoryService.getMyPatientDetail(req.user.id, patientId);
  res.json({ patient });
});

export const assignRoutineToPatient: RequestHandler = asyncHandler(async (req, res) => {
  const patientId = req.params.patientId;

  if (typeof patientId !== 'string') {
    throw new ApiError(400, 'patientId es requerido.');
  }

  const body = req.body as {
    name?: unknown;
    description?: unknown;
    time_of_day?: unknown;
    is_active?: unknown;
  };

  const routine = await specialistsDirectoryService.assignRoutineToPatient(req.user.id, {
    clientId: patientId,
    name: typeof body.name === 'string' ? body.name : '',
    description: typeof body.description === 'string' ? body.description : null,
    timeOfDay: typeof body.time_of_day === 'string' ? body.time_of_day : null,
    isActive: typeof body.is_active === 'boolean' ? body.is_active : undefined
  });

  res.status(201).json(routine);
});
