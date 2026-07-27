export const routes = {
  landing: '/landing',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  updatePassword: '/update-password',

  home: '/home',
  userHome: '/(tabs)/home',
  routine: '/routine',
  products: '/products',
  specialists: '/specialists',
  specialistDetail: '/specialists/[id]',
  specialistStatus: '/specialist-status',
  chat: '/chat',
  progress: '/progress',
  progressHistory: '/progress/history',
  progressDayDetail: '/progress/history/[date]',
  progressStats: '/progress/stats',
  profile: '/profile',
  settings: '/settings',
  notifications: '/notifications',

  routineCreate: '/routine/Create',

  specialistHome: '/(tabs-specialist)',
  specialistConsultas: '/(tabs-specialist)/consultas',
  specialistPatients: '/(tabs-specialist)/pacientes',
  specialistPatientDetail: '/patients/[id]',
  specialistRutinas: '/(tabs-specialist)/rutinas',
  specialistProfile: '/(tabs-specialist)/profile',

  adminHome: '/(tabs-admin)',
  adminPlans: '/(tabs-admin)/plans',
  adminAuditLog: '/(tabs-admin)/audit-log',
  adminCenters: '/(tabs-admin)/centers',
  adminMetrics: '/(tabs-admin)/metrics'
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
