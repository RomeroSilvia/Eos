import { progressRepository } from './progress.repository';
import type {
  CalendarDayProgress,
  CalendarDayStatus,
  DayProgressStatus,
  PeriodProgress,
  ProgressHistoryDay,
  ProductForProgress,
  ProgressHistoryItem,
  ProgressSummary,
  RoutineStats,
  RoutineDayDetail,
  RoutineForProgress,
  RoutineDayProgress,
  RoutineLog,
  RoutineStepForProgress,
  RoutineStepLog,
  RoutineStepProductForProgress,
  StreakProgress
} from './progress.types';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function getProgressHealth() {
  return {
    module: 'progress',
    status: 'ready'
  };
}

export async function getSummaryByUserId(userId: string): Promise<ProgressSummary> {
  const today = startOfUtcDay(new Date());
  const weekStart = getMonday(today);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));

  const [activeRoutines, allLogs, weeklyLogs, monthlyLogs] = await Promise.all([
    progressRepository.findActiveRoutinesByUserId(userId),
    progressRepository.findRoutineLogsByUserId(userId),
    progressRepository.findRoutineLogsByUserIdBetweenDates(userId, toIsoDate(weekStart), toIsoDate(weekEnd)),
    progressRepository.findRoutineLogsByUserIdBetweenDates(userId, toIsoDate(monthStart), toIsoDate(monthEnd))
  ]);

  const weeklyProgress = calculatePeriodProgress(weeklyLogs, activeRoutines, weekStart, weekEnd, today);
  const monthlyProgress = calculatePeriodProgress(monthlyLogs, activeRoutines, monthStart, today, today);
  const streakProgress = calculateStreakProgress(allLogs, activeRoutines, today);
  const calendarProgress = buildCalendarProgress(monthlyLogs, activeRoutines, monthStart, monthEnd, today);
  const completedDays = calendarProgress.filter((day) => day.status === 'completed').length;

  return {
    userId,
    completedRoutines: monthlyProgress.completedRoutines,
    totalRoutines: monthlyProgress.totalRoutines,
    completedDays,
    currentStreak: streakProgress.currentStreak,
    bestStreak: streakProgress.longestStreak,
    completionRate: monthlyProgress.percent,
    weeklyProgress,
    monthlyProgress,
    streakProgress,
    calendarProgress
  };
}

export async function getHistoryByDate(userId: string, date: string): Promise<ProgressHistoryItem[]> {
  if (!isIsoDate(date)) {
    throw new Error('date must use YYYY-MM-DD format');
  }

  return progressRepository.findRoutineLogsByUserIdAndDate(userId, date);
}

export async function getFullHistoryByUserId(userId: string): Promise<ProgressHistoryDay[]> {
  const today = startOfUtcDay(new Date());
  const [activeRoutines, allLogs] = await Promise.all([
    progressRepository.findActiveRoutinesByUserId(userId),
    progressRepository.findRoutineLogsByUserId(userId)
  ]);
  const dates = [...new Set(allLogs.map((log) => log.log_date))].sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) {
    return [];
  }

  const loggedRoutineIds = [...new Set(allLogs.map((log) => log.routine_id))];
  const missingRoutineIds = loggedRoutineIds.filter(
    (routineId) => !activeRoutines.some((routine) => routine.id === routineId)
  );
  const allRoutineIds = [...new Set([...activeRoutines.map((routine) => routine.id), ...loggedRoutineIds])];
  const [loggedRoutines, routineSteps, stepLogs] = await Promise.all([
    progressRepository.findRoutinesByIds(userId, missingRoutineIds),
    progressRepository.findRoutineStepsByRoutineIds(allRoutineIds),
    progressRepository.findStepLogsByRoutineLogIds(allLogs.map((log) => log.id))
  ]);
  const routinesById = new Map([...activeRoutines, ...loggedRoutines].map((routine) => [routine.id, routine]));
  const stepsByRoutineId = groupBy(routineSteps, (step) => step.routine_id);
  const stepLogsByRoutineLogAndStep = new Map(
    stepLogs.map((stepLog) => [`${stepLog.routine_log_id}:${stepLog.step_id}`, stepLog])
  );
  const logsByDate = groupLogsByDate(allLogs);

  return dates.map((date) => {
    const dateValue = parseIsoDate(date);
    const dayLogs = logsByDate.get(date) ?? [];
    const expectedRoutineIds = Array.from(getExpectedRoutineIdsForDate(dateValue, activeRoutines, dayLogs));
    const logsByRoutineId = new Map(dayLogs.map((log) => [log.routine_id, log]));
    const dayProgress = buildDayProgress(date, dayLogs, activeRoutines, dateValue, today);

    return {
      date,
      status: mapCalendarStatusToDayStatus(dayProgress.status),
      completionPercentage: dayProgress.completionPercentage,
      completedRoutines: dayProgress.completedRoutines,
      totalExpectedRoutines: dayProgress.totalRoutines,
      routines: expectedRoutineIds.map((routineId) => {
        const routine = routinesById.get(routineId);
        const routineLog = logsByRoutineId.get(routineId);
        const steps = stepsByRoutineId.get(routineId) ?? [];
        const detailSteps = steps.map((step) => {
          const stepLog = routineLog ? stepLogsByRoutineLogAndStep.get(`${routineLog.id}:${step.id}`) : undefined;

          return {
            stepId: step.id,
            stepName: step.name,
            completed: stepLog?.is_completed ?? false
          };
        });
        const completedSteps = detailSteps.filter((step) => step.completed).length;

        return {
          routineId,
          routineName: routine?.name ?? 'Rutina sin nombre',
          timeOfDay: normalizeTimeOfDay(routine?.time_of_day),
          status: getRoutineDetailStatus(routineLog, completedSteps, detailSteps.length),
          completedSteps,
          totalSteps: detailSteps.length,
          steps: detailSteps
        };
      })
    };
  });
}

