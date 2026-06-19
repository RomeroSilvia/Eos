import { supabase } from '../../config/supabase';
import type { ProductInsert, ProductRow, ProductUpdate } from '../../database/schema.types';
import { TABLE_NAMES } from '../../database/tableNames';

type ProductUsageRow = {
  id: string;
  routine_steps: {
    id: string;
    name: string;
    routines: {
      id: string;
      name: string;
      is_active: boolean;
    } | null;
  } | null;
};

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
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  create: async (data: ProductInsert): Promise<ProductRow | null> => {
    const db = supabase as any;

    const { data: created, error } = await db
      .from(TABLE_NAMES.products)
      .insert(data)
      .select('*')
      .single();

    if (error) throw error;
    return created;
  },

  update: async (productId: string, userId: string, data: ProductUpdate): Promise<ProductRow | null> => {
    const db = supabase as any;

    const { data: updated, error } = await db
      .from(TABLE_NAMES.products)
      .update(data)
      .eq('id', productId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return updated;
  },

  remove: async (productId: string, userId: string): Promise<boolean> => {
    const { error } = await supabase
      .from(TABLE_NAMES.products)
      .delete()
      .eq('id', productId)
      .eq('user_id', userId);

    return !error;
  },

  findUsagesInActiveRoutines: async (productId: string): Promise<ProductUsageRow[]> => {
    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.routineStepProducts)
      .select(
        `
        id,
        routine_steps!inner(
          id,
          name,
          routines!inner(id, name, is_active)
        )
      `
      )
      .eq('product_id', productId);

    if (error) throw error;
    return (data ?? []) as ProductUsageRow[];
  },

  detachFromAllSteps: async (productId: string): Promise<void> => {
    const db = supabase as any;

    const { error } = await db
      .from(TABLE_NAMES.routineStepProducts)
      .delete()
      .eq('product_id', productId);

    if (error) throw error;
  },

  replaceProductInSteps: async (productId: string, replacementProductId: string): Promise<void> => {
    const db = supabase as any;

    const { data: links, error: findError } = await db
      .from(TABLE_NAMES.routineStepProducts)
      .select('id')
      .eq('product_id', productId);

    if (findError) throw findError;

    for (const link of links ?? []) {
      const { error: updateError } = await db
        .from(TABLE_NAMES.routineStepProducts)
        .update({ product_id: replacementProductId })
        .eq('id', link.id);

      if (!updateError) {
        continue;
      }

      if (String(updateError.message).toLowerCase().includes('duplicate')) {
        const { error: deleteDuplicateError } = await db
          .from(TABLE_NAMES.routineStepProducts)
          .delete()
          .eq('id', link.id);

        if (deleteDuplicateError) throw deleteDuplicateError;
        continue;
      }

      throw updateError;
    }
  }
};
