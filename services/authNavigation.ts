import type { UserRole } from '@/types/user';

export type HomeRoute = '/(tabs)/home' | '/(tabs-admin)' | '/(tabs-specialist)';
export type PostLoginRoute = HomeRoute | '/specialist-status';
export type AuthRedirectRoute = HomeRoute | '/(auth)/login';

const standalonePrivateSegments = [
  'chat',
  'notifications',
  'patients',
  'products',
  'progress',
  'quiz',
  'quiz-results',
  'resultados',
  'routine',
  'settings',
  'specialist-status',
  'specialists'
];

type AuthGuardRedirectInput = {
  allowedRoles?: UserRole[];
  hasSession: boolean;
  isAuthRoute?: boolean;
  isLoading: boolean;
  role?: string | null;
};

export function isKnownRole(role?: string | null): role is UserRole {
  return role === 'user' || role === 'specialist' || role === 'center_admin';
}

export function getHomeRouteForRole(role: UserRole): HomeRoute {
  if (role === 'center_admin') {
    return '/(tabs-admin)';
  }

  if (role === 'specialist') {
    return '/(tabs-specialist)';
  }

  return '/(tabs)/home';
}

export function isStandalonePrivateSegment(segment?: string): boolean {
  return Boolean(segment && standalonePrivateSegments.includes(segment));
}

export function getStandalonePrivateAllowedRoles(segment?: string): UserRole[] | undefined {
  if (segment === 'specialist-status') {
    return ['specialist'];
  }

  return undefined;
}

export function getAuthGuardRedirect({
  allowedRoles,
  hasSession,
  isAuthRoute = false,
  isLoading,
  role
}: AuthGuardRedirectInput): AuthRedirectRoute | null {
  if (isLoading) {
    return null;
  }

  if (isAuthRoute) {
    if (!hasSession) {
      return null;
    }

    return isKnownRole(role) ? getHomeRouteForRole(role) : null;
  }

  if (!hasSession) {
    return '/(auth)/login';
  }

  if (!isKnownRole(role)) {
    return '/(auth)/login';
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return getHomeRouteForRole(role);
  }

  return null;
}
