import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';
import type { RoutineLog, RoutineStepLog } from './progress.types';

export const progressRepository = {
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
  }
};
