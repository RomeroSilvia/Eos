import { apiConfig, apiRequest } from '@/services/api/client';
import type {
  CalendarDayProgress,
  CalendarDayStatus,
  ProgressHistoryItem,
  ProgressSummary,
  StreakProgress,
  WeekProgressDay
} from '@/types/progress';

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

const defaultProgressUserId = process.env.EXPO_PUBLIC_PROGRESS_USER_ID ?? 'user-marta';

export const mockProgressSummary: ProgressSummary = {
  weeklyProgress: {
    percent: 78,
    completedRoutines: 11,
    totalRoutines: 14,
    label: '11 de 14 rutinas completadas'
  },
  monthlyProgress: {
    percent: 64,
    completedRoutines: 18,
    totalRoutines: 28,
    label: '18 dias con rutina registrada'
  },
  streakProgress: {
    currentDays: 5,
    bestDays: 9,
    subtitle: '¡Seguí así!',
    weekProgress: [
      { day: 'L', completed: true },
      { day: 'M', completed: true },
      { day: 'M', completed: true },
      { day: 'J', completed: true },
      { day: 'V', completed: true },
      { day: 'S', completed: true },
      { day: 'D', completed: false }
    ]
  },
  completedDays: 18,
  calendarProgress: Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const completedDays = new Set([1, 2, 4, 5, 6, 8, 9, 10, 13, 14, 16, 17, 18, 21, 22, 23, 24, 25]);
    const partialDays = new Set([3, 7, 15, 20, 26]);
    const pendingDays = new Set([11, 12, 19]);
    const status = completedDays.has(day)
      ? 'completed'
      : partialDays.has(day)
        ? 'partial'
        : pendingDays.has(day)
          ? 'pending'
          : 'empty';

    return {
      date: `2026-05-${String(day).padStart(2, '0')}`,
      day,
      status
    };
  }),
  metrics: [
    {
      id: 'completed-days',
      label: 'Dias completos',
      value: '18',
      detail: 'este mes'
    },
    {
      id: 'best-streak',
      label: 'Mejor racha',
      value: '9',
      detail: 'dias'
    }
  ],
  historyPreview: [
    {
      id: 'history-1',
      date: 'Hoy',
      routineName: 'Rutina matutina',
      completedSteps: 4,
      totalSteps: 4,
      status: 'completed'
    },
    {
      id: 'history-2',
      date: 'Ayer',
      routineName: 'Rutina de noche',
      completedSteps: 3,
      totalSteps: 4,
      status: 'partial'
    },
    {
      id: 'history-3',
      date: 'Domingo',
      routineName: 'Proteccion solar',
      completedSteps: 0,
      totalSteps: 2,
      status: 'pending'
    }
  ]
};

export async function getProgressSummary(userId = defaultProgressUserId): Promise<ProgressSummary> {
  if (apiConfig.useMocks) {
    return mockProgressSummary;
  }

  const today = getTodayIsoDate();
  const [summary, history] = await Promise.all([
    apiRequest<BackendProgressSummary>({ path: `/progress/summary/${userId}` }),
    getProgressHistoryByDate(userId, today)
  ]);

  return mapBackendSummaryToProgressSummary(summary, history);
}

export async function getProgressHistoryByDate(userId: string, date: string): Promise<ProgressHistoryItem[]> {
  if (apiConfig.useMocks) {
    return mockProgressSummary.historyPreview;
  }

  const logs = await apiRequest<BackendRoutineLog[]>({
    path: `/progress/history/${userId}?date=${encodeURIComponent(date)}`
  });

  return logs.map(mapRoutineLogToHistoryItem);
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
  historyPreview: ProgressHistoryItem[]
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

  return {
    weeklyProgress: {
      ...weeklyProgress,
      label: `${weeklyProgress.completedRoutines} de ${weeklyProgress.totalRoutines} rutinas completadas`
    },
    monthlyProgress: {
      ...monthlyProgress,
      label: `${completedDays} dias con rutina registrada`
    },
    streakProgress,
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
    historyPreview
  };
}

function mapCalendarDay(day: BackendCalendarDayProgress): CalendarDayProgress {
  return {
    date: day.date,
    day: Number(day.date.slice(8, 10)),
    status: day.status
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
    routineName: `Rutina ${log.routine_id.slice(0, 8)}`,
    completedSteps: Math.round(log.completion_percentage),
    totalSteps: 100,
    status
  };
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
