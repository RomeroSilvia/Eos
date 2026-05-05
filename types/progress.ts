export type PeriodProgress = {
  percent: number;
  completedRoutines: number;
  totalRoutines: number;
  label: string;
};

export type WeeklyProgress = PeriodProgress;
export type MonthlyProgress = PeriodProgress;

export type StreakProgress = {
  currentDays: number;
  bestDays?: number;
  subtitle: string;
  weekProgress: WeekProgressDay[];
};

export type WeekProgressDay = {
  day: 'L' | 'M' | 'J' | 'V' | 'S' | 'D';
  completed: boolean;
};

export type CalendarDayStatus = 'completed' | 'partial' | 'pending' | 'empty';

export type CalendarDayProgress = {
  date: string;
  day: number;
  status: CalendarDayStatus;
};

export type ProgressMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export type ProgressHistoryItem = {
  id: string;
  date: string;
  routineName: string;
  completedSteps: number;
  totalSteps: number;
  status: CalendarDayStatus;
};

export type ProgressSummary = {
  weeklyProgress: WeeklyProgress;
  monthlyProgress: MonthlyProgress;
  streakProgress: StreakProgress;
  completedDays: number;
  calendarProgress: CalendarDayProgress[];
  metrics: ProgressMetric[];
  historyPreview: ProgressHistoryItem[];
};

export type RoutineDayProgress = {
  routine_id: string;
  date: string;
  completed_step_ids: string[];
  total_steps: number;
  completed_steps: number;
  percent: number;
};
