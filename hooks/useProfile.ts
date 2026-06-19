import { useEffect, useState } from 'react';
import { getCurrentProfile } from '@/services/auth';
import type { UserProfile } from '@/types/user';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    void getCurrentProfile()
      .then((nextProfile) => {
        if (isActive) {
          setProfile(nextProfile);
        }
      })
      .catch(() => {
        if (isActive) {
          setProfile(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  return { isLoading, profile };
}
