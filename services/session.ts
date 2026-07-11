import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/user';

const storageKey = 'eos-auth-session-v1';
const legacySessionKey = 'eos-session';
const legacyAccessTokenKey = 'eos-access-token';
const refreshSkewSeconds = 60;

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  expiresIn: number | null;
  tokenType: string;
};

export type StoredAuthSession = Omit<AuthSession, 'refreshToken'> & {
  refreshToken: string | null;
};

export type StoredSessionRecord = {
  profile: UserProfile;
  session: StoredAuthSession;
  savedAt: number;
  sessionId: string;
};

type SupabaseSession = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
};

type SessionInvalidatedListener = () => void;

let cachedAuthClient: SupabaseClient | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let sessionGeneration = 0;
const invalidatedListeners = new Set<SessionInvalidatedListener>();

export function onSessionInvalidated(listener: SessionInvalidatedListener): () => void {
  invalidatedListeners.add(listener);
  return () => {
    invalidatedListeners.delete(listener);
  };
}

export async function saveSession(profile: UserProfile, session: AuthSession): Promise<void> {
  await writeSessionRecord({
    profile,
    session,
    savedAt: Date.now(),
    sessionId: createSessionId()
  });
}

export async function getStoredSession(): Promise<StoredSessionRecord | null> {
  const stored = await getStoredItem(storageKey);

  if (stored) {
    const alreadyHadSessionId = hasStoredSessionId(stored);
    const parsedSession = parseStoredSession(stored);

    if (parsedSession) {
      if (!alreadyHadSessionId) {
        await writeSessionRecord(parsedSession);
      }

      return parsedSession;
    }

    await deleteStoredItem(storageKey);
  }

  return migrateLegacySession();
}

export async function getStoredProfile(): Promise<UserProfile | null> {
  return (await getStoredSession())?.profile ?? null;
}

export async function updateStoredProfile(profile: UserProfile): Promise<void> {
  await updateStoredProfileForSession(profile);
}

export async function updateStoredProfileForSession(profile: UserProfile, expectedSessionId?: string): Promise<boolean> {
  const storedSession = await getStoredSession();

  if (!storedSession) {
    return false;
  }

  if (expectedSessionId && storedSession.sessionId !== expectedSessionId) {
    return false;
  }

  const generationAtStart = sessionGeneration;
  return writeSessionRecord({
    ...storedSession,
    profile,
    savedAt: Date.now()
  }, generationAtStart);
}

export async function getAccessToken(): Promise<string | null> {
  return (await getStoredSession())?.session.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await getStoredSession())?.session.refreshToken ?? null;
}

export function isSessionExpired(session: StoredAuthSession, skewSeconds = refreshSkewSeconds): boolean {
  if (!session.expiresAt) {
    return false;
  }

  return session.expiresAt <= Math.floor(Date.now() / 1000) + skewSeconds;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const generationAtStart = sessionGeneration;
  refreshInFlight = refreshAccessTokenInternal(generationAtStart);

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function clearSession(options: { remote?: boolean; notify?: boolean } = {}): Promise<void> {
  const currentSession = await getStoredSession();
  sessionGeneration += 1;

  try {
    if (options.remote && currentSession?.session.refreshToken) {
      await signOutCurrentSupabaseSession(currentSession.session);
    }
  } catch {
    // El logout local siempre debe completarse aunque falle la red o Supabase.
  } finally {
    await deleteStoredSessionItems();

    if (options.notify !== false) {
      notifySessionInvalidated();
    }
  }
}

async function refreshAccessTokenInternal(generationAtStart: number): Promise<string | null> {
  const currentSession = await getStoredSession();
  const refreshToken = currentSession?.session.refreshToken;

  if (!refreshToken) {
    await clearSession();
    return null;
  }

  const client = getAuthClient();
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session) {
    await clearSession();
    return null;
  }

  const nextSession = mapSupabaseSession(data.session as SupabaseSession);

  if (!nextSession) {
    await clearSession();
    return null;
  }

  if (sessionGeneration !== generationAtStart) {
    return null;
  }

  const saved = await writeSessionRecord(
    {
      profile: currentSession.profile,
      session: nextSession,
      savedAt: Date.now(),
      sessionId: currentSession.sessionId
    },
    generationAtStart
  );

  return saved ? nextSession.accessToken : null;
}

