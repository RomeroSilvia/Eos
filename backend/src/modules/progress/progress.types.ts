import type { Tables, TablesInsert, TablesUpdate } from '../../database/database.types';

export type RoutineLog = Tables<'routine_logs'>;
export type RoutineLogInsert = TablesInsert<'routine_logs'>;
export type RoutineLogUpdate = TablesUpdate<'routine_logs'>;
export type RoutineStepLog = Tables<'routine_step_logs'>;
export type RoutineStepLogInsert = TablesInsert<'routine_step_logs'>;
export type RoutineStepLogUpdate = TablesUpdate<'routine_step_logs'>;

export type PeriodProgress = {
  percent: number;
  completedRoutines: number;
  totalRoutines: number;
};

export type StreakProgress = {
  currentStreak: number;
  longestStreak?: number;
};

export type CalendarDayStatus = 'completed' | 'partial' | 'pending' | 'empty';

export type CalendarDayProgress = {
  date: string;
  status: CalendarDayStatus;
};

export type ProgressSummary = {
  userId?: string;
  completedRoutines?: number;
  totalRoutines?: number;
  completedDays?: number;
  currentStreak?: number;
  bestStreak?: number;
  completionRate?: number;
  weeklyProgress: PeriodProgress;
  monthlyProgress: PeriodProgress;
  streakProgress: StreakProgress;
  calendarProgress: CalendarDayProgress[];
};

export type ProgressHistoryItem = RoutineLog;

export type RoutineDayProgress = {
  routine_id: string;
  log_date: string;
  routine_log_id: string | null;
  completed_step_ids: string[];
  completion_percentage: number;
};
