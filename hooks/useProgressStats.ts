import { useCallback, useEffect, useState } from 'react';
import { getProgressStats } from '@/services/progress';
import type { RoutineStats } from '@/types/progress';

export function useProgressStats(userId?: string) {
  const [stats, setStats] = useState<RoutineStats | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const progressStats = await getProgressStats(userId);
      setStats(progressStats);
    } catch (unknownError) {
      setStats(null);
      setError(unknownError instanceof Error ? unknownError : new Error('No se pudieron cargar las estadísticas'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    stats,
    error,
    isLoading,
    refetch,
    isEmpty: !stats
  };
}
