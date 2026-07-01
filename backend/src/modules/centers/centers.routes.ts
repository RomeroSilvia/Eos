import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/requireRole.middleware';
import { createCenter, deleteCenter, getCenterDashboard, listCenters, updateCenter } from './centers.controller';

export const centersRouter = Router();

centersRouter.use(authenticate);
centersRouter.use(requireRole('center_admin'));

centersRouter.get('/', listCenters);
centersRouter.get('/:centerId/dashboard', getCenterDashboard);
centersRouter.post('/', createCenter);
centersRouter.patch('/:centerId', updateCenter);
centersRouter.delete('/:centerId', deleteCenter);
