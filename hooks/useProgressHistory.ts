import { useCallback, useEffect, useState } from 'react';
import { getProgressHistory } from '@/services/progress';
import type { ProgressHistoryDay } from '@/types/progress';

export function useProgressHistory(userId?: string) {
  const [history, setHistory] = useState<ProgressHistoryDay[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const progressHistory = await getProgressHistory(userId);
      setHistory(progressHistory);
    } catch (unknownError) {
      setHistory([]);
      setError(unknownError instanceof Error ? unknownError : new Error('No se pudo cargar tu historial'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    history,
    error,
    isLoading,
    refetch,
    isEmpty: history.length === 0
  };
}
