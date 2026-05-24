import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { getQuizProfile, saveQuiz } from './quiz.controller';

export const quizRouter = Router();

quizRouter.get('/profile', authenticate, getQuizProfile);
quizRouter.post('/save', authenticate, saveQuiz);
