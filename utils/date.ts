export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short'
  }).format(date);
}

export function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}
