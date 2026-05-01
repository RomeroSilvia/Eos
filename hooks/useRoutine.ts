import { useEffect, useMemo, useState } from 'react';
import { getActiveRoutine } from '@/services/routines';
import type { Routine } from '@/types/routine';

export function useRoutine() {
  const [routine, setRoutine] = useState<Routine | null>(null);

  useEffect(() => {
    void getActiveRoutine().then(setRoutine);
  }, []);

  const completedSteps = useMemo(
    () => routine?.steps.filter((step) => step.status === 'completed').length ?? 0,
    [routine]
  );

  const totalSteps = routine?.steps.length ?? 0;
  const progress = totalSteps === 0 ? 0 : completedSteps / totalSteps;

  return { routine, completedSteps, totalSteps, progress };
}
