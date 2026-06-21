import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { profileHealth, updateProfile } from './profile.controller';

export const profileRouter = Router();

profileRouter.get('/health', profileHealth);
profileRouter.patch('/', authenticate, updateProfile);
