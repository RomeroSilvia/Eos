import type { ProgressSummary } from '@/types/progress';

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
