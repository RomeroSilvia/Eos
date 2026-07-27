import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { routes } from '@/constants/routes';
import { ApiRequestError, apiRequest, getFriendlyAuthErrorMessage } from '@/services/api/client';
import { deleteStoredAccessToken, setStoredAccessToken } from '@/services/api/token';
import { registerPushToken, unregisterPushToken } from '@/services/notifications';
import { getSpecialistStatus } from '@/services/specialist';
import type { UserProfile } from '@/types/user';

const sessionKey = 'eos-session';

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
  specialty?: 'dermatologo' | 'cosmetologo';
};

export type PostLoginRoute = typeof routes.adminHome | typeof routes.userHome | typeof routes.specialistHome | typeof routes.specialistStatus;

export async function login({ email, password }: LoginPayload): Promise<UserProfile> {
  const data = await apiRequest<AuthResponse>({
    path: '/auth/login',
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  await persistAuthSession(data);
  registerPushToken().catch(() => {});
  return mapAuthResponseToProfile(data);
}

export async function getPostLoginRoute(profile: Pick<UserProfile, 'role'>): Promise<PostLoginRoute> {
  if (profile.role === 'center_admin') {
    return routes.adminHome;
  }

  if (profile.role !== 'specialist') {
    return routes.userHome;
  }

  const status = await getSpecialistStatus().catch(() => null);

  if (status?.license_status === 'verified') {
    return routes.specialistHome;
  }

  return routes.specialistStatus;
}

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (__DEV__) {
      console.warn('[auth/login]', {
        status: error.status,
        body: error.body
      });
    }

    if (error.status === 401) {
      return 'Email o contrasena incorrectos.';
    }

    return getFriendlyAuthErrorMessage(error.status);
  }

  if (__DEV__ && error instanceof Error) {
    console.warn('[auth/login]', error.message);
  }

  return 'No pudimos completar la accion. Intenta nuevamente.';
}

export async function register(payload: RegisterPayload): Promise<UserProfile> {
  const data = await apiRequest<AuthResponse>({
    path: '/auth/register',
    method: 'POST',
    body: JSON.stringify(payload)
  });

  await persistAuthSession(data);
  registerPushToken().catch(() => {});
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
  try {
    await unregisterPushToken();
  } catch (error) {
    if (__DEV__) {
      console.warn('[auth/logout] No se pudieron limpiar las notificaciones.', error);
    }
  }

  await Promise.all([
    deleteStoredItem(sessionKey),
    deleteStoredAccessToken()
  ]);
}

export async function changePassword(newPassword: string): Promise<void> {
  await apiRequest({
    path: '/auth/update-password',
    method: 'POST',
    body: JSON.stringify({ newPassword })
  });
}

export async function resetPassword(email: string): Promise<void> {
  await apiRequest({
    path: '/auth/reset-password',
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

/**
 * Actualiza la contraseña usando el token de recuperación del link de email
 * (no el token de sesión guardado, que puede no existir o pertenecer a otra
 * cuenta si hay una sesión activa en el mismo navegador).
 */
export async function updatePasswordWithRecoveryToken(newPassword: string, accessToken: string): Promise<void> {
  await apiRequest({
    path: '/auth/update-password',
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ newPassword, accessToken })
  });
}

export async function updateStoredProfile(profile: UserProfile): Promise<void> {
  await setStoredItem(
    sessionKey,
    JSON.stringify({
      profile
    })
  );
}

export async function saveAccessToken(token: string): Promise<void> {
  await setStoredAccessToken(token);
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
