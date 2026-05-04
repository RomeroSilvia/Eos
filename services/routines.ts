import type { Routine, RoutineStep } from '@/types/routine';
import { apiRequest } from '@/services/api/client';

export async function getRoutines(): Promise<Routine[]> {
  return apiRequest<Routine[]>({
    path: '/routines',
    method: 'GET'
  });
}

export async function getActiveRoutine(): Promise<Routine | null> {
  const routines = await getRoutines();
  const activeRoutine = routines
    .filter((routine) => routine.is_active)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

  if (!activeRoutine) return null;

  return getRoutineById(activeRoutine.id);
}

export async function createRoutine(data: {
  name: string;
  description?: string;
  time_of_day?: string | null;
}): Promise<Routine> {
  const res = await apiRequest<Routine>({
    path: '/routines',
    method: 'POST',
    body: JSON.stringify(data)
  });

  return res;
}

export async function updateRoutine(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    time_of_day?: 'morning' | 'night' | 'custom';
    is_active?: boolean;
  }
): Promise<Routine> {
  return apiRequest<Routine>({
    path: `/routines/${id}`,
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteRoutine(id: string): Promise<void> {
  await apiRequest<void>({
    path: `/routines/${id}`,
    method: 'DELETE'
  });
}

export async function createStep(data: {
  routine_id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  step_order?: number;
}): Promise<RoutineStep> {
  const { routine_id, ...step } = data;

  return apiRequest<RoutineStep>({
    path: `/routines/${routine_id}/steps`,
    method: 'POST',
    body: JSON.stringify(step)
  });
}

export async function getStepsByRoutine(routineId: string): Promise<RoutineStep[]> {
  return apiRequest<RoutineStep[]>({
    path: `/routines/${routineId}/steps`,
    method: 'GET'
  });
}

export async function updateStep(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    category?: string | null;
    step_order?: number;
    is_required?: boolean;
  }
): Promise<RoutineStep> {
  return apiRequest<RoutineStep>({
    path: `/routines/steps/${id}`,
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteStep(id: string): Promise<void> {
  await apiRequest<void>({
    path: `/routines/steps/${id}`,
    method: 'DELETE'
  });
}

export async function getRoutineById(routineId: string): Promise<Routine> {
  return apiRequest<Routine>({
    path: `/routines/${routineId}`,
    method: 'GET'
  });
}
