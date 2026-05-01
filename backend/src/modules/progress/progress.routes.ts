import { Router } from 'express';
import { progressHealth } from './progress.controller';

export const progressRouter = Router();

progressRouter.get('/health', progressHealth);
