import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { adminService } from './admin.service';

export const listPendingSpecialists = asyncHandler(async (_req: Request, res: Response) => {
  const specialists = await adminService.listPendingSpecialists();
  res.json({ specialists });
});

export const updateSpecialistStatus = asyncHandler(async (req: Request, res: Response) => {
  const specialistProfileId = String(req.params.specialistProfileId);
  const specialist = await adminService.updateSpecialistStatus(specialistProfileId, req.body);
  res.json({ specialist });
});

export const getSpecialistDocuments = asyncHandler(async (req: Request, res: Response) => {
  const specialistProfileId = String(req.params.specialistProfileId);
  const documents = await adminService.getSpecialistDocuments(specialistProfileId);
  res.json({ documents });
});
