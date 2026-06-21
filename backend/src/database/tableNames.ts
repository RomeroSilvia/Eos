export const TABLE_NAMES = {
  profiles: 'profiles',
  routines: 'routines',
  routineSteps: 'routine_steps',
  products: 'products',
  specialistProfiles: 'specialist_profiles',
  skinProfiles: 'skin_profiles',
  routineStepProducts: 'routine_step_products',
  routineLogs: 'routine_logs',
  routineStepLogs: 'routine_step_logs',
  pushTokens: 'push_tokens'
} as const;

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];
