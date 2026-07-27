import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { adminService } from './admin.service';

export const adminHealth: RequestHandler = (_req, res) => {
  res.json(adminService.getHealth());
};

export const listPendingSpecialists: RequestHandler = asyncHandler(async (_req, res) => {
  const specialists = await adminService.listPendingSpecialists();
  res.json({ specialists });
});

export const listSpecialists: RequestHandler = asyncHandler(async (_req, res) => {
  const specialists = await adminService.listSpecialists();
  res.json({ specialists });
});

export const updateSpecialistStatus: RequestHandler = asyncHandler(async (req, res) => {
  const specialistProfileId = String(req.params.specialistProfileId);
  const specialist = await adminService.updateSpecialistStatus(specialistProfileId, req.body, req.user.id);
  res.json({ specialist });
});

export const updateSpecialistCenter: RequestHandler = asyncHandler(async (req, res) => {
  const specialistId = String(req.params.specialistId);
  const specialist = await adminService.updateSpecialistCenter(req.user.id, specialistId, req.body);
  res.json({ specialist });
});

export const getSpecialistDocuments: RequestHandler = asyncHandler(async (req, res) => {
  const specialistProfileId = String(req.params.specialistProfileId);
  const documents = await adminService.getSpecialistDocuments(specialistProfileId);
  res.json({ documents });
});
