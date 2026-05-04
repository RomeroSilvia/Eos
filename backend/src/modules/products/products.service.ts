import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/ApiError';
import { productsRepository } from './products.repository';
import type { ProductInsert, ProductUpdate } from '../../database/schema.types';

const BUCKET = 'product-images';

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

  uploadImage: async (file: Express.Multer.File): Promise<string> => {
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (error) throw new ApiError(500, `Error al subir imagen: ${error.message}`);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  create: async (userId: string, body: Omit<ProductInsert, 'user_id' | 'image_url'>, file?: Express.Multer.File) => {
    const image_url = file ? await productsService.uploadImage(file) : null;
    const product = await productsRepository.create({ ...body, user_id: userId, image_url });
    if (!product) throw new ApiError(500, 'No se pudo crear el producto');
    return product;
  },

  update: async (productId: string, userId: string, body: ProductUpdate) => {
    const product = await productsRepository.update(productId, userId, body);
    if (!product) throw new ApiError(404, 'Producto no encontrado');
    return product;
  },

  remove: async (productId: string, userId: string) => {
    await productsRepository.remove(productId, userId);
  }
};
