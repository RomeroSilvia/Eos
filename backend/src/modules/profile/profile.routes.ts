import { Router } from 'express';
import { profileHealth } from './profile.controller';

export const profileRouter = Router();

profileRouter.get('/health', profileHealth);
