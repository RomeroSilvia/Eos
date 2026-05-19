import type { Product } from './product';

export type RoutineTimeOfDay = 'morning' | 'night' | 'custom';

export type Routine = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  time_of_day: RoutineTimeOfDay | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  routine_steps?: RoutineStep[];
};

export type RoutineStep = {
  id: string;
  routine_id: string;
  name: string;
  description: string | null;
  category: string | null;
  step_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
  products?: Product[];
};

export type StepStatus = 'pending' | 'completed';
