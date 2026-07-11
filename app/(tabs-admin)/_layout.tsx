import { Stack } from 'expo-router';
import { AuthRouteGuard } from '@/components/auth/AuthRouteGuard';

export default function AdminLayout() {
  return (
    <AuthRouteGuard allowedRoles={['center_admin']} mode="private">
      <Stack screenOptions={{ headerShown: false }} />
    </AuthRouteGuard>
  );
}
