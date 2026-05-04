import type { CalendarDayProgress, StreakProgress, WeeklyProgress } from '@/types/progress';
import type { RoutineDayProgress } from '@/types/progress';
import { apiRequest } from '@/services/api/client';

export const mockWeeklyProgress: WeeklyProgress = {
  percent: 78,
  completedRoutines: 11,
  totalRoutines: 14,
  label: '11 de 14 rutinas completadas'
};

export const mockStreakProgress: StreakProgress = {
  currentDays: 5,
  bestDays: 8
};

export const mockCalendarProgress: CalendarDayProgress[] = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  const status = day % 6 === 0 ? 'pending' : day % 4 === 0 ? 'partial' : day <= 18 ? 'completed' : 'empty';

  return {
    date: `2026-05-${String(day).padStart(2, '0')}`,
    day,
    status
  };
});

export async function getWeeklyProgress(): Promise<WeeklyProgress> {
  return mockWeeklyProgress;
}

export async function getStreakProgress(): Promise<StreakProgress> {
  return mockStreakProgress;
}

export async function getCalendarProgress(): Promise<CalendarDayProgress[]> {
  return mockCalendarProgress;
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
