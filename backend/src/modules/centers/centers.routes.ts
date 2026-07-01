import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/requireRole.middleware';
import { createCenter, deleteCenter, listCenters, updateCenter } from './centers.controller';

export const centersRouter = Router();

centersRouter.use(authenticate);
centersRouter.use(requireRole('center_admin'));

centersRouter.get('/', listCenters);
centersRouter.post('/', createCenter);
centersRouter.patch('/:centerId', updateCenter);
centersRouter.delete('/:centerId', deleteCenter);
