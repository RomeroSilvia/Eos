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
  profile: '/profile',
  notifications: '/notifications'
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
