import { apiRequest } from '@/services/api/client';
import type {
  CalendarDayProgress,
  CalendarDayStatus,
  DayProgressStatus,
  ProgressHistoryDay,
  ProgressHistoryItem,
  ProgressSummary,
  RoutineDayDetail,
  RoutineDayProgress,
  RoutineStats,
  StreakProgress,
  WeekProgressDay
} from '@/types/progress';
import { getProgressCTA } from '@/utils/progress';

type BackendPeriodProgress = {
  percent: number;
  completedRoutines: number;
  totalRoutines: number;
};

type BackendStreakProgress = {
  currentStreak: number;
  longestStreak?: number;
};

type BackendCalendarDayProgress = {
  date: string;
  status: CalendarDayStatus;
  dayStatus?: 'complete' | 'partial' | 'incomplete' | 'pending';
  completedRoutines?: number;
  totalRoutines?: number;
  completionPercentage?: number;
  isToday?: boolean;
  isDayFinished?: boolean;
};

type BackendProgressSummary = {
  userId?: string;
  completedRoutines?: number;
  totalRoutines?: number;
  completedDays?: number;
  currentStreak?: number;
  bestStreak?: number;
  completionRate?: number;
  weeklyProgress?: BackendPeriodProgress;
  monthlyProgress?: BackendPeriodProgress;
  streakProgress?: BackendStreakProgress;
  calendarProgress?: BackendCalendarDayProgress[];
};

type BackendRoutineLog = {
  id: string;
  user_id: string;
  routine_id: string;
  log_date: string;
  completed_at: string | null;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
};

export async function getProgressSummary(): Promise<ProgressSummary> {

  const today = getTodayIsoDate();
  const [summary, history] = await Promise.all([
    apiRequest<BackendProgressSummary>({ path: '/progress/summary' }),
    getProgressHistory()
  ]);

  return mapBackendSummaryToProgressSummary(summary, history);
}

export async function getProgressHistoryByDate(date: string): Promise<ProgressHistoryItem[]> {

  const logs = await apiRequest<BackendRoutineLog[]>({
    path: `/progress/history?date=${encodeURIComponent(date)}`
  });

  return logs.map(mapRoutineLogToHistoryItem);
}

