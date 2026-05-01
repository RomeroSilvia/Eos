export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatStepCount(completed: number, total: number): string {
  return `${completed} de ${total} pasos completos`;
}
