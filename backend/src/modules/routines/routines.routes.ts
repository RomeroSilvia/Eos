import { Router } from 'express';
import { routinesHealth } from './routines.controller';

export const routinesRouter = Router();

routinesRouter.get('/health', routinesHealth);
