/**
* Aliases de conveniencia derivados de Database.
*
* Todos los tipos se derivan del tipo central en database.types.ts
* para mantener la consistencia y evitar duplicación de tipos.
 */

import type { Tables, TablesInsert, TablesUpdate } from './database.types';

// ─── Row types (lectura) ──────────────────────────────────────────────────────

export type ProfileRow            = Tables<'profiles'>;
export type RoutineRow            = Tables<'routines'>;
export type RoutineStepRow        = Tables<'routine_steps'>;
export type ProductRow            = Tables<'products'>;
export type SkinProfileRow        = Tables<'skin_profiles'>;
export type RoutineStepProductRow = Tables<'routine_step_products'>;
export type RoutineLogRow         = Tables<'routine_logs'>;
export type RoutineStepLogRow     = Tables<'routine_step_logs'>;

// ─── Insert types (escritura) ─────────────────────────────────────────────────

export type ProfileInsert           = TablesInsert<'profiles'>;
export type RoutineInsert           = TablesInsert<'routines'>;
export type RoutineStepInsert       = TablesInsert<'routine_steps'>;
export type ProductInsert           = TablesInsert<'products'>;
export type SkinProfileInsert       = TablesInsert<'skin_profiles'>;
export type RoutineStepProductInsert = TablesInsert<'routine_step_products'>;
export type RoutineLogInsert        = TablesInsert<'routine_logs'>;
export type RoutineStepLogInsert    = TablesInsert<'routine_step_logs'>;

// ─── Update types (actualización parcial) ─────────────────────────────────────

export type ProfileUpdate        = TablesUpdate<'profiles'>;
export type RoutineUpdate        = TablesUpdate<'routines'>;
export type RoutineStepUpdate    = TablesUpdate<'routine_steps'>;
export type ProductUpdate        = TablesUpdate<'products'>;
export type SkinProfileUpdate    = TablesUpdate<'skin_profiles'>;
export type RoutineLogUpdate     = TablesUpdate<'routine_logs'>;
export type RoutineStepLogUpdate = TablesUpdate<'routine_step_logs'>;
