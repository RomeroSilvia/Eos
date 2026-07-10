export const routes = {
  login: '/login',
  register: '/register',
  home: '/home',
  routine: '/routine',
  products: '/products',
  specialists: '/specialists',
  specialistDetail: '/specialists/[id]',
  specialistPatients: '/(tabs-specialist)/pacientes',
  specialistPatientDetail: '/patients/[id]',
  chat: '/chat',
  progress: '/progress',
  progressHistory: '/progress/history',
  progressDayDetail: '/progress/history/[date]',
  progressStats: '/progress/stats',
  profile: '/profile',
  settings: '/settings',
  notifications: '/notifications',
  adminPlans: '/(tabs-admin)/plans'
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
