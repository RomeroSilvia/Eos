import type { CalendarDayProgress, CalendarDayStatus } from '@/types/progress';

export type CalendarGridCell =
  | {
      id: string;
      type: 'spacer';
    }
  | {
      id: string;
      type: 'day';
      date: string;
      day: number;
      status: CalendarDayStatus;
    };

const monthFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
});

export function buildCalendarGrid(visibleMonth: Date, days: CalendarDayProgress[]): CalendarGridCell[] {
  const year = visibleMonth.getUTCFullYear();
  const month = visibleMonth.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingSpacers = getMondayBasedWeekday(firstDay);
  const progressByDate = new Map(days.map((day) => [day.date, day]));
  const cells: CalendarGridCell[] = [];

  for (let index = 0; index < leadingSpacers; index += 1) {
    cells.push({ id: `leading-${year}-${month}-${index}`, type: 'spacer' });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = formatDateKey(year, month, day);
    const progressDay = progressByDate.get(date);

    cells.push({
      id: date,
      type: 'day',
      date,
      day,
      status: progressDay?.status ?? 'empty'
    });
  }

  const trailingSpacers = (7 - (cells.length % 7)) % 7;

  for (let index = 0; index < trailingSpacers; index += 1) {
    cells.push({ id: `trailing-${year}-${month}-${index}`, type: 'spacer' });
  }

  return cells;
}

export function getInitialVisibleMonth(days: CalendarDayProgress[]): Date {
  const firstDate = days[0]?.date;

  if (!firstDate) {
    const today = new Date();
    return new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
  }

  const [year, month] = firstDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

export function formatMonthTitle(date: Date): string {
  const formatted = monthFormatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getMondayBasedWeekday(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
