import { progressRepository } from './progress.repository';
import type {
  CalendarDayProgress,
  CalendarDayStatus,
  DayProgressStatus,
  PeriodProgress,
  ProgressHistoryItem,
  ProgressSummary,
  RoutineDayDetail,
  RoutineForProgress,
  RoutineDayProgress,
  RoutineLog,
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
        name: routine?.name ?? `Rutina ${routineId.slice(0, 8)}`,
        timeOfDay: normalizeTimeOfDay(routine?.time_of_day),
        status: getRoutineDetailStatus(routineLog, completedSteps, detailSteps.length),
        completedSteps,
        totalSteps: detailSteps.length,
        steps: detailSteps
      };
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