export async function getDayDetailByDate(userId: string, date: string): Promise<RoutineDayDetail> {
  if (!isIsoDate(date)) {
    throw new Error('date must use YYYY-MM-DD format');
  }

  const dateValue = parseIsoDate(date);
  const [activeRoutines, dayLogs] = await Promise.all([
    progressRepository.findActiveRoutinesByUserId(userId),
    progressRepository.findRoutineLogsByUserIdAndDate(userId, date)
  ]);
  const expectedRoutineIds = Array.from(getExpectedRoutineIdsForDate(dateValue, activeRoutines, dayLogs));
  const missingRoutineIds = expectedRoutineIds.filter(
    (routineId) => !activeRoutines.some((routine) => routine.id === routineId)
  );
  const [loggedRoutines, routineSteps, stepLogs] = await Promise.all([
    progressRepository.findRoutinesByIds(userId, missingRoutineIds),
    progressRepository.findRoutineStepsByRoutineIds(expectedRoutineIds),
    progressRepository.findStepLogsByRoutineLogIds(dayLogs.map((log) => log.id))
  ]);
  const routinesById = new Map([...activeRoutines, ...loggedRoutines].map((routine) => [routine.id, routine]));
  const logsByRoutineId = new Map(dayLogs.map((log) => [log.routine_id, log]));
  const stepsByRoutineId = groupBy(routineSteps, (step) => step.routine_id);
  const stepLogsByRoutineLogAndStep = new Map(
    stepLogs.map((stepLog) => [`${stepLog.routine_log_id}:${stepLog.step_id}`, stepLog])
  );
  const dayProgress = buildDayProgress(date, dayLogs, activeRoutines, dateValue, startOfUtcDay(new Date()));

  return {
    date,
    status: mapCalendarStatusToDayStatus(dayProgress.status),
    completionPercentage: dayProgress.completionPercentage,
    completedRoutines: dayProgress.completedRoutines,
    totalRoutines: dayProgress.totalRoutines,
    routines: expectedRoutineIds.map((routineId) => {
      const routine = routinesById.get(routineId);
      const routineLog = logsByRoutineId.get(routineId);
      const steps = stepsByRoutineId.get(routineId) ?? [];
      const detailSteps = steps.map((step) => {
        const stepLog = routineLog ? stepLogsByRoutineLogAndStep.get(`${routineLog.id}:${step.id}`) : undefined;

        return {
          id: step.id,
          name: step.name,
          completed: stepLog?.is_completed ?? false
        };
      });
      const completedSteps = detailSteps.filter((step) => step.completed).length;

      return {
        id: routineId,
        name: routine?.name ?? 'Rutina sin nombre',
        timeOfDay: normalizeTimeOfDay(routine?.time_of_day),
        status: getRoutineDetailStatus(routineLog, completedSteps, detailSteps.length),
        completedSteps,
        totalSteps: detailSteps.length,
        steps: detailSteps
      };
    })
  };
}

