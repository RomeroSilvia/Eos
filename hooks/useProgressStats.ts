import { useCallback, useEffect, useState } from 'react';
import { getFriendlyErrorMessage } from '@/services/api/client';
import { getProgressStats } from '@/services/progress';
import type { RoutineStats } from '@/types/progress';

export function useProgressStats() {
  const [stats, setStats] = useState<RoutineStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const progressStats = await getProgressStats();
      setStats(progressStats);
    } catch (unknownError) {
      setStats(null);
      setError(getFriendlyErrorMessage(unknownError, 'No se pudieron cargar las estadísticas.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

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
