import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { env } from '../../config/env';
import { productsService } from './products.service';

function resolveImageSource(
  file: Express.Multer.File | undefined,
  body: Record<string, unknown>
): { buffer: Buffer; mimetype: string; ext: string } | null {
  if (file?.buffer?.length) {
    const ext = (file.originalname.split('.').pop() ?? 'jpg').toLowerCase();
    return { buffer: file.buffer, mimetype: file.mimetype, ext };
  }

  const base64 = body.imageBase64;
  const mimeType = typeof body.imageMimeType === 'string' ? body.imageMimeType : 'image/jpeg';
  const filename = typeof body.imageFilename === 'string' ? body.imageFilename : 'product.jpg';

  if (typeof base64 === 'string' && base64.length > 0) {
    const buffer = Buffer.from(base64, 'base64');
    const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase();

    if (env.nodeEnv === 'development') {
      console.log('[products.controller] usando imageBase64, bufferLen:', buffer.length, 'ext:', ext);
    }

    return { buffer, mimetype: mimeType, ext };
  }

  return null;
}

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

  const imgSource = resolveImageSource(req.file as Express.Multer.File | undefined, req.body as Record<string, unknown>);
  const imageUrl = imgSource ? await productsService.uploadImage(imgSource, req.user.id) : null;

  const product = await productsService.create({
    user_id: req.user.id,
    name: name.trim(),
    brand: typeof req.body.brand === 'string' ? req.body.brand : null,
    category: typeof req.body.category === 'string' ? req.body.category : null,
    notes: typeof req.body.notes === 'string' ? req.body.notes : null,
    image_url: imageUrl
  });

  res.status(201).json(product);
});

export const updateProduct: RequestHandler = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  if (typeof productId !== 'string') {
    throw new ApiError(400, 'id es requerido.');
  }

  const imgSource = resolveImageSource(req.file as Express.Multer.File | undefined, req.body as Record<string, unknown>);
  const imageUrl = imgSource ? await productsService.uploadImage(imgSource, req.user.id) : undefined;

  const payload: Record<string, unknown> = {};
  if (typeof req.body.name === 'string') payload.name = req.body.name.trim();
  if (typeof req.body.brand === 'string') payload.brand = req.body.brand;
  if (typeof req.body.category === 'string') payload.category = req.body.category;
  if (typeof req.body.notes === 'string') payload.notes = req.body.notes;
  if (imageUrl !== undefined) payload.image_url = imageUrl;

  const updated = await productsService.update(productId, req.user.id, payload);

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
