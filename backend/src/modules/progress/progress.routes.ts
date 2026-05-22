import { Router } from 'express';
import { mockAuth } from '../../middlewares/mockAuth.middleware';
import {
  getDayDetailByDate,
  getHistoryByDate,
  getRoutineDayProgress,
  getSummaryByUserId,
  progressHealth,
  setRoutineStepCompletion
} from './progress.controller';

export const progressRouter = Router();

progressRouter.get('/health', progressHealth);
progressRouter.get('/summary/:userId', getSummaryByUserId);
progressRouter.get('/day/:userId/:date', getDayDetailByDate);
progressRouter.get('/history/:userId', getHistoryByDate);
progressRouter.get('/routines/:routineId/today', mockAuth, getRoutineDayProgress);
progressRouter.patch('/routines/:routineId/today/steps/:stepId', mockAuth, setRoutineStepCompletion);

export default progressRouter;
