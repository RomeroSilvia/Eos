import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/requireRole.middleware';
import {
  assignRoutineToPatient,
  getMyPatientDetail,
  getMyPatients,
  getMySpecialist,
  getSpecialists,
  linkSpecialist,
  specialistsHealth,
  unlinkSpecialist
} from './specialists.directory.controller';

export const specialistsRouter = Router();

specialistsRouter.get('/health', specialistsHealth);
specialistsRouter.get('/', getSpecialists);

specialistsRouter.use(authenticate);

specialistsRouter.post('/link', requireRole('user'), linkSpecialist);
specialistsRouter.delete('/link', requireRole('user'), unlinkSpecialist);
specialistsRouter.get('/my-specialist', requireRole('user'), getMySpecialist);
specialistsRouter.get('/my-patients', requireRole('specialist'), getMyPatients);
specialistsRouter.get('/my-patients/:patientId', requireRole('specialist'), getMyPatientDetail);
specialistsRouter.post('/my-patients/:patientId/routines', requireRole('specialist'), assignRoutineToPatient);
