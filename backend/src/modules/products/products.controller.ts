import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { productsService } from './products.service';

const getProductsHealth = () => ({ status: 'ok' });

export const productsHealth: RequestHandler = (_req, res) => {
  res.json(getProductsHealth());
};

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const products = await productsService.getAll(req.user.id);
  res.json(products);
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.getById(req.params.id, req.user.id);
  res.json(product);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.create(req.user.id, req.body, req.file);
  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.update(req.params.id, req.user.id, req.body);
  res.json(product);
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await productsService.remove(req.params.id, req.user.id);
  res.status(204).send();
});