import { useEffect, useState } from 'react';
import { getCurrentProfile } from '@/services/auth';
import type { UserProfile } from '@/types/user';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    void getCurrentProfile().then(setProfile);
  }, []);

  return { profile };
}
