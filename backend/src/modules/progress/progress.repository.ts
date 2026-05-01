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
    // TODO: Implement Supabase query to calculate progress summary by user id.
    return null;
  },

  findHistoryByDate: async (_userId: string, _date: string): Promise<RoutineLogRow[]> => {
    // TODO: Implement Supabase query to get routine logs for a specific date.
    return [];
  },

  createRoutineLog: async (_data: RoutineLogInsert): Promise<RoutineLogRow | null> => {
    // TODO: Implement Supabase query to create a routine log.
    return null;
  },

  updateRoutineLog: async (_logId: string, _userId: string, _data: RoutineLogUpdate): Promise<RoutineLogRow | null> => {
    // TODO: Implement Supabase query to update a routine log by id and user id.
    return null;
  },

  findStepLogsByRoutineLogId: async (_routineLogId: string): Promise<RoutineStepLogRow[]> => {
    // TODO: Implement Supabase query to get step logs by routine log id.
    return [];
  }
};
