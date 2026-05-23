import { Router } from 'express';
import { saveQuiz } from './quiz.controller';

export const quizRouter = Router();

quizRouter.post('/save', saveQuiz);
