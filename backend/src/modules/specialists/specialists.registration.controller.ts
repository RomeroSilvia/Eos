import type { Request, RequestHandler, Response } from 'express';
import { env } from '../../config/env';
import { asyncHandler } from '../../utils/asyncHandler';
import { specialistsRegistrationService } from './specialists.registration.service';

type SpecialistFiles = Partial<Record<'dniPhoto' | 'titlePhoto', Express.Multer.File[]>>;

export const specialistHealth: RequestHandler = (_req, res) => {
  res.json(specialistsRegistrationService.getHealth());
};

export const registerSpecialist = asyncHandler(async (req: Request, res: Response) => {
  logRegisterRequest(req);

  const profile = await specialistsRegistrationService.register(
    req.user.id,
    req.user.accessToken,
    req.body,
    req.files as SpecialistFiles
  );

  res.status(201).json({
    license_status: profile.license_status,
    rejection_reason: profile.rejection_reason,
    specialty: profile.specialty,
    license_number: profile.license_number
  });
});

export const getSpecialistStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await specialistsRegistrationService.getStatus(req.user.id);
  res.json({ specialistProfile: status });
});

function logRegisterRequest(req: Request): void {
  if (env.nodeEnv !== 'development') return;

  const files = req.files as SpecialistFiles | undefined;

  console.info('[specialist/register:request]', {
    userId: req.user.id,
    role: req.user.role,
    bodyKeys: Object.keys(req.body ?? {}),
    fileKeys: Object.keys(files ?? {}),
    files: {
      dniPhoto: summarizeFile(files?.dniPhoto?.[0]),
      titlePhoto: summarizeFile(files?.titlePhoto?.[0])
    }
  });
}

function summarizeFile(file: Express.Multer.File | undefined): { mimetype: string; size: number } | null {
  if (!file) return null;
  return {
    mimetype: file.mimetype,
    size: file.size
  };
}
