import { ApiError } from '../../utils/ApiError';
import { productsRepository } from './products.repository';
import type { ProductInsert, ProductUpdate } from '../../database/schema.types';

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

  create: async (userId: string, body: Omit<ProductInsert, 'user_id'>) => {
    const product = await productsRepository.create({ ...body, user_id: userId });
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