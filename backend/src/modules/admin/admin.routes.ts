import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/requireRole.middleware';
import { getSpecialistDocuments, listPendingSpecialists, updateSpecialistStatus } from './admin.controller';

export const adminRouter = Router();

adminRouter.get(
  '/specialists/pending',
  authenticate,
  requireRole('center_admin'),
  listPendingSpecialists
);

adminRouter.patch(
  '/specialists/:specialistProfileId/status',
  authenticate,
  requireRole('center_admin'),
  updateSpecialistStatus
);

adminRouter.get(
  '/specialists/:specialistProfileId/documents',
  authenticate,
  requireRole('center_admin'),
  getSpecialistDocuments
);
