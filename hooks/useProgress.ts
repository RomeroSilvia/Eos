import { useEffect, useState } from 'react';
import { getProgressSummary } from '@/services/progress';
import type { ProgressSummary } from '@/types/progress';

export function useProgress() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);

  useEffect(() => {
    void getProgressSummary().then(setSummary);
  }, []);

  return {
    summary,
    weeklyProgress: summary?.weeklyProgress ?? null,
    monthlyProgress: summary?.monthlyProgress ?? null,
    streakProgress: summary?.streakProgress ?? null,
    calendarProgress: summary?.calendarProgress ?? [],
    isEmpty: !summary
  };
}
