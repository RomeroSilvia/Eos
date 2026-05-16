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
    return data;
  },

  create: async (data: RoutineInsert): Promise<RoutineRow | null> => {
    const routinesTable = supabase.from('routines') as any;
    const { data: created, error } = await routinesTable
      .insert(data)
      .select();

    if (error) throw error;

    return (created?.[0] as RoutineRow | undefined) ?? null;
  },

  update: async (
    routineId: string,
    userId: string,
    data: RoutineUpdate
  ): Promise<RoutineRow | null> => {
    const routinesTable = supabase.from('routines') as any;
    const { data: updated, error } = await routinesTable
      .update(data)
      .eq('id', routineId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return null;
    return updated as RoutineRow;
  },

  remove: async (routineId: string, userId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId)
      .eq('user_id', userId);

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
    const routineStepsTable = supabase.from('routine_steps') as any;
    const { data: created, error } = await routineStepsTable
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created as RoutineStepRow;
  },

  updateStep: async (
    stepId: string,
    data: RoutineStepUpdate
  ): Promise<RoutineStepRow | null> => {
    const routineStepsTable = supabase.from('routine_steps') as any;
    const { data: updated, error } = await routineStepsTable
      .update(data)
      .eq('id', stepId)
      .select()
      .single();

    if (error) return null;
    return updated as RoutineStepRow;
  },

  removeStep: async (stepId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('routine_steps')
      .delete()
      .eq('id', stepId);

    return !error;
  },

  findProductsByStepId: async (_stepId: string): Promise<ProductRow[]> => {
    return [];
  },

  attachProductToStep: async (
    _stepId: string,
    _productId: string
  ): Promise<RoutineStepProductRow | null> => {
    return null;
  },

  detachProductFromStep: async (
    _stepId: string,
    _productId: string
  ): Promise<boolean> => {
    return false;
  }
};
