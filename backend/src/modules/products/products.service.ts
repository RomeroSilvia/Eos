import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/ApiError';
import { productsRepository } from './products.repository';
import type { ProductUpdate } from '../../database/schema.types';
 
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
 
  create: async (
    userId: string,
    body: Record<string, unknown>,
    file?: Express.Multer.File
  ) => {
    const image_url = file ? await productsService.uploadImage(file) : null;
 
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
    const image_url = file ? await productsService.uploadImage(file) : undefined;

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

    const product = await productsRepository.update(productId, userId, payload);
    if (!product) throw new ApiError(404, 'Producto no encontrado');
    return product;
  },
 
  remove: async (productId: string, userId: string) => {
    await productsRepository.remove(productId, userId);
  }
};
 
