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
  profile: '/profile'
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
