import type { CalendarDayStatus, DayProgressStatus, ProgressCTA, RoutineDayDetail, RoutineStats } from '@/types/progress';

export function calculatePercentage(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

export function pluralize(value: number, singular: string, plural: string): string {
  return value === 1 ? singular : plural;
}

export function formatDayCount(value: number): string {
  return `${value} ${pluralize(value, 'día', 'días')}`;
}

export function formatRoutineCount(completed: number, total: number): string {
  if (total === 0) {
    return 'Sin rutinas configuradas';
  }

  return `${completed} de ${total} ${pluralize(completed, 'rutina completada', 'rutinas completadas')}`;
}

export function formatUseCount(value: number): string {
  return `${value} ${pluralize(value, 'uso', 'usos')}`;
}

export function formatProductCount(value: number): string {
  return `${value} ${pluralize(value, 'producto', 'productos')}`;
}

export function formatStepCount(completed: number, total: number): string {
  return `${completed} de ${total} ${pluralize(total, 'paso', 'pasos')}`;
}

export function formatLastUsed(date?: string): string {
  if (!date) {
    return 'Nunca usado';
  }

  const today = new Date();
  const usedAt = new Date(`${date}T00:00:00.000Z`);
  const days = Math.max(0, Math.round((today.getTime() - usedAt.getTime()) / (24 * 60 * 60 * 1000)));

  if (days === 0) {
    return 'Último uso: hoy';
  }

  return `Último uso: hace ${formatDayCount(days)}`;
}

export function getCategoryLabel(category?: string): string {
  const labels: Record<string, string> = {
    cleanser: 'Limpieza',
    toner: 'Tónico',
    moisturizer: 'Hidratación',
    serum: 'Sérums',
    sunscreen: 'Protector solar',
    mask: 'Mascarillas',
    treatment: 'Tratamientos',
    other: 'Otros'
  };

  return category ? labels[category] ?? category : 'Otros';
}

export function getCalendarStatusLabel(status: CalendarDayStatus): string {
  if (status === 'completed') return 'Completo';
  if (status === 'partial') return 'Parcial';
  if (status === 'pending') return 'Pendiente';
  return 'Sin progreso';
}

export function getDayDetailStatusLabel(status: RoutineDayDetail['status']): string {
  if (status === 'complete') return 'Completo';
  if (status === 'partial') return 'Parcial';
  if (status === 'pending') return 'Pendiente';
  return 'Incompleto';
}

export function getHistoryDayStatusLabel(status: RoutineDayDetail['status']): string {
  if (status === 'complete') return 'Día completo';
  if (status === 'partial') return 'Día parcial';
  if (status === 'pending') return 'Pendiente';
  return 'Incompleto';
}

export function getStatsWeekDayStatusLabel(status: RoutineStats['weekDays'][number]['status']): string {
  if (status === 'complete') return 'Día completo';
  if (status === 'partial') return 'Día parcial';
  if (status === 'pending') return 'Todavía pendiente';
  if (status === 'incomplete') return 'Incompleto';
  return 'Sin rutina asignada';
}

export function getRoutineStatusLabel(status: RoutineDayDetail['routines'][number]['status']): string {
  if (status === 'complete') return 'Completa';
  if (status === 'partial') return 'Parcial';
  return 'Pendiente';
}

export function getRoutineTimeLabel(
  timeOfDay?: RoutineStats['routinesRanking'][number]['timeOfDay'] | RoutineDayDetail['routines'][number]['timeOfDay'],
  options: { includePrefix?: boolean } = {}
): string {
  const prefix = options.includePrefix ? 'Rutina de ' : '';

  if (timeOfDay === 'morning') return `${prefix}mañana`;
  if (timeOfDay === 'night') return `${prefix}noche`;
  if (timeOfDay === 'custom') return options.includePrefix ? 'Rutina personalizada' : 'Personalizada';
  return 'Rutina';
}

export function getDaySummaryText(detail: RoutineDayDetail): string {
  if (detail.status === 'complete') {
    return 'Completaste todas tus rutinas del día.';
  }

  return `Completaste ${detail.completedRoutines} de ${detail.totalRoutines} rutinas.`;
}

export function getWeeklyStatsMessage(weekly: RoutineStats['weekly']): string {
  if (weekly.totalExpectedRoutines === 0) return 'Todavía podés crear una rutina para esta semana.';
  if (weekly.completedRoutines === 0) return 'Todavía podés empezar la semana.';
  if (weekly.completedRoutines === weekly.totalExpectedRoutines) return 'Excelente constancia.';
  if (weekly.completionPercentage >= 50) return 'Vas por la mitad de tu semana.';
  return 'Cada rutina suma para sostener el hábito.';
}

export function getMonthlyStatsMessage(monthly: RoutineStats['monthly']): string {
  if (monthly.totalExpectedRoutines === 0) return 'Todavía no hay suficientes datos para comparar tu mes.';
  if (monthly.completeDays + monthly.partialDays === 0) return 'Todavía no hay suficientes datos para comparar tu mes.';
  return 'Este es el avance de tus rutinas durante el mes.';
}

export function getRoutineMotivationalMessage(stats: RoutineStats): string {
  if (stats.weekly.totalExpectedRoutines === 0) {
    return 'Todavía no tenés rutinas configuradas. Creá una rutina simple para empezar a registrar tu progreso.';
  }

  if (stats.weekly.completedRoutines === 0) {
    return 'Empezá con una rutina simple. La constancia se construye de a poco.';
  }

  if (stats.weekly.completionPercentage >= 90) {
    return 'Excelente constancia. Seguí manteniendo tu rutina.';
  }

  if (stats.weekly.completionPercentage >= 50) {
    return 'Vas muy bien. Mantené tu rutina para sostener la constancia.';
  }

  return 'Ya empezaste. Completá las rutinas pendientes para cerrar mejor la semana.';
}

export function getProductMotivationalMessage(stats: RoutineStats): string {
  const productStats = stats.products;

  if (productStats.productRanking.length === 0 && productStats.unusedProducts.length === 0) {
    return 'Todavía no registraste productos. Agregalos para mejorar el seguimiento de tu rutina.';
  }

  if (productStats.monthly.totalProductUses === 0) {
    return 'Tenés productos cargados, pero todavía no registraste usos en tus rutinas.';
  }

  if (productStats.monthly.distinctProductsUsed <= 3) {
    return 'Tu rutina se mantiene simple. Eso puede ayudar a sostener la constancia.';
  }

  return 'Estás usando varios productos. Revisá que cada uno tenga un propósito claro en tu rutina.';
}

export function getProgressCTA(params: {
  overallProgressPercentage: number;
  todayStatus: DayProgressStatus;
  completedTodayRoutines: number;
  totalTodayRoutines: number;
  hasPreviousProgress: boolean;
  streak: number;
  previousDayStatus?: DayProgressStatus;
}): ProgressCTA {
  const todayHasNoProgress = params.completedTodayRoutines === 0;
  const todayIsComplete =
    params.todayStatus === 'complete' ||
    (params.totalTodayRoutines > 0 && params.completedTodayRoutines === params.totalTodayRoutines);
  const yesterdayInterrupted =
    params.previousDayStatus === 'partial' ||
    params.previousDayStatus === 'incomplete' ||
    params.previousDayStatus === 'pending';

  if (todayIsComplete) {
    return {
      label: 'Ver progreso',
      description: 'Buen trabajo, día completo',
      target: 'progressHistory'
    };
  }

  if (params.overallProgressPercentage === 0 && !params.hasPreviousProgress) {
    return {
      label: 'Empezá a cuidarte',
      description: 'Completá tu primera rutina',
      target: 'todayRoutine'
    };
  }

  if (params.todayStatus === 'partial' || params.completedTodayRoutines > 0) {
    return {
      label: 'Terminá tu rutina de hoy',
      description: 'Ya empezaste, falta poco',
      target: 'todayRoutine'
    };
  }

  if (params.hasPreviousProgress && todayHasNoProgress && yesterdayInterrupted && params.streak === 0) {
    return {
      label: 'Volvé a empezar hoy',
      description: 'Cada rutina suma',
      target: 'todayRoutine'
    };
  }

  return {
    label: 'Seguí cuidándote',
    description: 'Completá tu rutina de hoy',
    target: 'todayRoutine'
  };
}

export function formatDateTitle(date?: string): string {
  if (!date) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric'
  }).format(new Date(`${date}T00:00:00.000Z`));
}
