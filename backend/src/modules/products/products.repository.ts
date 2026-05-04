import type { ProductInsert, ProductRow, ProductUpdate } from '../../database/schema.types';

export const productsRepository = {
  findAllByUserId: async (_userId: string): Promise<ProductRow[]> => {
    // TODO: Implement Supabase query to get products by user id.
    return [];
  },

  findById: async (_productId: string, _userId: string): Promise<ProductRow | null> => {
    // TODO: Implement Supabase query to get product by id and user id.
    return null;
  },

  create: async (_data: ProductInsert): Promise<ProductRow | null> => {
    // TODO: Implement Supabase query to create a product.
    return null;
  },

  update: async (_productId: string, _userId: string, _data: ProductUpdate): Promise<ProductRow | null> => {
    // TODO: Implement Supabase query to update a product by id and user id.
    return null;
  },

  remove: async (_productId: string, _userId: string): Promise<boolean> => {
    // TODO: Implement Supabase query to delete a product by id and user id.
    return false;
  }
};
