import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/requireRole.middleware';
import { getAdminReports } from './reports.controller';

export const reportsRouter = Router();

reportsRouter.use(authenticate, requireRole('center_admin'));
reportsRouter.get('/', getAdminReports);
