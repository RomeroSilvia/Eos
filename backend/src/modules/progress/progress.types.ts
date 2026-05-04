export type PeriodProgress = {
    percent: number;
    completedRoutines: number;
    totalRoutines: number;
};

export type StreakProgress = {
    currentStreak: number;
    longestStreak?: number;
};


export type CalendarDayStatus = 'completed' | 'partial' | 'pending' | 'empty';

export type CalendarDayProgress = {
    date: string; // ISO date string
    status: CalendarDayStatus;
};

export type ProgressSummary = {
    weeklyProgress: PeriodProgress;
    streakProgress: StreakProgress;
    calendarProgress: CalendarDayProgress[];
    monthlyProgress: PeriodProgress;

    // Otras estadísticas relevantes pueden ser añadidas aquí
    // Por ejemplo, porcentaje de Productos más usados del mes.
    // Categorías más usadas: limpieza, hidratación, sérum, protector solar, exfoliante, mascarilla.
    // Cuidados complementarios usados por mes.
    // etc.  
};
