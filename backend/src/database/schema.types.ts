export type Timestamp = string;
export type Uuid = string;

export type ProfileRow = {
  id: Uuid;
  full_name: string;
  email: string | null;
  skin_type: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type RoutineRow = {
  id: Uuid;
  user_id: Uuid;
  name: string;
  description: string | null;
  time_of_day: string | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type RoutineStepRow = {
  id: Uuid;
  routine_id: Uuid;
  name: string;
  description: string | null;
  category: string | null;
  step_order: number;
  is_required: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ProductRow = {
  id: Uuid;
  user_id: Uuid;
  name: string;
  brand: string | null;
  category: string | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type RoutineStepProductRow = {
  id: Uuid;
  step_id: Uuid;
  product_id: Uuid;
  created_at: Timestamp;
};

export type RoutineLogRow = {
  id: Uuid;
  user_id: Uuid;
  routine_id: Uuid;
  log_date: string;
  completed_at: Timestamp | null;
  completion_percentage: number;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type RoutineStepLogRow = {
  id: Uuid;
  routine_log_id: Uuid;
  step_id: Uuid;
  is_completed: boolean;
  completed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ProfileInsert = Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>;
export type RoutineInsert = Omit<RoutineRow, 'id' | 'created_at' | 'updated_at'>;
export type RoutineStepInsert = Omit<RoutineStepRow, 'id' | 'created_at' | 'updated_at'>;
export type ProductInsert = Omit<ProductRow, 'id' | 'created_at' | 'updated_at'>;
export type RoutineLogInsert = Omit<RoutineLogRow, 'id' | 'created_at' | 'updated_at'>;
export type RoutineStepLogInsert = Omit<RoutineStepLogRow, 'id' | 'created_at' | 'updated_at'>;

export type ProfileUpdate = Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>;
export type RoutineUpdate = Partial<Omit<RoutineRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type RoutineStepUpdate = Partial<Omit<RoutineStepRow, 'id' | 'routine_id' | 'created_at' | 'updated_at'>>;
export type ProductUpdate = Partial<Omit<ProductRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type RoutineLogUpdate = Partial<Omit<RoutineLogRow, 'id' | 'user_id' | 'routine_id' | 'created_at' | 'updated_at'>>;
export type RoutineStepLogUpdate = Partial<Omit<RoutineStepLogRow, 'id' | 'routine_log_id' | 'step_id' | 'created_at' | 'updated_at'>>;
