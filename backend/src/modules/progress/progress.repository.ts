import { supabase } from '../../config/supabase';
import type {
  RoutineLogInsert,
  RoutineLogRow,
  RoutineLogUpdate,
  RoutineStepLogRow
} from '../../database/schema.types';

export type ProgressSummaryPlaceholder = {
  completionPercentage: number;
  currentStreakDays: number;
};

export const progressRepository = {
  findSummaryByUserId: async (_userId: string): Promise<ProgressSummaryPlaceholder | null> => {
    // TODO: Implement module-level summary once progress screens leave mocks.
    return null;
  },

  findHistoryByDate: async (userId: string, date: string): Promise<RoutineLogRow[]> => {
    const { data, error } = await supabase
      .from('routine_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', date);

    if (error) throw error;
    return data ?? [];
  },

  findRoutineLog: async (
    userId: string,
    routineId: string,
    date: string
  ): Promise<RoutineLogRow | null> => {
    const { data, error } = await supabase
      .from('routine_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('routine_id', routineId)
      .eq('log_date', date)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  createRoutineLog: async (data: RoutineLogInsert): Promise<RoutineLogRow | null> => {
    const { data: created, error } = await supabase
      .from('routine_logs')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  updateRoutineLog: async (
    logId: string,
    userId: string,
    data: RoutineLogUpdate
  ): Promise<RoutineLogRow | null> => {
    const { data: updated, error } = await supabase
      .from('routine_logs')
      .update(data)
      .eq('id', logId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  findStepLogsByRoutineLogId: async (routineLogId: string): Promise<RoutineStepLogRow[]> => {
    const { data, error } = await supabase
      .from('routine_step_logs')
      .select('*')
      .eq('routine_log_id', routineLogId);

    if (error) throw error;
    return data ?? [];
  },

  upsertStepLog: async (
    routineLogId: string,
    stepId: string,
    isCompleted: boolean
  ): Promise<RoutineStepLogRow> => {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('routine_step_logs')
      .upsert(
        {
          routine_log_id: routineLogId,
          step_id: stepId,
          is_completed: isCompleted,
          completed_at: isCompleted ? now : null,
          updated_at: now
        },
        { onConflict: 'routine_log_id,step_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