export async function getStatsByUserId(userId: string): Promise<RoutineStats> {
  const today = startOfUtcDay(new Date());
  const weekStart = getMonday(today);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [activeRoutines, allLogs, weeklyLogs, monthlyLogs] = await Promise.all([
    progressRepository.findActiveRoutinesByUserId(userId),
    progressRepository.findRoutineLogsByUserId(userId),
    progressRepository.findRoutineLogsByUserIdBetweenDates(userId, toIsoDate(weekStart), toIsoDate(weekEnd)),
    progressRepository.findRoutineLogsByUserIdBetweenDates(userId, toIsoDate(monthStart), toIsoDate(today))
  ]);
  const weeklyProgress = calculatePeriodProgress(weeklyLogs, activeRoutines, weekStart, weekEnd, today);
  const monthlyProgress = calculatePeriodProgress(monthlyLogs, activeRoutines, monthStart, today, today);
  const streakProgress = calculateStreakProgress(allLogs, activeRoutines, today);
  const weekDays = buildWeekStats(weeklyLogs, activeRoutines, weekStart, today);
  const monthDays = buildCalendarProgress(monthlyLogs, activeRoutines, monthStart, today, today);
  const routineSteps = await progressRepository.findRoutineStepsByRoutineIds(activeRoutines.map((routine) => routine.id));
  const [products, routineStepProducts, allStepLogs] = await Promise.all([
    progressRepository.findProductsByUserId(userId),
    progressRepository.findRoutineStepProductsByStepIds(routineSteps.map((step) => step.id)),
    progressRepository.findStepLogsByRoutineLogIds(allLogs.map((log) => log.id))
  ]);

  return {
    weekly: {
      completionPercentage: weeklyProgress.percent,
      completedRoutines: weeklyProgress.completedRoutines,
      totalExpectedRoutines: weeklyProgress.totalRoutines,
      currentStreak: streakProgress.currentStreak,
      bestStreak: streakProgress.longestStreak ?? 0
    },
    monthly: {
      completionPercentage: monthlyProgress.percent,
      completedRoutines: monthlyProgress.completedRoutines,
      totalExpectedRoutines: monthlyProgress.totalRoutines,
      completeDays: monthDays.filter((day) => day.status === 'completed').length,
      partialDays: monthDays.filter((day) => day.status === 'partial').length,
      incompleteDays: monthDays.filter((day) => day.status === 'pending').length,
      noRoutineDays: monthDays.filter((day) => day.status === 'empty').length
    },
    weekDays,
    routinesRanking: buildRoutineRanking(monthlyLogs, activeRoutines, monthStart, today),
    products: buildProductStats({
      products,
      routines: activeRoutines,
      routineSteps,
      routineStepProducts,
      logs: allLogs,
      stepLogs: allStepLogs,
      weekStart,
      weekEnd,
      monthStart,
      today,
      recentStart: addDays(today, -29)
    })
  };
}

export async function getRoutineDayProgress(
  userId: string,
  routineId: string,
  date = toIsoDate(startOfUtcDay(new Date()))
): Promise<RoutineDayProgress> {
  if (!isIsoDate(date)) {
    throw new Error('date must use YYYY-MM-DD format');
  }

  const routineLog = await progressRepository.findRoutineLogByRoutineIdAndDate(userId, routineId, date);

  if (!routineLog) {
    return {
      routine_id: routineId,
      log_date: date,
      routine_log_id: null,
      completed_step_ids: [],
      completion_percentage: 0
    };
  }

  return buildRoutineDayProgress(routineLog);
}

