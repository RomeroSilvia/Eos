import { Router } from 'express';
import {
  authHealth,
  googleSignInController,
  resetPasswordController,
  signInController,
  signUpController,
  updatePasswordController
} from './auth.controller';

export const authRouter = Router();

authRouter.get('/health', authHealth);
authRouter.post('/register', signUpController);
authRouter.post('/login', signInController);
authRouter.post('/google', googleSignInController);
authRouter.post('/reset-password', resetPasswordController);
authRouter.post('/update-password', updatePasswordController);
