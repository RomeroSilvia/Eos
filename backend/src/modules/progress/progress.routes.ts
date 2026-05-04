import { Router } from 'express';
import { getHistoryByDate, getSummaryByUserId, progressHealth } from './progress.controller';

export const progressRouter = Router();

progressRouter.get('/health', progressHealth);
progressRouter.get('/summary/:userId', getSummaryByUserId);
progressRouter.get('/history/:userId', getHistoryByDate);

export default progressRouter;
