import type { RequestHandler } from 'express';
import { getRoutinesHealth } from './routines.service';

export const routinesHealth: RequestHandler = (_req, res) => {
  res.json(getRoutinesHealth());
};
