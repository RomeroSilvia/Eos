import { Router } from 'express';
import { authHealth } from './auth.controller';

export const authRouter = Router();

authRouter.get('/health', authHealth);
