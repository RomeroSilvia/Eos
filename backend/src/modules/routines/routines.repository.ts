import type {
  ProductRow,
  RoutineInsert,
  RoutineRow,
  RoutineStepInsert,
  RoutineStepProductRow,
  RoutineStepRow,
  RoutineStepUpdate,
  RoutineUpdate
} from '../../database/schema.types';

export const routinesRepository = {
  findAllByUserId: async (_userId: string): Promise<RoutineRow[]> => {
    // TODO: Implement Supabase query to get routines by user id.
    return [];
  },

  findById: async (_routineId: string, _userId: string): Promise<RoutineRow | null> => {
    // TODO: Implement Supabase query to get routine by id and user id.
    return null;
  },

  create: async (_data: RoutineInsert): Promise<RoutineRow | null> => {
    // TODO: Implement Supabase query to create a routine.
    return null;
  },

  update: async (_routineId: string, _userId: string, _data: RoutineUpdate): Promise<RoutineRow | null> => {
    // TODO: Implement Supabase query to update a routine by id and user id.
    return null;
  },

  remove: async (_routineId: string, _userId: string): Promise<boolean> => {
    // TODO: Implement Supabase query to delete a routine by id and user id.
    return false;
  },

  findStepsByRoutineId: async (_routineId: string): Promise<RoutineStepRow[]> => {
    // TODO: Implement Supabase query to get routine steps by routine id.
    return [];
  },

  createStep: async (_data: RoutineStepInsert): Promise<RoutineStepRow | null> => {
    // TODO: Implement Supabase query to create a routine step.
    return null;
  },

  updateStep: async (_stepId: string, _data: RoutineStepUpdate): Promise<RoutineStepRow | null> => {
    // TODO: Implement Supabase query to update a routine step.
    return null;
  },

  removeStep: async (_stepId: string): Promise<boolean> => {
    // TODO: Implement Supabase query to delete a routine step.
    return false;
  },

  findProductsByStepId: async (_stepId: string): Promise<ProductRow[]> => {
    // TODO: Implement Supabase query to get products attached to a routine step.
    return [];
  },

  attachProductToStep: async (_stepId: string, _productId: string): Promise<RoutineStepProductRow | null> => {
    // TODO: Implement Supabase query to attach a product to a routine step.
    return null;
  },

  detachProductFromStep: async (_stepId: string, _productId: string): Promise<boolean> => {
    // TODO: Implement Supabase query to detach a product from a routine step.
    return false;
  }
};
