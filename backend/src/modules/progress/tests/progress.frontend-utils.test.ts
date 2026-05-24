import { routes } from '@/constants/routes';
import type { RoutineStats } from '@/types/progress';
import {
  calculatePercentage,
  formatDayCount,
  formatProductCount,
  formatRoutineCount,
  formatStepCount,
  formatUseCount,
  getHistoryDayStatusLabel,
  getProductMotivationalMessage,
  getProgressCTA,
  getRoutineMotivationalMessage,
  getRoutineStatusLabel,
  getStatsWeekDayStatusLabel
} from '@/utils/progress';

function makeStats(overrides: Partial<RoutineStats> = {}): RoutineStats {
  return {
    weekly: {
      completionPercentage: 50,
      completedRoutines: 7,
      totalExpectedRoutines: 14,
      currentStreak: 2,
      bestStreak: 5
    },
    monthly: {
      completionPercentage: 50,
      completedRoutines: 20,
      totalExpectedRoutines: 40,
      completeDays: 3,
      partialDays: 2,
      incompleteDays: 1,
      noRoutineDays: 0
    },
    weekDays: [],
    routinesRanking: [],
    products: {
      weekly: {
        totalProductUses: 2,
        distinctProductsUsed: 1
      },
      monthly: {
        totalProductUses: 6,
        distinctProductsUsed: 2
      },
      productRanking: [],
      categoryStats: [],
      routineProductUsage: [],
      unusedProducts: []
    },
    ...overrides
  };
}

describe('progress frontend helpers', () => {
  it('formats percentages and singular/plural labels', () => {
    expect(calculatePercentage(0, 0)).toBe(0);
    expect(calculatePercentage(1, 2)).toBe(50);
    expect(formatDayCount(1)).toBe('1 día');
    expect(formatDayCount(2)).toBe('2 días');
    expect(formatRoutineCount(1, 7)).toBe('1 de 7 rutina completada');
    expect(formatRoutineCount(2, 14)).toBe('2 de 14 rutinas completadas');
    expect(formatStepCount(1, 1)).toBe('1 de 1 paso');
    expect(formatStepCount(1, 2)).toBe('1 de 2 pasos');
    expect(formatUseCount(1)).toBe('1 uso');
    expect(formatUseCount(2)).toBe('2 usos');
    expect(formatProductCount(1)).toBe('1 producto');
    expect(formatProductCount(2)).toBe('2 productos');
  });

  it('maps technical statuses to human labels', () => {
    expect(getHistoryDayStatusLabel('complete')).toBe('Día completo');
    expect(getHistoryDayStatusLabel('partial')).toBe('Día parcial');
    expect(getStatsWeekDayStatusLabel('pending')).toBe('Todavía pendiente');
    expect(getStatsWeekDayStatusLabel('no_routine')).toBe('Sin rutina asignada');
    expect(getRoutineStatusLabel('complete')).toBe('Completa');
    expect(getRoutineStatusLabel('partial')).toBe('Parcial');
    expect(getRoutineStatusLabel('pending')).toBe('Pendiente');
  });

  it('resolves the contextual progress CTA', () => {
    expect(
      getProgressCTA({
        overallProgressPercentage: 0,
        todayStatus: 'pending',
        completedTodayRoutines: 0,
        totalTodayRoutines: 1,
        hasPreviousProgress: false,
        streak: 0
      })
    ).toMatchObject({ label: 'Empezá a cuidarte', target: 'todayRoutine' });

    expect(
      getProgressCTA({
        overallProgressPercentage: 50,
        todayStatus: 'pending',
        completedTodayRoutines: 0,
        totalTodayRoutines: 2,
        hasPreviousProgress: true,
        streak: 2
      })
    ).toMatchObject({ label: 'Seguí cuidándote', target: 'todayRoutine' });

    expect(
      getProgressCTA({
        overallProgressPercentage: 50,
        todayStatus: 'partial',
        completedTodayRoutines: 1,
        totalTodayRoutines: 2,
        hasPreviousProgress: true,
        streak: 2
      })
    ).toMatchObject({ label: 'Terminá tu rutina de hoy', target: 'todayRoutine' });

    expect(
      getProgressCTA({
        overallProgressPercentage: 100,
        todayStatus: 'complete',
        completedTodayRoutines: 2,
        totalTodayRoutines: 2,
        hasPreviousProgress: true,
        streak: 3
      })
    ).toMatchObject({ label: 'Ver progreso', target: 'progressHistory' });
    expect(routes.progressHistory).toBe('/progress/history');
  });

  it('returns routine and product motivational messages', () => {
    expect(getRoutineMotivationalMessage(makeStats({
      weekly: { completionPercentage: 0, completedRoutines: 0, totalExpectedRoutines: 0, currentStreak: 0, bestStreak: 0 }
    }))).toContain('Todavía no tenés rutinas');

    expect(getRoutineMotivationalMessage(makeStats({ weekly: { completionPercentage: 95, completedRoutines: 14, totalExpectedRoutines: 14, currentStreak: 7, bestStreak: 7 } })))
      .toContain('Excelente constancia');

    expect(getProductMotivationalMessage(makeStats({
      products: {
        weekly: { totalProductUses: 0, distinctProductsUsed: 0 },
        monthly: { totalProductUses: 0, distinctProductsUsed: 0 },
        productRanking: [],
        categoryStats: [],
        routineProductUsage: [],
        unusedProducts: []
      }
    }))).toContain('Todavía no registraste productos');
  });
});
