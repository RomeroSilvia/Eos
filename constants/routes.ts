export const routes = {
  login: '/login',
  register: '/register',
  home: '/home',
  routine: '/routine',
  products: '/products',
  specialists: '/specialists',
  specialistDetail: '/specialists/[id]',
  chat: '/chat',
  progress: '/progress',
  progressHistory: '/progress/history',
  progressDayDetail: '/progress/history/[date]',
  progressStats: '/progress/stats',
  profile: '/profile',
  notifications: '/notifications'
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
