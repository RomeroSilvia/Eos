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