export async function getProgressHistory(): Promise<ProgressHistoryDay[]> {

  const history = await apiRequest<ProgressHistoryDay[]>({
    path: '/progress/history/all'
  });

  return [...history].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getProgressDayDetail(date: string): Promise<RoutineDayDetail> {

  return apiRequest<RoutineDayDetail>({
    path: `/progress/day/${encodeURIComponent(date)}`
  });
}

export async function getProgressStats(): Promise<RoutineStats> {

  return apiRequest<RoutineStats>({
    path: '/progress/stats'
  });
}

export async function getWeeklyProgress() {
  return (await getProgressSummary()).weeklyProgress;
}

export async function getStreakProgress() {
  return (await getProgressSummary()).streakProgress;
}

export async function getCalendarProgress() {
  return (await getProgressSummary()).calendarProgress;
}

function mapBackendSummaryToProgressSummary(
  backendSummary: BackendProgressSummary,
  history: ProgressHistoryDay[]
): ProgressSummary {
  const weeklyProgress = backendSummary.weeklyProgress ?? {
    percent: backendSummary.completionRate ?? 0,
    completedRoutines: backendSummary.completedRoutines ?? 0,
    totalRoutines: backendSummary.completedRoutines ?? 0
  };

  const monthlyProgress = backendSummary.monthlyProgress ?? weeklyProgress;
  const calendarProgress = (backendSummary.calendarProgress ?? []).map(mapCalendarDay);
  const streakProgress = mapStreakProgress(backendSummary, calendarProgress);
  const completedDays = backendSummary.completedDays ?? calendarProgress.filter((day) => day.status === 'completed').length;
  const progressCTA = getProgressCTA({
    overallProgressPercentage: monthlyProgress.percent,
    todayStatus: getTodayProgressStatus(calendarProgress),
    completedTodayRoutines: getTodayProgressDay(calendarProgress)?.completedRoutines ?? 0,
    totalTodayRoutines: getTodayProgressDay(calendarProgress)?.totalRoutines ?? 0,
    hasPreviousProgress: monthlyProgress.completedRoutines > 0 || completedDays > 0 || streakProgress.currentDays > 0,
    streak: streakProgress.currentDays,
    previousDayStatus: getPreviousDayProgressStatus(calendarProgress)
  });

  return {
    weeklyProgress: {
      ...weeklyProgress,
      label: formatRoutineCompletionLabel(weeklyProgress.completedRoutines, weeklyProgress.totalRoutines)
    },
    monthlyProgress: {
      ...monthlyProgress,
      label: `${completedDays} dias con rutina registrada`
    },
    streakProgress,
    progressCTA,
    completedDays,
    calendarProgress,
    metrics: [
      {
        id: 'completed-days',
        label: 'Dias completos',
        value: String(completedDays),
        detail: 'este mes'
      },
      {
        id: 'best-streak',
        label: 'Mejor racha',
        value: String(streakProgress.bestDays ?? 0),
        detail: 'dias'
      }
    ],
    historyPreview: mapHistoryDaysToPreviewItems(history)
  };
}

function getTodayProgressDay(calendarProgress: CalendarDayProgress[]): CalendarDayProgress | undefined {
  return calendarProgress.find((day) => day.isToday);
}

function getTodayProgressStatus(calendarProgress: CalendarDayProgress[]): DayProgressStatus {
  const today = getTodayProgressDay(calendarProgress);
  return today?.dayStatus ?? mapCalendarStatusToDayProgressStatus(today?.status);
}

function getPreviousDayProgressStatus(calendarProgress: CalendarDayProgress[]): DayProgressStatus | undefined {
  const today = getTodayProgressDay(calendarProgress);

  if (!today) {
    return undefined;
  }

  const previousDay = [...calendarProgress]
    .filter((day) => day.date < today.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  return previousDay?.dayStatus ?? mapCalendarStatusToDayProgressStatus(previousDay?.status);
}

function mapCalendarStatusToDayProgressStatus(status?: CalendarDayStatus): DayProgressStatus {
  if (status === 'completed') {
    return 'complete';
  }

  if (status === 'partial') {
    return 'partial';
  }

  if (status === 'pending') {
    return 'pending';
  }

  return 'incomplete';
}

function formatRoutineCompletionLabel(completedRoutines: number, totalRoutines: number): string {
  if (totalRoutines === 0) {
    return 'Todavía no tenés rutinas configuradas para esta semana';
  }

  const routineText = completedRoutines === 1 ? 'rutina completada' : 'rutinas completadas';
  return `${completedRoutines} de ${totalRoutines} ${routineText}`;
}

function mapCalendarDay(day: BackendCalendarDayProgress): CalendarDayProgress {
  return {
    date: day.date,
    day: Number(day.date.slice(8, 10)),
    status: day.status,
    dayStatus: day.dayStatus,
    completedRoutines: day.completedRoutines ?? (day.status === 'completed' ? 1 : 0),
    totalRoutines: day.totalRoutines ?? (day.status === 'empty' ? 0 : 1),
    completionPercentage: day.completionPercentage ?? (day.status === 'completed' ? 100 : 0),
    isToday: day.isToday ?? day.date === getTodayIsoDate(),
    isDayFinished: day.isDayFinished ?? day.date < getTodayIsoDate()
  };
}

function mapStreakProgress(
  backendSummary: BackendProgressSummary,
  calendarProgress: CalendarDayProgress[]
): StreakProgress {
  const currentDays = backendSummary.streakProgress?.currentStreak ?? backendSummary.currentStreak ?? 0;
  const bestDays = backendSummary.streakProgress?.longestStreak ?? backendSummary.bestStreak ?? 0;

  return {
    currentDays,
    bestDays,
    subtitle: currentDays > 0 ? '¡Seguí así!' : 'Empezá tu racha',
    weekProgress: buildWeekProgress(calendarProgress)
  };
}

function buildWeekProgress(calendarProgress: CalendarDayProgress[]): WeekProgressDay[] {
  const weekLabels: WeekProgressDay['day'][] = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const today = new Date();
  const monday = getMonday(today);

  return weekLabels.map((day, index) => {
    const date = addDays(monday, index);
    const dateKey = toIsoDate(date);
    const progressDay = calendarProgress.find((item) => item.date === dateKey);

    return {
      day,
      completed: progressDay?.status === 'completed'
    };
  });
}

function mapRoutineLogToHistoryItem(log: BackendRoutineLog): ProgressHistoryItem {
  const status = getStatusFromCompletion(log.completion_percentage);

  return {
    id: log.id,
    date: log.log_date,
    routineName: 'Rutina sin nombre',
    completedSteps: Math.round(log.completion_percentage),
    totalSteps: 100,
    status
  };
}

function mapHistoryDaysToPreviewItems(history: ProgressHistoryDay[]): ProgressHistoryItem[] {
  return history.flatMap((day) =>
    day.routines.map((routine) => ({
      id: `${day.date}-${routine.routineId}`,
      date: day.date,
      routineName: routine.routineName || 'Rutina sin nombre',
      completedSteps: routine.completedSteps,
      totalSteps: routine.totalSteps,
      status: mapDayRoutineStatusToCalendarStatus(routine.status)
    }))
  ).slice(0, 3);
}

function mapDayRoutineStatusToCalendarStatus(status: ProgressHistoryDay['routines'][number]['status']): CalendarDayStatus {
  if (status === 'complete') {
    return 'completed';
  }

  if (status === 'partial') {
    return 'partial';
  }

  return 'pending';
}

function getStatusFromCompletion(completionPercentage: number): CalendarDayStatus {
  if (completionPercentage >= 100) {
    return 'completed';
  }

  if (completionPercentage > 0) {
    return 'partial';
  }

  return 'pending';
}

function getTodayIsoDate(): string {
  return toIsoDate(new Date());
}

function getMonday(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getRoutineDayProgress(routineId: string): Promise<RoutineDayProgress> {

  return apiRequest<RoutineDayProgress>({
    path: `/progress/routines/${routineId}/today`,
    method: 'GET'
  });
}

export async function setRoutineStepCompletion(data: {
  routineId: string;
  stepId: string;
  isCompleted: boolean;
}): Promise<RoutineDayProgress> {

  return apiRequest<RoutineDayProgress>({
    path: `/progress/routines/${data.routineId}/today/steps/${data.stepId}`,
    method: 'PATCH',
    body: JSON.stringify({
      is_completed: data.isCompleted
    })
  });
}
