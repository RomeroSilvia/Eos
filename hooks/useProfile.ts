import { useAuthSession } from '@/hooks/useAuthSession';

export function useProfile() {
  const { isLoading, profile } = useAuthSession();

  return { isLoading, profile };
}
