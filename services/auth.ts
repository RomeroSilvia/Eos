import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiConfig } from '@/services/api/client';
import type { SkinType, UserProfile, UserRole } from '@/types/user';

const AUTH_TOKEN_KEY = 'eos.auth.token';
const AUTH_REFRESH_TOKEN_KEY = 'eos.auth.refreshToken';
const AUTH_USER_KEY = 'eos.auth.user';
const authBaseUrl = `${apiConfig.baseUrl}/auth`;

type BackendAuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  skinType: SkinType;
};

type BackendAuthResponse = {
  status: 'success';
  message: string;
  data: {
    token: string;
    refreshToken: string;
    expiresAt: number | null;
    user: BackendAuthUser;
  };
};

export const mockUserProfile: UserProfile = {
  id: 'mock-user',
  name: 'Usuario EOS',
  email: 'usuario@eos.app',
  role: 'user',
  skinType: 'normal',
};

async function setStoredItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteStoredItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

function mapBackendUser(user: BackendAuthUser): UserProfile {
  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role,
    skinType: user.skinType,
  };
}

async function requestAuth(path: '/login' | '/register', body: Record<string, string>): Promise<UserProfile> {
  const response = await fetch(`${authBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as BackendAuthResponse | { message?: string };

  if (!response.ok || !('data' in payload)) {
    throw new Error(payload.message ?? 'Authentication request failed');
  }

  const profile = mapBackendUser(payload.data.user);

  await Promise.all([
    setStoredItem(AUTH_TOKEN_KEY, payload.data.token),
    setStoredItem(AUTH_REFRESH_TOKEN_KEY, payload.data.refreshToken),
    setStoredItem(AUTH_USER_KEY, JSON.stringify(profile)),
  ]);

  return profile;
}

export async function signIn(email: string, password: string): Promise<UserProfile> {
  return requestAuth('/login', { email, password });
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  skinType: SkinType,
): Promise<UserProfile> {
  return requestAuth('/register', {
    email,
    password,
    fullName,
    skinType,
  });
}

export async function signOut(): Promise<void> {
  await Promise.all([
    deleteStoredItem(AUTH_TOKEN_KEY),
    deleteStoredItem(AUTH_REFRESH_TOKEN_KEY),
    deleteStoredItem(AUTH_USER_KEY),
  ]);
}

export async function getAuthToken(): Promise<string | null> {
  return getStoredItem(AUTH_TOKEN_KEY);
}

export async function getUserProfile(): Promise<UserProfile> {
  const storedUser = await getStoredItem(AUTH_USER_KEY);

  if (!storedUser) {
    throw new Error('No authenticated user');
  }

  return JSON.parse(storedUser) as UserProfile;
}

export async function getCurrentProfile(): Promise<UserProfile> {
  return getUserProfile();
}
