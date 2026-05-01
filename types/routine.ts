import type { Product } from './product';

export type StepStatus = 'completed' | 'pending';

export type RoutineCategory = 'morning' | 'night' | 'custom';

export type RoutineStep = {
  id: string;
  title: string;
  category: RoutineCategory;
  products: Product[];
  status: StepStatus;
  order: number;
};

export type Routine = {
  id: string;
  name: string;
  category: RoutineCategory;
  steps: RoutineStep[];
};
