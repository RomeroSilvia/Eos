import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  getDayDetailByDate,
  getFullHistoryByUserId,
  getHistoryByDate,
  getRoutineDayProgress,
  getStatsByUserId,
  getSummaryByUserId,
  progressHealth,
  setRoutineStepCompletion
} from './progress.controller';

export const progressRouter = Router();

progressRouter.get('/health', progressHealth);
progressRouter.use(authenticate);

progressRouter.get('/summary', getSummaryByUserId);
progressRouter.get('/stats', getStatsByUserId);
progressRouter.get('/day/:date', getDayDetailByDate);
progressRouter.get('/history/all', getFullHistoryByUserId);
progressRouter.get('/history', getHistoryByDate);
progressRouter.get('/routines/:routineId/today', getRoutineDayProgress);
progressRouter.patch('/routines/:routineId/today/steps/:stepId', setRoutineStepCompletion);

export default progressRouter;
