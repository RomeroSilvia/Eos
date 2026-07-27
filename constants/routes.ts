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

  startQuiz: '/start-quiz',
  startDiagnosis: '/start-diagnosis',
  quiz: '/quiz',
  quizResults: '/quiz-results',
  resultados: '/resultados',

  routineCreate: '/routine/Create',
  routineAddStep: '/routine/Add-step',
  routineEdit: '/routine/routine-edit',

  productCreate: '/products/create',
  productResult: '/products/result',
  productDetail: '/products/[id]',

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
  adminMetrics: '/(tabs-admin)/metrics',
  adminMetricsDetail: '/(tabs-admin)/metrics/[centerId]'
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