async function writeSessionRecord(record: StoredSessionRecord, expectedGeneration?: number): Promise<boolean> {
  if (typeof expectedGeneration === 'number' && sessionGeneration !== expectedGeneration) {
    return false;
  }

  const serialized = JSON.stringify(record);
  await setStoredItem(storageKey, serialized);
  await Promise.all([
    deleteStoredItem(legacySessionKey),
    deleteStoredItem(legacyAccessTokenKey)
  ]);

  if (typeof expectedGeneration === 'number' && sessionGeneration !== expectedGeneration) {
    if ((await getStoredItem(storageKey)) === serialized) {
      await deleteStoredItem(storageKey);
    }
    return false;
  }

  sessionGeneration += 1;
  return true;
}

async function migrateLegacySession(): Promise<StoredSessionRecord | null> {
  const [legacySession, legacyAccessToken] = await Promise.all([
    getStoredItem(legacySessionKey),
    getStoredItem(legacyAccessTokenKey)
  ]);

  if (!legacySession && !legacyAccessToken) {
    return null;
  }

  try {
    const parsed = legacySession ? JSON.parse(legacySession) as { profile?: UserProfile } : {};
    const profile = parsed.profile;

    if (!profile || !legacyAccessToken) {
      await deleteStoredSessionItems();
      return null;
    }

    const migrated: StoredSessionRecord = {
      profile,
      session: {
        accessToken: legacyAccessToken,
        refreshToken: null,
        expiresAt: null,
        expiresIn: null,
        tokenType: 'bearer'
      },
      savedAt: Date.now(),
      sessionId: createSessionId()
    };

    await writeSessionRecord(migrated);
    return migrated;
  } catch {
    await deleteStoredSessionItems();
    return null;
  }
}

function parseStoredSession(value: string): StoredSessionRecord | null {
  try {
    const parsed = JSON.parse(value) as StoredSessionRecord;

    if (!parsed.profile || !parsed.session?.accessToken) {
      return null;
    }

    if (!parsed.sessionId) {
      parsed.sessionId = createSessionId();
    }

    return parsed;
  } catch {
    return null;
  }
}

function hasStoredSessionId(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as Partial<StoredSessionRecord>;
    return typeof parsed.sessionId === 'string' && parsed.sessionId.length > 0;
  } catch {
    return false;
  }
}

function mapSupabaseSession(session: SupabaseSession): StoredAuthSession | null {
  if (!session.access_token || !session.refresh_token) {
    return null;
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: typeof session.expires_at === 'number' ? session.expires_at : null,
    expiresIn: typeof session.expires_in === 'number' ? session.expires_in : null,
    tokenType: session.token_type ?? 'bearer'
  };
}

async function signOutCurrentSupabaseSession(session: StoredAuthSession): Promise<void> {
  if (!session.refreshToken) {
    return;
  }

  const client = getAuthClient();
  await client.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken
  });
  await client.auth.signOut({ scope: 'local' });
}

function getAuthClient(): SupabaseClient {
  if (cachedAuthClient) {
    return cachedAuthClient;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase no esta configurado en el frontend.');
  }

  cachedAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  return cachedAuthClient;
}

async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setStoredItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

async function deleteStoredSessionItems(): Promise<void> {
  await Promise.all([
    deleteStoredItem(storageKey),
    deleteStoredItem(legacySessionKey),
    deleteStoredItem(legacyAccessTokenKey)
  ]);
}

function notifySessionInvalidated(): void {
  invalidatedListeners.forEach((listener) => listener());
}

function createSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
