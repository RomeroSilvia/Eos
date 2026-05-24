import { Router } from 'express';
import { authHealth, googleLogin, login, register, resetPassword, updatePassword } from './auth.controller';

export const authRouter = Router();

authRouter.get('/health', authHealth);
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/google', googleLogin);
authRouter.post('/forgot-password', resetPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/update-password', updatePassword);
