export type WeeklyProgress = {
  percent: number;
  completedRoutines: number;
  totalRoutines: number;
  label: string;
};

export type StreakProgress = {
  currentDays: number;
  bestDays?: number;
};

export type CalendarDayStatus = 'completed' | 'partial' | 'pending' | 'empty';

export type CalendarDayProgress = {
  date: string;
  day: number;
  status: CalendarDayStatus;
};

export type RoutineStepLog = {
  id: string;
  routine_log_id: string;
  step_id: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoutineLog = {
  id: string;
  user_id: string;
  routine_id: string;
  log_date: string;
  completed_at: string | null;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
};

export type RoutineDayProgress = {
  routine_log: RoutineLog;
  step_logs: RoutineStepLog[];
  completed_step_ids: string[];
  completion_percentage: number;
};
