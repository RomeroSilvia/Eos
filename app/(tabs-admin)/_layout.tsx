import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';

export default function AdminLayout() {
  const router = useRouter();
  const { profile } = useProfile();

  useEffect(() => {
    if (!profile) return;

    if (profile.role === 'specialist') {
      router.replace('/specialist-status' as never);
      return;
    }

    if (profile.role !== 'center_admin') {
      router.replace('/(tabs)/home' as never);
    }
  }, [profile, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
