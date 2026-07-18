import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/requireRole.middleware';
import { getAuditLogs } from './audit.controller';

export const auditRouter = Router();

auditRouter.use(authenticate);
auditRouter.use(requireRole('center_admin'));

auditRouter.get('/', getAuditLogs);
