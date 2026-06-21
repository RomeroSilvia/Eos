import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentProfile } from '@/services/auth';
import { getRoutineDayProgress } from '@/services/progress';
import { getActiveRoutine } from '@/services/routines';
import type { DailyHomeSummary } from '@/types/home';
import type { RoutineStep } from '@/types/routine';

const hydrationCategories = new Set(['hidratacion', 'proteccion', 'proteccion solar']);
const glowCategories = new Set(['tratamientos', 'limpieza', 'proteccion', 'proteccion solar']);

const STALE_AFTER_MS = 30_000;

export function useHome() {
  const [summary, setSummary] = useState<DailyHomeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchedAt = useRef<number>(0);

  const toggleReminder = useCallback((reminderId: string) => {
    setSummary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reminders: prev.reminders.map((r) =>
          r.id === reminderId ? { ...r, enabled: !r.enabled } : r
        )
      };
    });
  }, []);

  const refreshSummary = useCallback(async (force = false) => {
    if (!force && Date.now() - lastFetchedAt.current < STALE_AFTER_MS) return;
    try {
      setIsLoading(true);
      const [user, activeRoutine] = await Promise.all([
        getCurrentProfile(),
        getActiveRoutine(),
      ]);
      const steps = activeRoutine?.routine_steps ?? [];
      const progress = activeRoutine ? await getRoutineDayProgress(activeRoutine.id) : null;
      const completedSteps = progress?.completed_step_ids.length ?? 0;
      lastFetchedAt.current = Date.now();
      const completedStepIds = new Set(progress?.completed_step_ids ?? []);
      const hydrationSteps = getMetricStepsByCategory(steps, hydrationCategories);
      const glowSteps = getMetricStepsByCategory(steps, glowCategories);

      setSummary({
        user,
        activeRoutine,
        completedSteps,
        totalSteps: steps.length,
        metrics: [
          { id: 'hydration', label: 'Hidratacion', value: computeMetricValue(hydrationSteps, completedStepIds), suffix: '%' },
          { id: 'glow', label: 'Luminosidad', value: computeMetricValue(glowSteps, completedStepIds), suffix: '%' }
        ],
        reminders: []
      });
    } catch (error) {
      console.error(error);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSummary(true);
  }, [refreshSummary]);

  return { summary, isLoading, refreshSummary, toggleReminder };
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
