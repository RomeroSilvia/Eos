import type { Tables } from '../../database/database.types';

export type RoutineLog = Tables<'routine_logs'>;
export type RoutineStepLog = Tables<'routine_step_logs'>;

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
