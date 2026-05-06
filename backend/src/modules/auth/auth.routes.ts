import { Router } from 'express';
import { authHealth, googleSignInController, signInController, signUpController } from './auth.controller';

export const authRouter = Router();

authRouter.get('/health', authHealth);
authRouter.post('/register', signUpController);
authRouter.post('/login', signInController);
authRouter.post('/google', googleSignInController);
