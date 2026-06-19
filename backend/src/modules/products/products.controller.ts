import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { productsService } from './products.service';

export const productsHealth: RequestHandler = (_req, res) => {
  res.json(productsService.getHealth());
};

export const getProducts: RequestHandler = asyncHandler(async (req, res) => {
  const products = await productsService.getByUser(req.user.id);
  res.json(products);
});

export const getProductById: RequestHandler = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  if (typeof productId !== 'string') {
    throw new ApiError(400, 'id es requerido.');
  }

  const product = await productsService.getById(productId, req.user.id);

  if (!product) {
    throw new ApiError(404, 'Producto no encontrado.');
  }

  res.json(product);
});

export const createProduct: RequestHandler = asyncHandler(async (req, res) => {
  const name = (req.body as { name?: unknown }).name;

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ApiError(400, 'name es requerido.');
  }

  const product = await productsService.create({
    user_id: req.user.id,
    name: name.trim(),
    brand: typeof req.body.brand === 'string' ? req.body.brand : null,
    category: typeof req.body.category === 'string' ? req.body.category : null,
    notes: typeof req.body.notes === 'string' ? req.body.notes : null,
    image_url: typeof req.body.image_url === 'string' ? req.body.image_url : null
  });

  res.status(201).json(product);
});

export const updateProduct: RequestHandler = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  if (typeof productId !== 'string') {
    throw new ApiError(400, 'id es requerido.');
  }

  const updated = await productsService.update(productId, req.user.id, req.body);

  if (!updated) {
    throw new ApiError(404, 'Producto no encontrado.');
  }

  res.json(updated);
});

export const deleteProduct: RequestHandler = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  if (typeof productId !== 'string') {
    throw new ApiError(400, 'id es requerido.');
  }

  const deleted = await productsService.remove(productId, req.user.id);

  if (!deleted) {
    throw new ApiError(404, 'Producto no encontrado.');
  }

  res.status(204).send();
});

export const forceDeleteProduct: RequestHandler = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  if (typeof productId !== 'string') {
    throw new ApiError(400, 'id es requerido.');
  }

  const deleted = await productsService.forceRemove(productId, req.user.id);

  if (!deleted) {
    throw new ApiError(404, 'Producto no encontrado.');
  }

  res.status(204).send();
});

export const replaceProduct: RequestHandler = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const replacementProductId = (req.body as { replacementProductId?: unknown }).replacementProductId;

  if (typeof productId !== 'string') {
    throw new ApiError(400, 'id es requerido.');
  }

  if (typeof replacementProductId !== 'string' || replacementProductId.trim().length === 0) {
    throw new ApiError(400, 'replacementProductId es requerido.');
  }

  const deleted = await productsService.replaceInRoutines(productId, replacementProductId, req.user.id);

  if (!deleted) {
    throw new ApiError(404, 'Producto no encontrado.');
  }

  res.status(204).send();
});
