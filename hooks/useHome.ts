import { useEffect, useState } from 'react';
import { mockUserProfile } from '@/services/auth';
import { getActiveRoutine } from '@/services/routines';
import type { DailyHomeSummary } from '@/types/home';

export function useHome() {
  const [summary, setSummary] = useState<DailyHomeSummary | null>(null);

  useEffect(() => {
    void getActiveRoutine().then((activeRoutine) => {
      const completedSteps = activeRoutine.steps.filter((step) => step.status === 'completed').length;

      setSummary({
        user: mockUserProfile,
        activeRoutine,
        completedSteps,
        totalSteps: activeRoutine.steps.length,
        metrics: [
          { id: 'hydration', label: 'Hidratacion', value: 75, suffix: '%' },
          { id: 'glow', label: 'Luminosidad', value: 80, suffix: '%' }
        ],
        reminders: [
          { id: 'sunscreen-reminder', title: 'Protector solar', time: '1:00 hs', enabled: true },
          { id: 'night-routine-reminder', title: 'Rutina de noche', time: '12:00 hs', enabled: true }
        ]
      });
    });
  }, []);

  return { summary };
}
