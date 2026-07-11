import { useEffect, useRef } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';
import { getAuthGuardRedirect } from '@/services/authNavigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import type { UserRole } from '@/types/user';

type AuthGuardMode = 'auth' | 'private';

type AuthGuardOptions = {
  allowedRoles?: UserRole[];
  mode: AuthGuardMode;
};

export function useAuthGuard({ allowedRoles, mode }: AuthGuardOptions) {
  const authSession = useAuthSession();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const lastRedirectRef = useRef<string | null>(null);
  const isRouterReady = Boolean(rootNavigationState?.key);
  const redirectTo = isRouterReady
    ? getAuthGuardRedirect({
      allowedRoles,
      hasSession: authSession.hasSession,
      isAuthRoute: mode === 'auth',
      isLoading: authSession.isLoading,
      role: authSession.role
    })
    : null;

  useEffect(() => {
    if (!isRouterReady || !redirectTo) {
      lastRedirectRef.current = null;
      return;
    }

    if (lastRedirectRef.current === redirectTo) {
      return;
    }

    lastRedirectRef.current = redirectTo;
    router.replace(redirectTo as never);
  }, [isRouterReady, redirectTo, router]);

  return {
    ...authSession,
    canRender: isRouterReady && !authSession.isLoading && !redirectTo,
    isGuardLoading: !isRouterReady || authSession.isLoading || Boolean(redirectTo),
    redirectTo
  };
}