export async function setRoutineStepCompletion(
  userId: string,
  routineId: string,
  stepId: string,
  isCompleted: boolean,
  date = toIsoDate(startOfUtcDay(new Date()))
): Promise<RoutineDayProgress> {
  if (!isIsoDate(date)) {
    throw new Error('date must use YYYY-MM-DD format');
  }

  const now = new Date().toISOString();
  const routineLog =
    (await progressRepository.findRoutineLogByRoutineIdAndDate(userId, routineId, date)) ??
    (await progressRepository.createRoutineLog({
      user_id: userId,
      routine_id: routineId,
      log_date: date,
      completed_at: null,
      completion_percentage: 0
    }));

  const existingStepLog = await progressRepository.findStepLogByRoutineLogIdAndStepId(routineLog.id, stepId);
  const stepLogUpdates = {
    is_completed: isCompleted,
    completed_at: isCompleted ? now : null,
    updated_at: now
  };

  if (existingStepLog) {
    await progressRepository.updateStepLog(existingStepLog.id, stepLogUpdates);
  } else {
    await progressRepository.createStepLog({
      routine_log_id: routineLog.id,
      step_id: stepId,
      ...stepLogUpdates
    });
  }

  const stepLogs = await progressRepository.findStepLogsByRoutineLogId(routineLog.id);
  const totalSteps = await progressRepository.countRoutineSteps(routineId);
  const completedStepIds = stepLogs.filter((log) => log.is_completed).map((log) => log.step_id);
  const completionPercentage =
    totalSteps === 0 ? 0 : Math.round((completedStepIds.length / totalSteps) * 100);

  const updatedRoutineLog = await progressRepository.updateRoutineLog(routineLog.id, {
    completion_percentage: completionPercentage,
    completed_at: completionPercentage >= 100 ? now : null,
    updated_at: now
  });

  return {
    routine_id: updatedRoutineLog.routine_id,
    log_date: updatedRoutineLog.log_date,
    routine_log_id: updatedRoutineLog.id,
    completed_step_ids: completedStepIds,
    completion_percentage: updatedRoutineLog.completion_percentage
  };
}

function calculatePeriodProgress(
  logs: RoutineLog[],
  routines: RoutineForProgress[] = [],
  periodStart?: Date,
  periodEnd?: Date,
  today = startOfUtcDay(new Date())
): PeriodProgress {
  if (!periodStart || !periodEnd) {
    const totalRoutines = logs.length;
    const completedRoutines = logs.filter(isRoutineCompleted).length;

    return {
      totalRoutines,
      completedRoutines,
      percent: totalRoutines === 0 ? 0 : Math.round((completedRoutines / totalRoutines) * 100)
    };
  }

  const logsByDate = groupLogsByDate(logs);
  let totalRoutines = 0;
  let completedRoutines = 0;

  for (let current = new Date(periodStart); current <= periodEnd; current = addDays(current, 1)) {
    const date = toIsoDate(current);
    const dayProgress = buildDayProgress(date, logsByDate.get(date) ?? [], routines, current, today);
    totalRoutines += dayProgress.totalRoutines;
    completedRoutines += dayProgress.completedRoutines;
  }

  return {
    totalRoutines,
    completedRoutines,
    percent: totalRoutines === 0 ? 0 : Math.round((completedRoutines / totalRoutines) * 100)
  };
}

async function buildRoutineDayProgress(routineLog: RoutineLog): Promise<RoutineDayProgress> {
  const stepLogs = await progressRepository.findStepLogsByRoutineLogId(routineLog.id);

  return {
    routine_id: routineLog.routine_id,
    log_date: routineLog.log_date,
    routine_log_id: routineLog.id,
    completed_step_ids: stepLogs.filter((log) => log.is_completed).map((log) => log.step_id),
    completion_percentage: routineLog.completion_percentage
  };
}

function buildCalendarProgress(
  logs: RoutineLog[],
  routines: RoutineForProgress[],
  monthStart: Date,
  monthEnd: Date,
  today: Date
): CalendarDayProgress[] {
  const logsByDate = groupLogsByDate(logs);
  const days: CalendarDayProgress[] = [];

  for (let current = new Date(monthStart); current <= monthEnd; current = addDays(current, 1)) {
    const date = toIsoDate(current);
    const dayLogs = logsByDate.get(date) ?? [];

    days.push(buildDayProgress(date, dayLogs, routines, current, today));
  }

  return days;
}

function buildWeekStats(
  logs: RoutineLog[],
  routines: RoutineForProgress[],
  weekStart: Date,
  today: Date
): RoutineStats['weekDays'] {
  const logsByDate = groupLogsByDate(logs);

  return Array.from({ length: 7 }, (_, index) => {
    const current = addDays(weekStart, index);
    const date = toIsoDate(current);
    const dayProgress = buildDayProgress(date, logsByDate.get(date) ?? [], routines, current, today);

    return {
      date,
      dayLabel: getWeekdayLabel(current),
      status: mapCalendarProgressToStatsStatus(dayProgress),
      completedRoutines: dayProgress.completedRoutines,
      totalExpectedRoutines: dayProgress.totalRoutines,
      completionPercentage: dayProgress.completionPercentage
    };
  });
}

