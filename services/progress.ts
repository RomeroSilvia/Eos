import { apiConfig, apiRequest } from '@/services/api/client';
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

const defaultProgressUserId = process.env.EXPO_PUBLIC_PROGRESS_USER_ID ?? '11111111-1111-1111-1111-111111111111';

const mockRoutineDayProgress: RoutineDayProgress = {
  routine_id: 'routine-mock',
  log_date: getTodayIsoDate(),
  routine_log_id: null,
  completed_step_ids: [],
  completion_percentage: 0
};

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
  progressCTA: {
    label: 'Terminá tu rutina de hoy',
    description: 'Ya empezaste, falta poco',
    target: 'todayRoutine'
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
      status,
      completedRoutines: status === 'completed' ? 2 : status === 'partial' ? 1 : 0,
      totalRoutines: status === 'empty' ? 0 : 2,
      completionPercentage: status === 'completed' ? 100 : status === 'partial' ? 50 : 0,
      isToday: day === Number(getTodayIsoDate().slice(8, 10)),
      isDayFinished: `2026-05-${String(day).padStart(2, '0')}` < getTodayIsoDate()
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
    getProgressHistory(userId)
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

export async function getProgressHistory(userId = defaultProgressUserId): Promise<ProgressHistoryDay[]> {
  if (apiConfig.useMocks) {
    return mockProgressSummary.historyPreview.map((item) => ({
      date: item.date === 'Hoy' ? getTodayIsoDate() : '2026-05-20',
      status: item.status === 'completed' ? 'complete' : item.status === 'empty' ? 'incomplete' : item.status,
      completionPercentage: item.status === 'completed' ? 100 : item.status === 'partial' ? 50 : 0,
      completedRoutines: item.status === 'completed' ? 1 : 0,
      totalExpectedRoutines: 1,
      routines: [
        {
          routineId: item.id,
          routineName: item.routineName,
          status: item.status === 'completed' ? 'complete' : item.status === 'partial' ? 'partial' : 'pending',
          completedSteps: item.completedSteps,
          totalSteps: item.totalSteps
        }
      ]
    }));
  }

  const history = await apiRequest<ProgressHistoryDay[]>({
    path: `/progress/history/${userId}/all`
  });

  return [...history].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getProgressDayDetail(date: string, userId = defaultProgressUserId): Promise<RoutineDayDetail> {
  if (apiConfig.useMocks) {
    return {
      date,
      status: 'partial',
      completionPercentage: 50,
      completedRoutines: 1,
      totalRoutines: 2,
      routines: [
        {
          id: 'mock-morning',
          name: 'Rutina de mañana',
          timeOfDay: 'morning',
          status: 'complete',
          completedSteps: 3,
          totalSteps: 3,
          steps: [
            { id: 'mock-cleanser', name: 'Limpieza', completed: true },
            { id: 'mock-moisturizer', name: 'Hidratante', completed: true },
            { id: 'mock-sunscreen', name: 'Protector solar', completed: true }
          ]
        },
        {
          id: 'mock-night',
          name: 'Rutina de noche',
          timeOfDay: 'night',
          status: 'pending',
          completedSteps: 0,
          totalSteps: 3,
          steps: [
            { id: 'mock-night-cleanser', name: 'Limpieza', completed: false },
            { id: 'mock-serum', name: 'Sérum', completed: false },
            { id: 'mock-night-moisturizer', name: 'Hidratante', completed: false }
          ]
        }
      ]
    };
  }

  return apiRequest<RoutineDayDetail>({
    path: `/progress/day/${userId}/${encodeURIComponent(date)}`
  });
}

export async function getProgressStats(userId = defaultProgressUserId): Promise<RoutineStats> {
  if (apiConfig.useMocks) {
    return {
      weekly: {
        completionPercentage: mockProgressSummary.weeklyProgress.percent,
        completedRoutines: mockProgressSummary.weeklyProgress.completedRoutines,
        totalExpectedRoutines: mockProgressSummary.weeklyProgress.totalRoutines,
        currentStreak: mockProgressSummary.streakProgress.currentDays,
        bestStreak: mockProgressSummary.streakProgress.bestDays ?? 0
      },
      monthly: {
        completionPercentage: mockProgressSummary.monthlyProgress.percent,
        completedRoutines: mockProgressSummary.monthlyProgress.completedRoutines,
        totalExpectedRoutines: mockProgressSummary.monthlyProgress.totalRoutines,
        completeDays: mockProgressSummary.calendarProgress.filter((day) => day.status === 'completed').length,
        partialDays: mockProgressSummary.calendarProgress.filter((day) => day.status === 'partial').length,
        incompleteDays: mockProgressSummary.calendarProgress.filter((day) => day.status === 'pending').length,
        noRoutineDays: mockProgressSummary.calendarProgress.filter((day) => day.status === 'empty').length
      },
      weekDays: mockProgressSummary.calendarProgress.slice(0, 7).map((day) => ({
        date: day.date,
        dayLabel: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][day.day % 7],
        status: day.status === 'completed' ? 'complete' : day.status === 'empty' ? 'no_routine' : day.status,
        completedRoutines: day.completedRoutines,
        totalExpectedRoutines: day.totalRoutines,
        completionPercentage: day.completionPercentage
      })),
      routinesRanking: [
        {
          routineId: 'mock-morning',
          routineName: 'Rutina de mañana',
          timeOfDay: 'morning',
          completedCount: 6,
          expectedCount: 7,
          completionPercentage: 86
        },
        {
          routineId: 'mock-night',
          routineName: 'Rutina de noche',
          timeOfDay: 'night',
          completedCount: 4,
          expectedCount: 7,
          completionPercentage: 57
        }
      ],
      products: {
        weekly: {
          totalProductUses: 11,
          distinctProductsUsed: 4,
          mostUsedProduct: {
            productId: 'mock-sunscreen',
            name: 'Protector solar',
            category: 'sunscreen',
            uses: 5
          }
        },
        monthly: {
          totalProductUses: 34,
          distinctProductsUsed: 6
        },
        productRanking: [
          {
            productId: 'mock-sunscreen',
            name: 'Protector solar',
            category: 'sunscreen',
            weeklyUses: 5,
            monthlyUses: 14,
            totalUses: 14,
            usagePercentage: 41
          },
          {
            productId: 'mock-cleanser',
            name: 'Limpiador facial',
            category: 'cleanser',
            weeklyUses: 4,
            monthlyUses: 12,
            totalUses: 12,
            usagePercentage: 35
          }
        ],
        categoryStats: [
          { category: 'sunscreen', uses: 14, percentage: 41 },
          { category: 'cleanser', uses: 12, percentage: 35 }
        ],
        routineProductUsage: [
          {
            routineId: 'mock-morning',
            routineName: 'Rutina de mañana',
            products: [
              { productId: 'mock-sunscreen', name: 'Protector solar', category: 'sunscreen', uses: 14 },
              { productId: 'mock-cleanser', name: 'Limpiador facial', category: 'cleanser', uses: 6 }
            ]
          },
          {
            routineId: 'mock-night',
            routineName: 'Rutina de noche',
            products: [{ productId: 'mock-cleanser', name: 'Limpiador facial', category: 'cleanser', uses: 6 }]
          }
        ],
        unusedProducts: [
          {
            productId: 'mock-mask',
            name: 'Mascarilla hidratante',
            category: 'mask',
            lastUsedAt: '2026-04-18'
          }
        ]
      }
    };
  }

  return apiRequest<RoutineStats>({
    path: `/progress/stats/${userId}`
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
  if (apiConfig.useMocks) {
    return {
      ...mockRoutineDayProgress,
      routine_id: routineId,
      log_date: getTodayIsoDate()
    };
  }

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
  if (apiConfig.useMocks) {
    const completedStepIds = data.isCompleted ? [data.stepId] : [];

    return {
      ...mockRoutineDayProgress,
      routine_id: data.routineId,
      log_date: getTodayIsoDate(),
      completed_step_ids: completedStepIds,
      completion_percentage: completedStepIds.length > 0 ? 100 : 0
    };
  }

  return apiRequest<RoutineDayProgress>({
    path: `/progress/routines/${data.routineId}/today/steps/${data.stepId}`,
    method: 'PATCH',
    body: JSON.stringify({
      is_completed: data.isCompleted
    })
  });
}
