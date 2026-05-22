import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';
import type {
  RoutineForProgress,
  RoutineLog,
  RoutineLogInsert,
  RoutineLogUpdate,
  RoutineStepForProgress,
  RoutineStepLog,
  RoutineStepLogInsert,
  RoutineStepLogUpdate
} from './progress.types';

export const progressRepository = {
  findActiveRoutinesByUserId: async (userId: string): Promise<RoutineForProgress[]> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routines)
      .select('id, name, time_of_day, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  findRoutinesByIds: async (userId: string, routineIds: string[]): Promise<RoutineForProgress[]> => {
    if (routineIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAMES.routines)
      .select('id, name, time_of_day, created_at')
      .eq('user_id', userId)
      .in('id', routineIds);

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  findRoutineLogsByUserId: async (userId: string): Promise<RoutineLog[]> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routineLogs)
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  findRoutineLogsByUserIdBetweenDates: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<RoutineLog[]> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routineLogs)
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  findRoutineLogsByUserIdAndDate: async (userId: string, date: string): Promise<RoutineLog[]> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routineLogs)
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', date)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  findRoutineLogByRoutineIdAndDate: async (
    userId: string,
    routineId: string,
    date: string
  ): Promise<RoutineLog | null> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routineLogs)
      .select('*')
      .eq('user_id', userId)
      .eq('routine_id', routineId)
      .eq('log_date', date)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ?? null;
  },

  createRoutineLog: async (log: RoutineLogInsert): Promise<RoutineLog> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routineLogs)
      .insert(log)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  updateRoutineLog: async (routineLogId: string, updates: RoutineLogUpdate): Promise<RoutineLog> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routineLogs)
      .update(updates)
      .eq('id', routineLogId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  findStepLogsByRoutineLogId: async (routineLogId: string): Promise<RoutineStepLog[]> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routineStepLogs)
      .select('*')
      .eq('routine_log_id', routineLogId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  findStepLogsByRoutineLogIds: async (routineLogIds: string[]): Promise<RoutineStepLog[]> => {
    if (routineLogIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAMES.routineStepLogs)
      .select('*')
      .in('routine_log_id', routineLogIds)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  findRoutineStepsByRoutineIds: async (routineIds: string[]): Promise<RoutineStepForProgress[]> => {
    if (routineIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAMES.routineSteps)
      .select('id, routine_id, name, step_order')
      .in('routine_id', routineIds)
      .order('step_order', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  findStepLogByRoutineLogIdAndStepId: async (
    routineLogId: string,
    stepId: string
  ): Promise<RoutineStepLog | null> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routineStepLogs)
      .select('*')
      .eq('routine_log_id', routineLogId)
      .eq('step_id', stepId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ?? null;
  },

  createStepLog: async (stepLog: RoutineStepLogInsert): Promise<RoutineStepLog> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routineStepLogs)
      .insert(stepLog)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  updateStepLog: async (stepLogId: string, updates: RoutineStepLogUpdate): Promise<RoutineStepLog> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routineStepLogs)
      .update(updates)
      .eq('id', stepLogId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  countRoutineSteps: async (routineId: string): Promise<number> => {
    const { count, error } = await supabase
      .from(TABLE_NAMES.routineSteps)
      .select('id', { count: 'exact', head: true })
      .eq('routine_id', routineId);

    if (error) {
      throw error;
    }

    return count ?? 0;
  }
};
