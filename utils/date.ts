export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short'
  }).format(date);
}

export function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
