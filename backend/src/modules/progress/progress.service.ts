import { progressRepository } from './progress.repository';
import type {
  CalendarDayProgress,
  CalendarDayStatus,
  PeriodProgress,
  ProgressHistoryItem,
  ProgressSummary,
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
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));

  const [allLogs, weeklyLogs, monthlyLogs] = await Promise.all([
    progressRepository.findRoutineLogsByUserId(userId),
    progressRepository.findRoutineLogsByUserIdBetweenDates(userId, toIsoDate(weekStart), toIsoDate(today)),
    progressRepository.findRoutineLogsByUserIdBetweenDates(userId, toIsoDate(monthStart), toIsoDate(monthEnd))
  ]);

  const weeklyProgress = calculatePeriodProgress(weeklyLogs);
  const monthlyProgress = calculatePeriodProgress(monthlyLogs);
  const streakProgress = calculateStreakProgress(allLogs);
  const calendarProgress = buildCalendarProgress(monthlyLogs, monthStart, monthEnd);
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

function calculatePeriodProgress(logs: RoutineLog[]): PeriodProgress {
  const totalRoutines = logs.length;
  const completedRoutines = logs.filter(isRoutineCompleted).length;

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

function buildCalendarProgress(logs: RoutineLog[], monthStart: Date, monthEnd: Date): CalendarDayProgress[] {
  const logsByDate = groupLogsByDate(logs);
  const days: CalendarDayProgress[] = [];

  for (let current = new Date(monthStart); current <= monthEnd; current = addDays(current, 1)) {
    const date = toIsoDate(current);
    const dayLogs = logsByDate.get(date) ?? [];

    days.push({
      date,
      status: getCalendarDayStatus(dayLogs)
    });
  }

  return days;
}

function getCalendarDayStatus(logs: RoutineLog[]): CalendarDayStatus {
  if (logs.length === 0) {
    return 'empty';
  }

  if (logs.some(isRoutineCompleted)) {
    return 'completed';
  }

  if (logs.some(isRoutinePartiallyCompleted)) {
    return 'partial';
  }

  return 'pending';
}

function calculateStreakProgress(logs: RoutineLog[]): StreakProgress {
  const completedDates = new Set(
    Array.from(groupLogsByDate(logs).entries())
      .filter(([, dayLogs]) => getCalendarDayStatus(dayLogs) === 'completed')
      .map(([date]) => date)
  );
  const sortedDates = Array.from(completedDates).sort();
  let longestStreak = 0;
  let currentRun = 0;
  let lastRun = 0;
  let previousDate: Date | null = null;

  for (const date of sortedDates) {
    const currentDate = parseIsoDate(date);

    if (previousDate && differenceInDays(currentDate, previousDate) === 1) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }

    longestStreak = Math.max(longestStreak, currentRun);
    lastRun = currentRun;
    previousDate = currentDate;
  }

  return {
    currentStreak: sortedDates.length === 0 ? 0 : lastRun,
    longestStreak
  };
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

function differenceInDays(date: Date, previousDate: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date.getTime() - previousDate.getTime()) / millisecondsPerDay);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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
