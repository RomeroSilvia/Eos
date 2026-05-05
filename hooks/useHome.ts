import { useCallback, useEffect, useState } from 'react';
import { mockUserProfile } from '@/services/auth';
import { getActiveRoutine } from '@/services/routines';
import { getRoutineDayProgress } from '@/services/progress';
import type { DailyHomeSummary } from '@/types/home';

export function useHome() {
  const [summary, setSummary] = useState<DailyHomeSummary | null>(null);

  const refreshSummary = useCallback(async () => {
    try {
      const activeRoutine = await getActiveRoutine();
      const steps = activeRoutine?.routine_steps ?? [];
      const progress = activeRoutine ? await getRoutineDayProgress(activeRoutine.id) : null;
      const completedSteps = progress?.completed_step_ids.length ?? 0;

      setSummary({
        user: mockUserProfile,
        activeRoutine,
        completedSteps,
        totalSteps: steps.length,
        metrics: [
          { id: 'hydration', label: 'Hidratacion', value: 75, suffix: '%' },
          { id: 'glow', label: 'Luminosidad', value: 80, suffix: '%' }
        ],
        reminders: [
          { id: 'sunscreen-reminder', title: 'Protector solar', time: '1:00 hs', enabled: true },
          { id: 'night-routine-reminder', title: 'Rutina de noche', time: '12:00 hs', enabled: true }
        ]
      });
    } catch (error) {
      console.error(error);
      setSummary({
        user: mockUserProfile,
        activeRoutine: null,
        completedSteps: 0,
        totalSteps: 0,
        metrics: [
          { id: 'hydration', label: 'Hidratacion', value: 75, suffix: '%' },
          { id: 'glow', label: 'Luminosidad', value: 80, suffix: '%' }
        ],
        reminders: [
          { id: 'sunscreen-reminder', title: 'Protector solar', time: '1:00 hs', enabled: true },
          { id: 'night-routine-reminder', title: 'Rutina de noche', time: '12:00 hs', enabled: true }
        ]
      });
    }
  }, []);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  return { summary, refreshSummary };
}
