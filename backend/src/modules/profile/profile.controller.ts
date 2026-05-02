import type { RequestHandler } from 'express';
import { getProfileHealth } from './profile.service';

export const profileHealth: RequestHandler = (_req, res) => {
  res.json(getProfileHealth());
};
