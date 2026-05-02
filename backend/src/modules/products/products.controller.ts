import type { RequestHandler } from 'express';
import { getProductsHealth } from './products.service';

export const productsHealth: RequestHandler = (_req, res) => {
  res.json(getProductsHealth());
};
