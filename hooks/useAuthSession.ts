import { useCallback, useEffect, useState } from 'react';
import { getStoredSession, onSessionInvalidated } from '@/services/session';
import { logout as logoutUser, synchronizeCurrentProfile } from '@/services/auth';
import type { UserProfile, UserRole } from '@/types/user';

type AuthSessionState = {
  error: Error | null;
  hasSession: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  profile: UserProfile | null;
  revalidate: () => Promise<void>;
  role: UserRole | null;
};

type AuthSessionSnapshot = Omit<AuthSessionState, 'logout' | 'revalidate'>;

const authSessionSubscribers = new Set<() => void>();
let authSessionSnapshot: AuthSessionSnapshot = {
  error: null,
  hasSession: false,
  isLoading: true,
  profile: null,
  role: null
};
let invalidatedUnsubscribe: (() => void) | null = null;
let revalidateInFlight: Promise<void> | null = null;
let lastValidatedAt = 0;

export function useAuthSession(): AuthSessionState {
  const [snapshot, setSnapshotState] = useState<AuthSessionSnapshot>(authSessionSnapshot);

  const revalidate = useCallback(async () => {
    await revalidateAuthSession({ force: true });
  }, []);

  useEffect(() => {
    ensureSessionInvalidationListener();

    const updateSnapshot = () => setSnapshotState(authSessionSnapshot);
    authSessionSubscribers.add(updateSnapshot);
    updateSnapshot();

    void revalidateAuthSession({
      force: !authSessionSnapshot.hasSession || !authSessionSnapshot.profile
    });

    return () => {
      authSessionSubscribers.delete(updateSnapshot);
    };
  }, []);

  return {
    ...snapshot,
    logout: logoutUser,
    revalidate
  };
}

async function revalidateAuthSession(options: { force?: boolean } = {}): Promise<void> {
  if (revalidateInFlight) {
    return revalidateInFlight;
  }

  if (!options.force && lastValidatedAt && Date.now() - lastValidatedAt < 1000) {
    return;
  }

  revalidateInFlight = revalidateAuthSessionInternal();

  try {
    await revalidateInFlight;
  } finally {
    revalidateInFlight = null;
  }
}

async function revalidateAuthSessionInternal(): Promise<void> {
  setAuthSessionSnapshot({
    error: null,
    isLoading: true
  });

  try {
    const storedSession = await getStoredSession();

    setAuthSessionSnapshot({
      hasSession: Boolean(storedSession),
      profile: storedSession?.profile ?? null,
      role: storedSession?.profile.role ?? null
    });

    if (!storedSession) {
      return;
    }

    const nextProfile = await synchronizeCurrentProfile();

    setAuthSessionSnapshot({
      hasSession: Boolean(nextProfile),
      profile: nextProfile,
      role: nextProfile?.role ?? null
    });
  } catch (nextError) {
    setAuthSessionSnapshot({
      error: nextError instanceof Error ? nextError : new Error('No pudimos validar la sesion.'),
      hasSession: false,
      profile: null,
      role: null
    });
  } finally {
    lastValidatedAt = Date.now();
    setAuthSessionSnapshot({
      isLoading: false
    });
  }
}

function ensureSessionInvalidationListener(): void {
  if (invalidatedUnsubscribe) {
    return;
  }

  invalidatedUnsubscribe = onSessionInvalidated(() => {
    lastValidatedAt = 0;
    setAuthSessionSnapshot({
      error: null,
      hasSession: false,
      isLoading: false,
      profile: null,
      role: null
    });
  });
}

function setAuthSessionSnapshot(nextSnapshot: Partial<AuthSessionSnapshot>): void {
  authSessionSnapshot = {
    ...authSessionSnapshot,
    ...nextSnapshot
  };

  authSessionSubscribers.forEach((subscriber) => subscriber());
}
