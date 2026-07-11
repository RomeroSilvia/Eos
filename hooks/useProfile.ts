import { useEffect, useState } from 'react';
import { getCurrentProfile, synchronizeCurrentProfile } from '@/services/auth';
import { onSessionInvalidated } from '@/services/session';
import type { UserProfile } from '@/types/user';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      const cachedProfile = await getCurrentProfile().catch(() => null);

      if (isActive) {
        setProfile(cachedProfile);
      }

      const syncedProfile = await synchronizeCurrentProfile();

      if (isActive) {
        setProfile(syncedProfile);
        setIsLoading(false);
      }
    }

    void loadProfile()
      .catch(() => {
        if (isActive) {
          setProfile(null);
          setIsLoading(false);
        }
      });

    const unsubscribe = onSessionInvalidated(() => {
      if (isActive) {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return { isLoading, profile };
}
