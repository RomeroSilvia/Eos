import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/ApiError';
import { productsRepository } from './products.repository';
import type { ProductUpdate } from '../../database/schema.types';
 
const BUCKET = 'product-images';

type ProductImageBody = {
  imageBase64?: string;
  imageMimeType?: string;
  imageFilename?: string;
};
 
export function getProductsHealth() {
  return {
    module: 'products',
    status: 'ready'
  };
}
 
export const productsService = {
  getAll: async (userId: string) => {
    return productsRepository.findAllByUserId(userId);
  },
 
  getById: async (productId: string, userId: string) => {
    const product = await productsRepository.findById(productId, userId);
    if (!product) throw new ApiError(404, 'Producto no encontrado');
    return product;
  },
 
  uploadImage: async (userId: string, file: Express.Multer.File): Promise<string> => {
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const path = buildProductImagePath(userId, ext);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[productsService.uploadImage] uploading product image', {
        bucket: BUCKET,
        path,
        userId
      });
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) throw new ApiError(500, `Error al subir imagen: ${error.message}`);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  uploadBase64Image: async (userId: string, { imageBase64, imageMimeType, imageFilename }: ProductImageBody): Promise<string | null> => {
    if (!imageBase64) {
      return null;
    }

    const contentType = imageMimeType || 'image/jpeg';
    const ext = getImageExtension(imageFilename, contentType);
    const path = buildProductImagePath(userId, ext);
    const buffer = Buffer.from(imageBase64, 'base64');

    if (process.env.NODE_ENV !== 'production') {
      console.log('[productsService.uploadBase64Image] uploading product image', {
        bucket: BUCKET,
        path,
        userId
      });
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: false });

    if (error) throw new ApiError(500, `Error al subir imagen: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },
 
  create: async (
    userId: string,
    body: Record<string, unknown>,
    file?: Express.Multer.File
  ) => {
    const image_url = file
      ? await productsService.uploadImage(userId, file)
      : await productsService.uploadBase64Image(userId, body as ProductImageBody);
 
    const { name, brand, category, notes } = body as {
      name: string;
      brand?: string;
      category?: string;
      notes?: string;
    };
 
    const product = await productsRepository.create({
      user_id: userId,
      name,
      brand: brand ?? null,
      category: category ?? null,
      notes: notes ?? null,
      image_url,
    });
 
    if (!product) throw new ApiError(500, 'No se pudo crear el producto');
    return product;
  },
 
  update: async (
    productId: string,
    userId: string,
    body: Record<string, unknown>,
    file?: Express.Multer.File
  ) => {
    const image_url = file
      ? await productsService.uploadImage(userId, file)
      : await productsService.uploadBase64Image(userId, body as ProductImageBody) ?? undefined;

    const { name, brand, category, notes } = body as {
      name?: string;
      brand?: string;
      category?: string;
      notes?: string;
    };

    const payload: ProductUpdate = {};
    if (name !== undefined) payload.name = name;
    if (brand !== undefined) payload.brand = brand;
    if (category !== undefined) payload.category = category;
    if (notes !== undefined) payload.notes = notes;
    if (image_url !== undefined) payload.image_url = image_url;
    payload.updated_at = new Date().toISOString();

    const product = await productsRepository.update(productId, userId, payload);
    if (!product) throw new ApiError(404, 'Producto no encontrado');
    return product;
  },
 
  remove: async (productId: string, userId: string) => {
    await productsRepository.remove(productId, userId);
  }
};

function buildProductImagePath(userId: string, ext: string): string {
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return `${userId}/products/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
}

function getImageExtension(filename: string | undefined, mimeType: string): string {
  const filenameExt = filename?.split('.').pop()?.toLowerCase();

  if (filenameExt && ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(filenameExt)) {
    return filenameExt === 'jpeg' ? 'jpg' : filenameExt;
  }

  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('heic')) return 'heic';
  return 'jpg';
}
 
