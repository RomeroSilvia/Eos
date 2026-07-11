import type { ReactNode } from 'react';
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import type { UserRole } from '@/types/user';

type AuthRouteGuardProps = {
  allowedRoles?: UserRole[];
  children: ReactNode;
  mode: 'auth' | 'private';
};

export function AuthRouteGuard({ allowedRoles, children, mode }: AuthRouteGuardProps) {
  const guard = useAuthGuard({ allowedRoles, mode });

  if (!guard.canRender) {
    return <AuthLoadingScreen />;
  }

  return children;
}
