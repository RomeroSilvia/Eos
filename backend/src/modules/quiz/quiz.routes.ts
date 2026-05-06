import { Router } from 'express';
import { saveQuizProfile } from './quiz.controller';

export const quizRouter = Router();

quizRouter.post('/save', saveQuizProfile);
