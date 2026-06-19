import { apiRequest, apiConfig } from '@/services/api/client';
import type { ProgressSummary, RoutineDayProgress } from '@/types/progress';

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
    label: 'Ver historial completo',
    description: 'Revisa tu progreso diario y semanal',
    target: 'progressHistory'
  },
  completedDays: 18,
  calendarProgress: Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const today = new Date();
    const todayDay = today.getDate();
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
      completedRoutines: status === 'completed' ? 1 : status === 'partial' ? 1 : 0,
      totalRoutines: status === 'empty' ? 0 : 1,
      completionPercentage: status === 'completed' ? 100 : status === 'partial' ? 50 : 0,
      isToday: day === todayDay,
      isDayFinished: day < todayDay
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

export async function getProgressSummary(): Promise<ProgressSummary> {
  return mockProgressSummary;
}

export async function getWeeklyProgress() {
  return mockProgressSummary.weeklyProgress;
}

export async function getStreakProgress() {
  return mockProgressSummary.streakProgress;
}

export async function getCalendarProgress() {
  return mockProgressSummary.calendarProgress;
}

const mockRoutineDayProgress: RoutineDayProgress = {
  routine_id: 'routine-1',
  routine_log_id: 'routine-log-1',
  log_date: new Date().toISOString().split('T')[0],
  completed_step_ids: ['step-1', 'step-2'],
  completion_percentage: 67
};

export async function getRoutineDayProgress(routineId: string): Promise<RoutineDayProgress> {
  if (apiConfig.useMocks) {
    return { ...mockRoutineDayProgress, routine_id: routineId };
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
    const progress = { ...mockRoutineDayProgress, routine_id: data.routineId };
    if (data.isCompleted && !progress.completed_step_ids.includes(data.stepId)) {
      progress.completed_step_ids.push(data.stepId);
    } else if (!data.isCompleted) {
      progress.completed_step_ids = progress.completed_step_ids.filter((id) => id !== data.stepId);
    }
    return progress;
  }
  return apiRequest<RoutineDayProgress>({
    path: `/progress/routines/${data.routineId}/today/steps/${data.stepId}`,
    method: 'PATCH',
    body: JSON.stringify({
      is_completed: data.isCompleted
    })
  });
}
