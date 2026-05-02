import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { productsService } from './products.service';

const getProductsHealth = () => ({ status: 'ok' });

export const productsHealth: RequestHandler = (_req, res) => {
  res.json(getProductsHealth());
};

// TODO: reemplazar cuando esté auth implementada
const TEMP_USER_ID = 'temp-user-id';

export const getProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await productsService.getAll(TEMP_USER_ID);
  res.json(products);
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.getById(req.params.id, TEMP_USER_ID);
  res.json(product);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.create(TEMP_USER_ID, req.body);
  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.update(req.params.id, TEMP_USER_ID, req.body);
  res.json(product);
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await productsService.remove(req.params.id, TEMP_USER_ID);
  res.status(204).send();
});