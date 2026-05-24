import { useCallback, useEffect, useState } from 'react';
import { getProgressSummary } from '@/services/progress';
import type { ProgressSummary } from '@/types/progress';

export function useProgress() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    return getProgressSummary()
      .then((progressSummary) => {
        setSummary(progressSummary);
      })
      .catch((unknownError) => {
        setSummary(null);
        setError(unknownError instanceof Error ? unknownError : new Error('No se pudo cargar el progreso'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    summary,
    error,
    isLoading,
    weeklyProgress: summary?.weeklyProgress ?? null,
    monthlyProgress: summary?.monthlyProgress ?? null,
    streakProgress: summary?.streakProgress ?? null,
    calendarProgress: summary?.calendarProgress ?? [],
    refetch,
    isEmpty: !summary
  };
}
