import { Router } from 'express';
import { mockAuth } from '../../middlewares/mockAuth.middleware';
import {
  getRoutineDayProgress,
  progressHealth,
  setStepCompletion
} from './progress.controller';

export const progressRouter = Router();

progressRouter.get('/health', progressHealth);

progressRouter.use(mockAuth);

progressRouter.get('/routines/:routineId/today', getRoutineDayProgress);
progressRouter.patch('/routines/:routineId/today/steps/:stepId', setStepCompletion);
