import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { routes } from '@/constants/routes';
import { useProfile } from '@/hooks/useProfile';

export default function AdminLayout() {
  const router = useRouter();
  const { profile } = useProfile();

  useEffect(() => {
    if (!profile) return;

    if (profile.role === 'specialist') {
      router.replace(routes.specialistStatus as never);
      return;
    }

    if (profile.role !== 'center_admin') {
      router.replace(routes.userHome as never);
    }
  }, [profile, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
