import { progressRepository } from './progress.repository';
import type {
  CalendarDayProgress,
  CalendarDayStatus,
  PeriodProgress,
  ProgressHistoryItem,
  ProgressSummary,
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

  return {
    weeklyProgress: calculatePeriodProgress(weeklyLogs),
    monthlyProgress: calculatePeriodProgress(monthlyLogs),
    streakProgress: calculateStreakProgress(allLogs, today),
    calendarProgress: buildCalendarProgress(monthlyLogs, monthStart, monthEnd)
  };
}

export async function getHistoryByDate(userId: string, date: string): Promise<ProgressHistoryItem[]> {
  if (!isIsoDate(date)) {
    throw new Error('date must use YYYY-MM-DD format');
  }

  return progressRepository.findRoutineLogsByUserIdAndDate(userId, date);
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

  const completedCount = logs.filter(isRoutineCompleted).length;

  if (completedCount === logs.length) {
    return 'completed';
  }

  if (completedCount > 0) {
    return 'partial';
  }

  return 'pending';
}

function calculateStreakProgress(logs: RoutineLog[], today: Date): StreakProgress {
  const completedDates = new Set(logs.filter(isRoutineCompleted).map((log) => log.log_date));
  const sortedDates = Array.from(completedDates).sort();
  let longestStreak = 0;
  let currentRun = 0;
  let previousDate: Date | null = null;

  for (const date of sortedDates) {
    const currentDate = parseIsoDate(date);

    if (previousDate && differenceInDays(currentDate, previousDate) === 1) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }

    longestStreak = Math.max(longestStreak, currentRun);
    previousDate = currentDate;
  }

  let currentStreak = 0;

  for (let current = new Date(today); completedDates.has(toIsoDate(current)); current = addDays(current, -1)) {
    currentStreak += 1;
  }

  return {
    currentStreak,
    longestStreak
  };
}

function isRoutineCompleted(log: RoutineLog): boolean {
  return log.completion_percentage >= 100 || log.completed_at !== null;
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
