import { Router } from 'express';
import { productsHealth } from './products.controller';

export const productsRouter = Router();

productsRouter.get('/health', productsHealth);