function buildRoutineRanking(
  logs: RoutineLog[],
  routines: RoutineForProgress[],
  periodStart: Date,
  periodEnd: Date
): RoutineStats['routinesRanking'] {
  return routines
    .map((routine) => {
      let expectedCount = 0;

      for (let current = new Date(periodStart); current <= periodEnd; current = addDays(current, 1)) {
        if (getExpectedRoutineIdsForDate(current, [routine], []).has(routine.id)) {
          expectedCount += 1;
        }
      }

      const completedCount = logs.filter((log) => log.routine_id === routine.id && isRoutineCompleted(log)).length;
      const completionPercentage = expectedCount === 0 ? 0 : Math.round((completedCount / expectedCount) * 100);

      return {
        routineId: routine.id,
        routineName: routine.name,
        timeOfDay: normalizeTimeOfDay(routine.time_of_day),
        completedCount,
        expectedCount,
        completionPercentage
      };
    })
    .sort((a, b) => {
      if (b.completionPercentage !== a.completionPercentage) {
        return b.completionPercentage - a.completionPercentage;
      }

      return b.completedCount - a.completedCount;
    });
}

type ProductUseEvent = {
  date: string;
  routineId: string;
  productId: string;
};

function buildProductStats({
  products,
  routines,
  routineSteps,
  routineStepProducts,
  logs,
  stepLogs,
  weekStart,
  weekEnd,
  monthStart,
  today,
  recentStart
}: {
  products: ProductForProgress[];
  routines: RoutineForProgress[];
  routineSteps: RoutineStepForProgress[];
  routineStepProducts: RoutineStepProductForProgress[];
  logs: RoutineLog[];
  stepLogs: RoutineStepLog[];
  weekStart: Date;
  weekEnd: Date;
  monthStart: Date;
  today: Date;
  recentStart: Date;
}): RoutineStats['products'] {
  const productById = new Map(products.map((product) => [product.id, product]));
  const routineById = new Map(routines.map((routine) => [routine.id, routine]));
  const stepById = new Map(routineSteps.map((step) => [step.id, step]));
  const logById = new Map(logs.map((log) => [log.id, log]));
  const productIdsByStepId = groupBy(routineStepProducts, (link) => link.step_id);
  const allEvents = buildProductUseEvents({
    productById,
    stepById,
    logById,
    productIdsByStepId,
    stepLogs
  });
  const weeklyEvents = filterEventsBetweenDates(allEvents, weekStart, weekEnd);
  const monthlyEvents = filterEventsBetweenDates(allEvents, monthStart, today);
  const recentEvents = filterEventsBetweenDates(allEvents, recentStart, today);
  const monthlyTotal = monthlyEvents.length;

  return {
    weekly: {
      totalProductUses: weeklyEvents.length,
      distinctProductsUsed: countDistinctProductIds(weeklyEvents),
      mostUsedProduct: getMostUsedProduct(weeklyEvents, productById)
    },
    monthly: {
      totalProductUses: monthlyTotal,
      distinctProductsUsed: countDistinctProductIds(monthlyEvents)
    },
    productRanking: buildProductRanking(monthlyEvents, weeklyEvents, productById),
    categoryStats: buildCategoryStats(monthlyEvents, productById),
    routineProductUsage: buildRoutineProductUsage(monthlyEvents, routineById, productById),
    unusedProducts: buildUnusedProducts(products, allEvents, recentEvents)
  };
}

function buildProductUseEvents({
  productById,
  stepById,
  logById,
  productIdsByStepId,
  stepLogs
}: {
  productById: Map<string, ProductForProgress>;
  stepById: Map<string, RoutineStepForProgress>;
  logById: Map<string, RoutineLog>;
  productIdsByStepId: Map<string, RoutineStepProductForProgress[]>;
  stepLogs: RoutineStepLog[];
}): ProductUseEvent[] {
  return stepLogs.flatMap((stepLog) => {
    if (!stepLog.is_completed) {
      return [];
    }

    const routineLog = logById.get(stepLog.routine_log_id);
    const routineStep = stepById.get(stepLog.step_id);

    if (!routineLog || !routineStep) {
      return [];
    }

    return (productIdsByStepId.get(stepLog.step_id) ?? [])
      .filter((link) => productById.has(link.product_id))
      .map((link) => ({
        date: routineLog.log_date,
        routineId: routineLog.routine_id,
        productId: link.product_id
      }));
  });
}

function filterEventsBetweenDates(events: ProductUseEvent[], startDate: Date, endDate: Date): ProductUseEvent[] {
  const start = toIsoDate(startDate);
  const end = toIsoDate(endDate);
  return events.filter((event) => event.date >= start && event.date <= end);
}

