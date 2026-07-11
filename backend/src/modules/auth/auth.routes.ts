import { Router } from 'express';
import { appleLogin, authHealth, googleLogin, login, register, resetPassword, updatePassword } from './auth.controller';

export const authRouter = Router();

authRouter.get('/health', authHealth);
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/google', googleLogin);
authRouter.post('/apple', appleLogin);
authRouter.post('/forgot-password', resetPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/update-password', updatePassword);
