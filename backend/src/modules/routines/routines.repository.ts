import { supabase } from '../../config/supabase';
import type {
  ProductRow,
  RoutineInsert,
  RoutineRow,
  RoutineStepInsert,
  RoutineStepProductRow,
  RoutineStepRow,
  RoutineStepUpdate,
  RoutineUpdate
} from '../../database/schema.types';

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export const routinesRepository = {
  findAllByUserId: async (userId: string): Promise<RoutineRow[]> => {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data ?? [];
  },

  findById: async (routineId: string, userId: string): Promise<any> => {
    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_steps (
          id,
          name,
          description,
          category,
          step_order,
          is_required,
          created_at,
          updated_at
        )
      `)
      .eq('id', routineId)
      .eq('user_id', userId)
      .single();

    if (error) return null;
    if (!data) return null;

    const steps: RoutineStepRow[] = (data as any).routine_steps ?? [];
    if (steps.length === 0) return data;

    const stepIds = steps.map((s) => s.id);

    const { data: links } = await supabase
      .from('routine_step_products')
      .select('step_id, product_id')
      .in('step_id', stepIds);

    if (!links || links.length === 0) return data;

    const productIds = [...new Set(links.map((l) => l.product_id))];
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    const productMap = new Map((products ?? []).map((p) => [p.id, p]));
    const stepProductMap = new Map<string, ProductRow[]>();

    for (const link of links) {
      const product = productMap.get(link.product_id);
      if (product) {
        if (!stepProductMap.has(link.step_id)) stepProductMap.set(link.step_id, []);
        stepProductMap.get(link.step_id)!.push(product);
      }
    }

    const routineBase = data as RoutineRow & { routine_steps: RoutineStepRow[] };

    return {
      ...routineBase,
      routine_steps: steps.map((step) => ({
        ...step,
        products: stepProductMap.get(step.id) ?? []
      }))
    };
  },

  findRawById: async (routineId: string): Promise<RoutineRow | null> => {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('id', routineId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  findRoutineByStepId: async (stepId: string): Promise<RoutineRow | null> => {
    const { data, error } = await supabase
      .from('routine_steps')
      .select('routine_id')
      .eq('id', stepId)
      .maybeSingle();

    if (error) throw error;
    if (!data?.routine_id) return null;

    return routinesRepository.findRawById(data.routine_id);
  },

  findStepById: async (stepId: string): Promise<RoutineStepRow | null> => {
    const { data, error } = await supabase
      .from('routine_steps')
      .select('*')
      .eq('id', stepId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  findProductsByIds: async (productIds: string[]): Promise<ProductRow[]> => {
    if (productIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (error) throw error;
    return data ?? [];
  },

  create: async (data: RoutineInsert): Promise<RoutineRow | null> => {
    const { data: created, error, status, statusText } = await supabase
      .from('routines')
      .insert([data as any])
      .select();

    if (error) {
      logSupabaseInsertError('routines', data, error, status, statusText);
      throw error;
    }

    return created?.[0] ?? null;
  },

  update: async (
    routineId: string,
    data: RoutineUpdate
  ): Promise<RoutineRow | null> => {
    const { data: updated, error } = await supabase
      .from('routines')
      .update(data)
      .eq('id', routineId)
      .select()
      .single();

    if (error) return null;
    return updated;
  },

  remove: async (routineId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId);

    return !error;
  },

  findStepsByRoutineId: async (routineId: string): Promise<RoutineStepRow[]> => {
    const { data, error } = await supabase
      .from('routine_steps')
      .select('*')
      .eq('routine_id', routineId)
      .order('step_order', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  createStep: async (data: RoutineStepInsert): Promise<RoutineStepRow | null> => {
    const { data: created, error, status, statusText } = await supabase
      .from('routine_steps')
      .insert([data as any])
      .select()
      .single();

    if (error) {
      logSupabaseInsertError('routine_steps', data, error, status, statusText);
      throw error;
    }
    return created;
  },

  updateStep: async (
    stepId: string,
    data: RoutineStepUpdate
  ): Promise<RoutineStepRow | null> => {
    const { data: updated, error } = await supabase
      .from('routine_steps')
      .update(data)
      .eq('id', stepId)
      .select()
      .single();

    if (error) return null;
    return updated;
  },

  removeStep: async (stepId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('routine_steps')
      .delete()
      .eq('id', stepId);

    return !error;
  },

  findProductsByStepId: async (stepId: string): Promise<ProductRow[]> => {
    const { data: links, error: linksError } = await supabase
      .from('routine_step_products')
      .select('product_id')
      .eq('step_id', stepId);

    if (linksError) throw linksError;
    if (!links || links.length === 0) return [];

    const productIds = links.map((l) => l.product_id);

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (productsError) throw productsError;
    return products ?? [];
  },

  setStepProducts: async (stepId: string, productIds: string[]): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('routine_step_products')
      .delete()
      .eq('step_id', stepId);

    if (deleteError) throw deleteError;
    if (productIds.length === 0) return;

    const inserts = productIds.map((productId) => ({ step_id: stepId, product_id: productId }));

    const { error: insertError } = await supabase
      .from('routine_step_products')
      .insert(inserts as any);

    if (insertError) throw insertError;
  },

  attachProductToStep: async (
    stepId: string,
    productId: string
  ): Promise<RoutineStepProductRow | null> => {
    const { data, error } = await supabase
      .from('routine_step_products')
      .upsert(
        { step_id: stepId, product_id: productId },
        { onConflict: 'step_id,product_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  detachProductFromStep: async (
    stepId: string,
    productId: string
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('routine_step_products')
      .delete()
      .eq('step_id', stepId)
      .eq('product_id', productId);

    return !error;
  }
};

function logSupabaseInsertError(
  table: 'routines' | 'routine_steps',
  payload: unknown,
  error: unknown,
  status?: number,
  statusText?: string
): void {
  const normalized = error as SupabaseLikeError;

  console.error('[supabase-insert-error]', {
    table,
    payload,
    status: status ?? null,
    statusText: statusText ?? null,
    error: {
      message: normalized?.message ?? String(error),
      code: normalized?.code ?? null,
      details: normalized?.details ?? null,
      hint: normalized?.hint ?? null
    }
  });
}
