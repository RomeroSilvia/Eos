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
export type DayProgressStatus = 'complete' | 'partial' | 'incomplete' | 'pending';

export type CalendarDayProgress = {
  date: string;
  day: number;
  status: CalendarDayStatus;
  dayStatus?: DayProgressStatus;
  completedRoutines: number;
  totalRoutines: number;
  completionPercentage: number;
  isToday: boolean;
  isDayFinished: boolean;
};

export type ProgressMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export type ProgressCTATarget = 'todayRoutine' | 'progressHistory' | 'routineDetail';

export type ProgressCTA = {
  label: string;
  description?: string;
  target: ProgressCTATarget;
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
  progressCTA: ProgressCTA;
  completedDays: number;
  calendarProgress: CalendarDayProgress[];
  metrics: ProgressMetric[];
  historyPreview: ProgressHistoryItem[];
};

export type RoutineDayProgress = {
  routine_id: string;
  log_date: string;
  routine_log_id: string | null;
  completed_step_ids: string[];
  completion_percentage: number;
};

export type RoutineDayDetail = {
  date: string;
  status: DayProgressStatus;
  completionPercentage: number;
  completedRoutines: number;
  totalRoutines: number;
  routines: {
    id: string;
    name: string;
    timeOfDay?: 'morning' | 'night' | 'custom';
    status: 'complete' | 'partial' | 'pending';
    completedSteps: number;
    totalSteps: number;
    steps: {
      id: string;
      name: string;
      completed: boolean;
      productName?: string;
    }[];
  }[];
};
