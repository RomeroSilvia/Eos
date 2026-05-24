import { useEffect, useState } from 'react';
import { getProgressSummary } from '@/services/progress';
import type { ProgressSummary } from '@/types/progress';

export function useProgress() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    void getProgressSummary()
      .then((progressSummary) => {
        if (isMounted) {
          setSummary(progressSummary);
        }
      })
      .catch((unknownError) => {
        if (isMounted) {
          setSummary(null);
          setError(unknownError instanceof Error ? unknownError : new Error('No se pudo cargar el progreso'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    summary,
    error,
    isLoading,
    weeklyProgress: summary?.weeklyProgress ?? null,
    monthlyProgress: summary?.monthlyProgress ?? null,
    streakProgress: summary?.streakProgress ?? null,
    calendarProgress: summary?.calendarProgress ?? [],
    isEmpty: !summary
  };
}
