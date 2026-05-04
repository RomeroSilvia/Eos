import { useCallback, useEffect, useState } from 'react';
import {
  deleteRoutine,
  deleteStep,
  getActiveRoutine,
  getRoutineById,
  getRoutines
} from '@/services/routines';
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

  const refreshSelectedRoutine = useCallback(async () => {
    try {
      setError(null);
      const allRoutines = await getRoutines();
      const sortedRoutines = allRoutines.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      const selectedId = routine?.id ?? sortedRoutines[0]?.id;

      setRoutines(sortedRoutines);

      if (!selectedId) {
        setRoutine(null);
        setCompletedStepIds(new Set());
        return;
      }

      const selectedRoutine = await getRoutineById(selectedId);
      const progress = await getRoutineDayProgress(selectedId);
      setRoutine(selectedRoutine);
      setCompletedStepIds(new Set(progress.completed_step_ids));
    } catch (err) {
      console.error(err);
      setError('No pudimos actualizar la rutina.');
    }
  }, [routine?.id]);


  const removeRoutine = async (id: string) => {
    try {
      setError(null);
      await deleteRoutine(id);
      await refreshRoutine();
    } catch (err) {
      console.error(err);
      setError('No pudimos eliminar la rutina.');
    }
  };

  const removeStep = async (id: string) => {
    try {
      setError(null);
      await deleteStep(id);

      if (routine) {
        const updatedRoutine = await getRoutineById(routine.id);
        const progress = await getRoutineDayProgress(routine.id);
        setRoutine(updatedRoutine);
        setCompletedStepIds(new Set(progress.completed_step_ids));
      }
    } catch (err) {
      console.error(err);
      setError('No pudimos eliminar el paso.');
    }
  };

  return {
    routine,
    routines,
    completedStepIds,
    isLoading,
    error,
    refreshRoutine,
    refreshSelectedRoutine,
    selectRoutine,
    removeRoutine,
    removeStep,
    toggleStep
  };
}
