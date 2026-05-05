import { useCallback, useEffect, useState } from 'react';
import { mockUserProfile } from '@/services/auth';
import { getActiveRoutine } from '@/services/routines';
import { getRoutineDayProgress } from '@/services/progress';
import type { DailyHomeSummary } from '@/types/home';
import type { RoutineStep } from '@/types/routine';

const hydrationCategories = new Set(['hidratacion', 'proteccion', 'proteccion solar']);
const glowCategories = new Set(['tratamientos', 'limpieza', 'proteccion', 'proteccion solar']);

export function useHome() {
  const [summary, setSummary] = useState<DailyHomeSummary | null>(null);

  const refreshSummary = useCallback(async () => {
    try {
      const activeRoutine = await getActiveRoutine();
      const steps = activeRoutine?.routine_steps ?? [];
      const progress = activeRoutine ? await getRoutineDayProgress(activeRoutine.id) : null;
      const completedSteps = progress?.completed_step_ids.length ?? 0;
      const completedStepIds = new Set(progress?.completed_step_ids ?? []);
      const hydrationSteps = getMetricStepsByCategory(steps, hydrationCategories);
      const glowSteps = getMetricStepsByCategory(steps, glowCategories);

      const hydrationMetric = computeMetricValue(hydrationSteps, completedStepIds);
      const glowMetric = computeMetricValue(glowSteps, completedStepIds);

      setSummary({
        user: mockUserProfile,
        activeRoutine,
        completedSteps,
        totalSteps: steps.length,
        metrics: [
          { id: 'hydration', label: 'Hidratacion', value: hydrationMetric, suffix: '%' },
          { id: 'glow', label: 'Luminosidad', value: glowMetric, suffix: '%' }
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
          { id: 'hydration', label: 'Hidratacion', value: 0, suffix: '%' },
          { id: 'glow', label: 'Luminosidad', value: 0, suffix: '%' }
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

function getMetricStepsByCategory(steps: RoutineStep[], allowedCategories: Set<string>): RoutineStep[] {
  return steps.filter((step) => {
    const category = normalizeCategory(step.category);
    return allowedCategories.has(category);
  });
}

function computeMetricValue(metricSteps: RoutineStep[], completedStepIds: Set<string>): number {
  if (metricSteps.length === 0) {
    return 0;
  }

  const completedMetricSteps = metricSteps.filter((step) => completedStepIds.has(step.id)).length;
  return Math.round((completedMetricSteps / metricSteps.length) * 100);
}

function normalizeCategory(value: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
