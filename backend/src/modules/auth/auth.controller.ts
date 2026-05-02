import type { RequestHandler } from 'express';
import { getAuthHealth } from './auth.service';

export const authHealth: RequestHandler = (_req, res) => {
  res.json(getAuthHealth());
};
