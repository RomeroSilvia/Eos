import { apiRequest } from '@/services/api/client';
import type {
  CalendarDayProgress,
  ProgressHistoryDay,
  ProgressSummary,
  RoutineDayDetail,
  RoutineDayProgress,
  RoutineStats
} from '@/types/progress';

type BackendProgressSummary = {
  weeklyProgress: Omit<ProgressSummary['weeklyProgress'], 'label'>;
  monthlyProgress: Omit<ProgressSummary['monthlyProgress'], 'label'>;
  streakProgress: {
    currentStreak: number;
    longestStreak: number;
  };
  completedDays: number;
  calendarProgress: Array<Omit<CalendarDayProgress, 'day'> & { day?: number }>;
};

export async function getProgressSummary(): Promise<ProgressSummary> {
  const [summary, history] = await Promise.all([
    apiRequest<BackendProgressSummary>({
      path: '/progress/summary',
      method: 'GET'
    }),
    getProgressHistory()
  ]);

  return mapProgressSummary(summary, history);
}

export async function getWeeklyProgress(): Promise<ProgressSummary['weeklyProgress']> {
  const summary = await getProgressSummary();
  return summary.weeklyProgress;
}

export async function getStreakProgress(): Promise<ProgressSummary['streakProgress']> {
  const summary = await getProgressSummary();
  return summary.streakProgress;
}

export async function getCalendarProgress(): Promise<ProgressSummary['calendarProgress']> {
  const summary = await getProgressSummary();
  return summary.calendarProgress;
}

export async function getProgressHistory(): Promise<ProgressHistoryDay[]> {
  return apiRequest<ProgressHistoryDay[]>({
    path: '/progress/history/all',
    method: 'GET'
  });
}

export async function getProgressDayDetail(date: string): Promise<RoutineDayDetail> {
  return apiRequest<RoutineDayDetail>({
    path: `/progress/day/${encodeURIComponent(date)}`,
    method: 'GET'
  });
}

export async function getProgressStats(): Promise<RoutineStats> {
  return apiRequest<RoutineStats>({
    path: '/progress/stats',
    method: 'GET'
  });
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

function mapProgressSummary(summary: BackendProgressSummary, history: ProgressHistoryDay[]): ProgressSummary {
  const calendarProgress = summary.calendarProgress.map((day) => ({
    ...day,
    day: day.day ?? new Date(`${day.date}T00:00:00.000Z`).getUTCDate()
  }));

  return {
    weeklyProgress: {
      ...summary.weeklyProgress,
      label: formatRoutineCount(summary.weeklyProgress.completedRoutines, summary.weeklyProgress.totalRoutines)
    },
    monthlyProgress: {
      ...summary.monthlyProgress,
      label: `${summary.completedDays} dias con rutina registrada`
    },
    streakProgress: {
      currentDays: summary.streakProgress.currentStreak,
      bestDays: summary.streakProgress.longestStreak,
      subtitle: getStreakSubtitle(summary.streakProgress.currentStreak),
      weekProgress: buildWeekProgress(calendarProgress)
    },
    progressCTA: {
      label: 'Ver historial completo',
      description: 'Revisa tu progreso diario y semanal',
      target: 'progressHistory'
    },
    completedDays: summary.completedDays,
    calendarProgress,
    metrics: [
      {
        id: 'completed-days',
        label: 'Dias completos',
        value: String(summary.completedDays),
        detail: 'este mes'
      },
      {
        id: 'best-streak',
        label: 'Mejor racha',
        value: String(summary.streakProgress.longestStreak),
        detail: 'dias'
      }
    ],
    historyPreview: buildHistoryPreview(history)
  };
}

function formatRoutineCount(completed: number, total: number): string {
  const suffix = completed === 1 ? 'rutina completada' : 'rutinas completadas';
  return `${completed} de ${total} ${suffix}`;
}

function getStreakSubtitle(currentStreak: number): string {
  if (currentStreak <= 0) {
    return 'Comenza completando una rutina hoy.';
  }

  return 'Segui asi.';
}

function buildWeekProgress(calendarProgress: CalendarDayProgress[]): ProgressSummary['streakProgress']['weekProgress'] {
  const labels: ProgressSummary['streakProgress']['weekProgress'][number]['day'][] = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const lastSevenDays = calendarProgress.slice(-7);

  return labels.map((day, index) => ({
    day,
    completed: lastSevenDays[index]?.status === 'completed'
  }));
}

function buildHistoryPreview(history: ProgressHistoryDay[]): ProgressSummary['historyPreview'] {
  return history
    .flatMap((day) =>
      day.routines.map((routine) => ({
        id: `${day.date}-${routine.routineId}`,
        date: day.date,
        routineName: routine.routineName,
        completedSteps: routine.completedSteps,
        totalSteps: routine.totalSteps,
        status: mapDayRoutineStatusToCalendarStatus(routine.status)
      }))
    )
    .slice(0, 3);
}

function mapDayRoutineStatusToCalendarStatus(status: ProgressHistoryDay['routines'][number]['status']): ProgressSummary['historyPreview'][number]['status'] {
  if (status === 'complete') return 'completed';
  if (status === 'partial') return 'partial';
  return 'pending';
}
