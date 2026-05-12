import { supabase } from '../../config/supabase';
import type { ProductInsert, ProductRow, ProductUpdate } from '../../database/schema.types';
import { TABLE_NAMES } from '../../database/tableNames';

export const productsRepository = {
  findAllByUserId: async (userId: string): Promise<ProductRow[]> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.products)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  findById: async (productId: string, userId: string): Promise<ProductRow | null> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.products)
      .select('*')
      .eq('id', productId)
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data;
  },

  create: async (data: ProductInsert): Promise<ProductRow | null> => {
    const { data: created, error } = await supabase
      .from(TABLE_NAMES.products)
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created;
  },

  update: async (productId: string, userId: string, data: ProductUpdate): Promise<ProductRow | null> => {
    const { data: updated, error } = await supabase
      .from(TABLE_NAMES.products)
      .update(data)
      .eq('id', productId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated;
  },

  remove: async (productId: string, userId: string): Promise<boolean> => {
    const { error } = await supabase
      .from(TABLE_NAMES.products)
      .delete()
      .eq('id', productId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return true;
  }
};