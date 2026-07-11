import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { useAuthSession } from '@/hooks/useAuthSession';
import { getPostLoginRoute } from '@/services/auth';

export default function AuthLayout() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { isLoading, profile } = useAuthSession();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isRouterReady = Boolean(rootNavigationState?.key);

  useEffect(() => {
    let isActive = true;

    async function redirectAuthenticatedUser() {
      if (!isRouterReady || isLoading) {
        return;
      }

      if (!profile) {
        setIsRedirecting(false);
        return;
      }

      setIsRedirecting(true);
      const route = await getPostLoginRoute(profile);

      if (isActive) {
        router.replace(route as never);
      }
    }

    void redirectAuthenticatedUser();

    return () => {
      isActive = false;
    };
  }, [isLoading, isRouterReady, profile, router]);

  if (!isRouterReady || isLoading || profile || isRedirecting) {
    return <AuthLoadingScreen />;
  }

  return (
    <Stack initialRouteName="login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="update-password" />
    </Stack>
  );
}
