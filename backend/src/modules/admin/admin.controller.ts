import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { adminService } from './admin.service';

export const listPendingSpecialists = asyncHandler(async (_req: Request, res: Response) => {
  const specialists = await adminService.listPendingSpecialists();
  res.json({ specialists });
});

export const updateSpecialistStatus = asyncHandler(async (req: Request, res: Response) => {
  const specialistProfileId = String(req.params.specialistProfileId);
  const specialist = await adminService.updateSpecialistStatus(specialistProfileId, req.body, req.user.id);
  res.json({ specialist });
});

export const updateSpecialistCenter = asyncHandler(async (req: Request, res: Response) => {
  const specialistId = String(req.params.specialistId);
  const specialist = await adminService.updateSpecialistCenter(req.user.id, specialistId, req.body);
  res.json({ specialist });
});

export const getSpecialistDocuments = asyncHandler(async (req: Request, res: Response) => {
  const specialistProfileId = String(req.params.specialistProfileId);
  const documents = await adminService.getSpecialistDocuments(specialistProfileId);
  res.json({ documents });
});
