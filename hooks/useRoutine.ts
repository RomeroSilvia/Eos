import { useCallback, useEffect, useState } from 'react';
import { getActiveRoutine, getRoutineById, getRoutines } from '@/services/routines';
import { getRoutineDayProgress, setRoutineStepCompletion } from '@/services/progress';
import type { Routine } from '@/types/routine';

export function useRoutine() {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRoutine = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [allRoutines, activeRoutine] = await Promise.all([
        getRoutines(),
        getActiveRoutine()
      ]);

      setRoutines(
        allRoutines.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
      setRoutine(activeRoutine);

      if (activeRoutine) {
        const progress = await getRoutineDayProgress(activeRoutine.id);
        setCompletedStepIds(new Set(progress.completed_step_ids));
      } else {
        setCompletedStepIds(new Set());
      }
    } catch (err) {
      console.error(err);
      setError('No pudimos cargar tu rutina.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRoutine();
  }, [refreshRoutine]);

  const selectRoutine = async (id: string) => {
    try {
      setError(null);
      const selectedRoutine = await getRoutineById(id);
      const progress = await getRoutineDayProgress(id);
      setRoutine(selectedRoutine);
      setCompletedStepIds(new Set(progress.completed_step_ids));
    } catch (err) {
      console.error(err);
      setError('No pudimos cargar esa rutina.');
    }
  };

  const toggleStep = async (id: string) => {
    if (!routine) return;

    const isCompleted = !completedStepIds.has(id);

    try {
      const progress = await setRoutineStepCompletion({
        routineId: routine.id,
        stepId: id,
        isCompleted
      });

      setCompletedStepIds(new Set(progress.completed_step_ids));
    } catch (err) {
      console.error(err);
      setError('No pudimos actualizar el progreso del paso.');
    }
  };

  return {
    routine,
    routines,
    completedStepIds,
    isLoading,
    error,
    refreshRoutine,
    selectRoutine,
    toggleStep
  };
}
