export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short'
  }).format(date);
}

// Comparan contra la hora local del dispositivo (no UTC): estas fechas
// vienen de timestamps de notificaciones y se muestran tal como el
// usuario las percibe en su reloj, no como fechas de calendario UTC.
export function isToday(date: Date): boolean {
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}