function countDistinctProductIds(events: ProductUseEvent[]): number {
  return new Set(events.map((event) => event.productId)).size;
}

function getMostUsedProduct(
  events: ProductUseEvent[],
  productById: Map<string, ProductForProgress>
): RoutineStats['products']['weekly']['mostUsedProduct'] {
  const productCounts = countProductUses(events);
  const [productId, uses] = [...productCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  const product = productId ? productById.get(productId) : undefined;

  if (!product || !uses) {
    return undefined;
  }

  const category = normalizeCategory(product.category);

  return {
    productId: product.id,
    name: product.name,
    ...(category ? { category } : {}),
    uses
  };
}

function buildProductRanking(
  monthlyEvents: ProductUseEvent[],
  weeklyEvents: ProductUseEvent[],
  productById: Map<string, ProductForProgress>
): RoutineStats['products']['productRanking'] {
  const monthlyCounts = countProductUses(monthlyEvents);
  const weeklyCounts = countProductUses(weeklyEvents);
  const monthlyTotal = monthlyEvents.length;

  return [...monthlyCounts.entries()]
    .flatMap(([productId, monthlyUses]) => {
      const product = productById.get(productId);

      if (!product) {
        return [];
      }

      const category = normalizeCategory(product.category);

      return [{
        productId,
        name: product.name,
        ...(category ? { category } : {}),
        weeklyUses: weeklyCounts.get(productId) ?? 0,
        monthlyUses,
        totalUses: monthlyUses,
        usagePercentage: monthlyTotal === 0 ? 0 : Math.round((monthlyUses / monthlyTotal) * 100)
      }];
    })
    .sort((a, b) => {
      if (b.totalUses !== a.totalUses) {
        return b.totalUses - a.totalUses;
      }

      return a.name.localeCompare(b.name);
    });
}

function buildCategoryStats(
  monthlyEvents: ProductUseEvent[],
  productById: Map<string, ProductForProgress>
): RoutineStats['products']['categoryStats'] {
  const monthlyTotal = monthlyEvents.length;
  const categoryCounts = monthlyEvents.reduce<Map<string, number>>((acc, event) => {
    const product = productById.get(event.productId);
    const category = normalizeCategory(product?.category) ?? 'Otros';
    acc.set(category, (acc.get(category) ?? 0) + 1);
    return acc;
  }, new Map());

  return [...categoryCounts.entries()]
    .map(([category, uses]) => ({
      category,
      uses,
      percentage: monthlyTotal === 0 ? 0 : Math.round((uses / monthlyTotal) * 100)
    }))
    .sort((a, b) => b.uses - a.uses);
}

function buildRoutineProductUsage(
  monthlyEvents: ProductUseEvent[],
  routineById: Map<string, RoutineForProgress>,
  productById: Map<string, ProductForProgress>
): RoutineStats['products']['routineProductUsage'] {
  const eventsByRoutine = groupBy(monthlyEvents, (event) => event.routineId);

  return [...eventsByRoutine.entries()]
    .map(([routineId, events]) => {
      const routine = routineById.get(routineId);
      const productCounts = countProductUses(events);

      return {
        routineId,
        routineName: routine?.name ?? 'Rutina sin nombre',
        products: [...productCounts.entries()]
          .map(([productId, uses]) => {
            const product = productById.get(productId);

            if (!product) {
              return null;
            }

            const category = normalizeCategory(product.category);

            return {
              productId,
              name: product.name,
              ...(category ? { category } : {}),
              uses
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .sort((a, b) => b.uses - a.uses)
      };
    })
    .filter((routine) => routine.products.length > 0)
    .sort((a, b) => a.routineName.localeCompare(b.routineName));
}

function buildUnusedProducts(
  products: ProductForProgress[],
  allEvents: ProductUseEvent[],
  recentEvents: ProductUseEvent[]
): RoutineStats['products']['unusedProducts'] {
  const recentlyUsedProductIds = new Set(recentEvents.map((event) => event.productId));
  const lastUseByProductId = allEvents.reduce<Map<string, string>>((acc, event) => {
    const previousDate = acc.get(event.productId);

    if (!previousDate || event.date > previousDate) {
      acc.set(event.productId, event.date);
    }

    return acc;
  }, new Map());

  return products
    .filter((product) => !recentlyUsedProductIds.has(product.id))
    .map((product) => {
      const category = normalizeCategory(product.category);
      const lastUsedAt = lastUseByProductId.get(product.id);

      return {
        productId: product.id,
        name: product.name,
        ...(category ? { category } : {}),
        ...(lastUsedAt ? { lastUsedAt } : {})
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function countProductUses(events: ProductUseEvent[]): Map<string, number> {
  return events.reduce<Map<string, number>>((acc, event) => {
    acc.set(event.productId, (acc.get(event.productId) ?? 0) + 1);
    return acc;
  }, new Map());
}

function normalizeCategory(category: string | null | undefined): string | undefined {
  const normalized = category?.trim();
  return normalized ? normalized : undefined;
}

function buildDayProgress(
  date: string,
  logs: RoutineLog[],
  routines: RoutineForProgress[],
  dateValue: Date,
  today: Date
): CalendarDayProgress {
  const expectedRoutineIds = getExpectedRoutineIdsForDate(dateValue, routines, logs);
  const totalRoutines = expectedRoutineIds.size;
  const completedRoutines = Array.from(expectedRoutineIds).filter((routineId) => {
    const routineLog = logs.find((log) => log.routine_id === routineId);
    return routineLog ? isRoutineCompleted(routineLog) : false;
  }).length;
  const startedRoutines = Array.from(expectedRoutineIds).filter((routineId) => {
    const routineLog = logs.find((log) => log.routine_id === routineId);
    return routineLog ? isRoutinePartiallyCompleted(routineLog) : false;
  }).length;
  const todayIso = toIsoDate(today);
  const isToday = date === todayIso;
  const isDayFinished = date < todayIso;
  const completionPercentage = totalRoutines === 0 ? 0 : Math.round((completedRoutines / totalRoutines) * 100);
  const status = getCalendarDayStatus(totalRoutines, completedRoutines, startedRoutines);

  return {
    date,
    status,
    dayStatus: mapCalendarStatusToDayStatus(status),
    completedRoutines,
    totalRoutines,
    completionPercentage,
    isToday,
    isDayFinished
  };
}

function getExpectedRoutineIdsForDate(
  date: Date,
  routines: RoutineForProgress[],
  logs: RoutineLog[]
): Set<string> {
  const dateEnd = new Date(date);
  dateEnd.setUTCHours(23, 59, 59, 999);

  const routineIds = routines
    .filter((routine) => new Date(routine.created_at).getTime() <= dateEnd.getTime())
    .map((routine) => routine.id);

  return new Set([...routineIds, ...logs.map((log) => log.routine_id)]);
}

function getCalendarDayStatus(
  totalRoutines: number,
  completedRoutines: number,
  startedRoutines: number
): CalendarDayStatus {
  if (totalRoutines === 0) {
    return 'empty';
  }

  if (completedRoutines === totalRoutines) {
    return 'completed';
  }

  if (completedRoutines > 0 || startedRoutines > 0) {
    return 'partial';
  }

  return 'pending';
}

function mapCalendarStatusToDayStatus(status: CalendarDayStatus): DayProgressStatus {
  if (status === 'completed') {
    return 'complete';
  }

  if (status === 'partial') {
    return 'partial';
  }

  if (status === 'pending') {
    return 'pending';
  }

  return 'incomplete';
}

function mapCalendarProgressToStatsStatus(
  day: CalendarDayProgress
): RoutineStats['weekDays'][number]['status'] {
  if (day.status === 'empty') {
    return 'no_routine';
  }

  if (day.status === 'completed') {
    return 'complete';
  }

  if (day.status === 'partial') {
    return 'partial';
  }

  return day.isDayFinished ? 'incomplete' : 'pending';
}

function calculateStreakProgress(
  logs: RoutineLog[],
  routines: RoutineForProgress[] = [],
  today = startOfUtcDay(new Date())
): StreakProgress {
  if (routines.length === 0) {
    return calculateLogOnlyStreakProgress(logs, today);
  }

  const dayProgress = buildProgressRange(logs, routines, today);
  let longestStreak = 0;
  let currentRun = 0;

  for (const day of dayProgress) {
    if (day.status === 'completed') {
      currentRun += 1;
      longestStreak = Math.max(longestStreak, currentRun);
      continue;
    }

    if (day.isDayFinished && day.totalRoutines > 0) {
      currentRun = 0;
    }
  }

  const currentStreak = calculateCurrentStreak(dayProgress);

  return {
    currentStreak,
    longestStreak
  };
}

function calculateLogOnlyStreakProgress(logs: RoutineLog[], today: Date): StreakProgress {
  const dayEntries = Array.from(groupLogsByDate(logs).entries())
    .map(([date, dayLogs]) => {
      const dateValue = parseIsoDate(date);
      return buildDayProgress(date, dayLogs, [], dateValue, today);
    })
    .filter((day) => day.status !== 'empty')
    .sort((a, b) => a.date.localeCompare(b.date));

  let longestStreak = 0;
  let currentRun = 0;
  let previousCompletedDate: Date | null = null;

  for (const day of dayEntries) {
    if (day.status !== 'completed') {
      if (day.isDayFinished) {
        currentRun = 0;
        previousCompletedDate = null;
      }
      continue;
    }

    const currentDate = parseIsoDate(day.date);
    currentRun =
      previousCompletedDate && differenceInDays(currentDate, previousCompletedDate) === 1 ? currentRun + 1 : 1;
    longestStreak = Math.max(longestStreak, currentRun);
    previousCompletedDate = currentDate;
  }

  return {
    currentStreak: currentRun,
    longestStreak
  };
}

function buildProgressRange(
  logs: RoutineLog[],
  routines: RoutineForProgress[],
  today: Date
): CalendarDayProgress[] {
  const startDate = getProgressStartDate(logs, routines);

  if (!startDate) {
    return [];
  }

  const logsByDate = groupLogsByDate(logs);
  const days: CalendarDayProgress[] = [];

  for (let current = startDate; current <= today; current = addDays(current, 1)) {
    const date = toIsoDate(current);
    days.push(buildDayProgress(date, logsByDate.get(date) ?? [], routines, current, today));
  }

  return days;
}

function getProgressStartDate(logs: RoutineLog[], routines: RoutineForProgress[]): Date | null {
  const dates = [
    ...logs.map((log) => parseIsoDate(log.log_date)),
    ...routines.map((routine) => startOfUtcDay(new Date(routine.created_at)))
  ];

  if (dates.length === 0) {
    return null;
  }

  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

function calculateCurrentStreak(days: CalendarDayProgress[]): number {
  let streak = 0;

  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];

    if (!day.isDayFinished && day.status !== 'completed') {
      continue;
    }

    if (day.status === 'completed') {
      streak += 1;
      continue;
    }

    if (day.totalRoutines > 0) {
      break;
    }
  }

  return streak;
}

function isRoutineCompleted(log: RoutineLog): boolean {
  return log.completion_percentage >= 100;
}

function isRoutinePartiallyCompleted(log: RoutineLog): boolean {
  return log.completion_percentage > 0;
}

function groupLogsByDate(logs: RoutineLog[]): Map<string, RoutineLog[]> {
  return logs.reduce<Map<string, RoutineLog[]>>((acc, log) => {
    const currentLogs = acc.get(log.log_date) ?? [];
    currentLogs.push(log);
    acc.set(log.log_date, currentLogs);
    return acc;
  }, new Map());
}

function groupBy<TItem, TKey>(items: TItem[], getKey: (item: TItem) => TKey): Map<TKey, TItem[]> {
  return items.reduce<Map<TKey, TItem[]>>((acc, item) => {
    const key = getKey(item);
    const currentItems = acc.get(key) ?? [];
    currentItems.push(item);
    acc.set(key, currentItems);
    return acc;
  }, new Map());
}

function getRoutineDetailStatus(
  routineLog: RoutineLog | undefined,
  completedSteps: number,
  totalSteps: number
): 'complete' | 'partial' | 'pending' {
  if (routineLog && isRoutineCompleted(routineLog)) {
    return 'complete';
  }

  if (completedSteps > 0 || (routineLog?.completion_percentage ?? 0) > 0) {
    return 'partial';
  }

  if (totalSteps === 0 && routineLog && isRoutineCompleted(routineLog)) {
    return 'complete';
  }

  return 'pending';
}

function normalizeTimeOfDay(value: string | null | undefined): 'morning' | 'night' | 'custom' | undefined {
  if (value === 'morning' || value === 'night' || value === 'custom') {
    return value;
  }

  return undefined;
}

function getWeekdayLabel(date: Date): string {
  const labels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return labels[date.getUTCDay()];
}

function getMonday(date: Date): Date {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function differenceInDays(date: Date, previousDate: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date.getTime() - previousDate.getTime()) / millisecondsPerDay);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function isIsoDate(date: string): boolean {
  if (!isoDatePattern.test(date)) {
    return false;
  }

  return toIsoDate(parseIsoDate(date)) === date;
}
