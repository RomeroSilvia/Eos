import type { RequestHandler } from 'express';
import { getProgressHealth } from './progress.service';

export const progressHealth: RequestHandler = (_req, res) => {
  res.json(getProgressHealth());
};
