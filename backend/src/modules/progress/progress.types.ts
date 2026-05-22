import type { Tables, TablesInsert, TablesUpdate } from '../../database/database.types';

export type RoutineLog = Tables<'routine_logs'>;
export type RoutineLogInsert = TablesInsert<'routine_logs'>;
export type RoutineLogUpdate = TablesUpdate<'routine_logs'>;
export type RoutineStepLog = Tables<'routine_step_logs'>;
export type RoutineStepLogInsert = TablesInsert<'routine_step_logs'>;
export type RoutineStepLogUpdate = TablesUpdate<'routine_step_logs'>;

export type RoutineForProgress = Pick<Tables<'routines'>, 'id' | 'name' | 'time_of_day' | 'created_at'>;
export type RoutineStepForProgress = Pick<Tables<'routine_steps'>, 'id' | 'routine_id' | 'name' | 'step_order'>;
export type ProductForProgress = Pick<Tables<'products'>, 'id' | 'name' | 'category' | 'created_at'>;
export type RoutineStepProductForProgress = Pick<Tables<'routine_step_products'>, 'step_id' | 'product_id'>;

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
export type DayProgressStatus = 'complete' | 'partial' | 'incomplete' | 'pending';

export type CalendarDayProgress = {
  date: string;
  status: CalendarDayStatus;
  dayStatus?: DayProgressStatus;
  completedRoutines: number;
  totalRoutines: number;
  completionPercentage: number;
  isToday: boolean;
  isDayFinished: boolean;
};

export type ProgressSummary = {
  userId?: string;
  completedRoutines?: number;
  totalRoutines?: number;
  completedDays?: number;
  currentStreak?: number;
  bestStreak?: number;
  completionRate?: number;
  weeklyProgress: PeriodProgress;
  monthlyProgress: PeriodProgress;
  streakProgress: StreakProgress;
  calendarProgress: CalendarDayProgress[];
};

export type ProgressHistoryItem = RoutineLog;

export type RoutineDayProgress = {
  routine_id: string;
  log_date: string;
  routine_log_id: string | null;
  completed_step_ids: string[];
  completion_percentage: number;
};

export type RoutineDayDetail = {
  date: string;
  status: DayProgressStatus;
  completionPercentage: number;
  completedRoutines: number;
  totalRoutines: number;
  routines: {
    id: string;
    name: string;
    timeOfDay?: 'morning' | 'night' | 'custom';
    status: 'complete' | 'partial' | 'pending';
    completedSteps: number;
    totalSteps: number;
    steps: {
      id: string;
      name: string;
      completed: boolean;
      productName?: string;
    }[];
  }[];
};

export type ProgressHistoryDay = {
  date: string;
  status: DayProgressStatus;
  completionPercentage: number;
  completedRoutines: number;
  totalExpectedRoutines: number;
  routines: {
    routineId: string;
    routineName: string;
    timeOfDay?: 'morning' | 'night' | 'custom';
    status: 'complete' | 'partial' | 'pending';
    completedSteps: number;
    totalSteps: number;
    steps?: {
      stepId: string;
      stepName: string;
      completed: boolean;
      productName?: string;
    }[];
  }[];
};

export type RoutineStats = {
  weekly: {
    completionPercentage: number;
    completedRoutines: number;
    totalExpectedRoutines: number;
    currentStreak: number;
    bestStreak: number;
  };
  monthly: {
    completionPercentage: number;
    completedRoutines: number;
    totalExpectedRoutines: number;
    completeDays: number;
    partialDays: number;
    incompleteDays: number;
    noRoutineDays: number;
  };
  weekDays: {
    date: string;
    dayLabel: string;
    status: 'complete' | 'partial' | 'incomplete' | 'pending' | 'no_routine';
    completedRoutines: number;
    totalExpectedRoutines: number;
    completionPercentage: number;
  }[];
  routinesRanking: {
    routineId: string;
    routineName: string;
    timeOfDay?: 'morning' | 'night' | 'custom';
    completedCount: number;
    expectedCount: number;
    completionPercentage: number;
  }[];
  products: {
    weekly: {
      totalProductUses: number;
      distinctProductsUsed: number;
      mostUsedProduct?: {
        productId: string;
        name: string;
        category?: string;
        uses: number;
      };
    };
    monthly: {
      totalProductUses: number;
      distinctProductsUsed: number;
    };
    productRanking: {
      productId: string;
      name: string;
      category?: string;
      weeklyUses: number;
      monthlyUses: number;
      totalUses: number;
      usagePercentage: number;
    }[];
    categoryStats: {
      category: string;
      uses: number;
      percentage: number;
    }[];
    routineProductUsage: {
      routineId: string;
      routineName: string;
      products: {
        productId: string;
        name: string;
        category?: string;
        uses: number;
      }[];
    }[];
    unusedProducts: {
      productId: string;
      name: string;
      category?: string;
      lastUsedAt?: string;
    }[];
  };
};
