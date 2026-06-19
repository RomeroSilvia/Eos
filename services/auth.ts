import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiRequest } from '@/services/api/client';
import type { UserProfile } from '@/types/user';

const sessionKey = 'eos-session';
const accessTokenKey = 'eos-access-token';

type AuthSession = {
  access_token: string;
};

type AuthUser = {
  id: string;
  email?: string;
};

type AuthProfile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  skin_type?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
};

type AuthResponse = {
  token?: string | null;
  session?: AuthSession | null;
  user: AuthUser;
  profile?: AuthProfile | null;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = LoginPayload & {
  username: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'specialist';
};

export async function login({ email, password }: LoginPayload): Promise<UserProfile> {
  const data = await apiRequest<AuthResponse>({
    path: '/auth/login',
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  await persistAuthSession(data);
  return mapAuthResponseToProfile(data);
}

export async function register(payload: RegisterPayload): Promise<UserProfile> {
  const data = await apiRequest<AuthResponse>({
    path: '/auth/register',
    method: 'POST',
    body: JSON.stringify(payload)
  });

  await persistAuthSession(data);
  return mapAuthResponseToProfile(data);
}

export async function getCurrentProfile(): Promise<UserProfile> {
  const storedSession = await getStoredItem(sessionKey);

  if (!storedSession) {
    throw new Error('No hay una sesion activa.');
  }

  const session = JSON.parse(storedSession) as { profile?: UserProfile };

  if (!session.profile) {
    throw new Error('No se encontro el perfil del usuario.');
  }

  return session.profile;
}

export async function logout(): Promise<void> {
  await deleteStoredItem(sessionKey);
  await deleteStoredItem(accessTokenKey);
}

export async function saveAccessToken(token: string): Promise<void> {
  await setStoredItem(accessTokenKey, token);
}

async function persistAuthSession(data: AuthResponse): Promise<void> {
  const token = data.token ?? data.session?.access_token;

  if (!token) {
    throw new Error('El backend no devolvio un token de sesion.');
  }

  const profile = mapAuthResponseToProfile(data);

  await saveAccessToken(token);
  await setStoredItem(
    sessionKey,
    JSON.stringify({
      token,
      session: data.session ?? null,
      user: data.user,
      profile
    })
  );
}

function mapAuthResponseToProfile(data: AuthResponse): UserProfile {
  const profile = data.profile;
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const role = getSupportedRole(profile?.role);

  return {
    id: profile?.id ?? data.user.id,
    name: profile?.full_name ?? (fullName || profile?.username || data.user.email || 'Usuario'),
    email: profile?.email ?? data.user.email,
    role,
    skinType: (profile?.skin_type ?? 'mixed') as UserProfile['skinType']
  };
}

function getSupportedRole(role?: string | null): UserProfile['role'] {
  if (role === 'specialist' || role === 'center_admin') {
    return role;
  }

  return 'user';
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
