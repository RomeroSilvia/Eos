import type { RequestHandler } from 'express';

export const mockAuth: RequestHandler = (req, _res, next) => {
  req.user = {
    id: '11111111-1111-1111-1111-111111111111'
  };

  next();
};