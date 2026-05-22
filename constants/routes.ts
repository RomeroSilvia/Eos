export const routes = {
  login: '/login',
  register: '/register',
  home: '/home',
  routine: '/routine',
  products: '/products',
  progress: '/progress',
  progressHistory: '/progress/history',
  progressStats: '/progress/stats',
  progressDayDetail: '/progress/history/[date]',
  profile: '/profile'
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
