import { ApiRequestError, apiRequest } from '@/services/api/client';
import { registerPushToken, unregisterPushToken } from '@/services/notifications';
import {
  clearSession,
  getStoredProfile,
  saveSession,
  updateStoredProfile as updateSessionProfile,
  type AuthSession
} from '@/services/session';
import { getSpecialistStatus } from '@/services/specialist';
import type { UserProfile } from '@/types/user';

type AuthUser = {
  id: string;
  email?: string | null;
};

type AuthProfile = {
  id: string;
  name?: string | null;
  email?: string | null;
  skin_type?: string | null;
  skinType?: string | null;
  role?: string | null;
};

type AuthResponse = {
  session: AuthSession;
  user: AuthUser;
  profile: AuthProfile;
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

export const mockUserProfile: UserProfile = {
  id: 'mock-user-1',
  name: 'Usuario EOS',
  email: 'usuario@eos.app',
  role: 'user',
  skinType: 'mixed'
};

export type PostLoginRoute = '/(tabs-admin)' | '/(tabs)/home' | '/(tabs-specialist)' | '/specialist-status';

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
    return '/(tabs-admin)';
  }

  if (profile.role !== 'specialist') {
    return '/(tabs)/home';
  }

  const status = await getSpecialistStatus().catch(() => null);

  if (status?.license_status === 'verified') {
    return '/(tabs-specialist)';
  }

  return '/specialist-status';
}

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth/login]', {
        status: error.status,
        body: error.body
      });
    }

    if (error.status === 401) return 'Email o contrasena incorrectos.';
    if (error.status === 400) return 'Revisa los datos ingresados e intenta nuevamente.';
    if (error.status === 403) return 'No tenes permisos para realizar esta accion.';
    if (error.status === 429) return 'Demasiados intentos. Proba nuevamente en unos minutos.';
    return 'No pudimos completar la accion. Intenta nuevamente.';
  }

  if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
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
  const profile = await getStoredProfile();

  if (!profile) {
    throw new Error('No hay una sesion activa.');
  }

  return profile;
}

export async function logout(): Promise<void> {
  try {
    await unregisterPushToken();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth/logout] No se pudieron limpiar las notificaciones.', error);
    }
  }

  await clearSession({ remote: true });
}

export async function changePassword(newPassword: string): Promise<void> {
  await apiRequest({
    path: '/auth/update-password',
    method: 'POST',
    body: JSON.stringify({ newPassword })
  });
}

export async function updateStoredProfile(profile: UserProfile): Promise<void> {
  await updateSessionProfile(profile);
}

async function persistAuthSession(data: AuthResponse): Promise<void> {
  const profile = mapAuthResponseToProfile(data);
  await saveSession(profile, data.session);
}

function mapAuthResponseToProfile(data: AuthResponse): UserProfile {
  const profile = data.profile;
  const role = getSupportedRole(profile.role);

  return {
    id: profile.id ?? data.user.id,
    name: profile.name ?? data.user.email ?? 'Usuario',
    email: profile.email ?? data.user.email ?? undefined,
    role,
    skinType: (profile.skinType ?? profile.skin_type ?? 'mixed') as UserProfile['skinType']
  };
}

function getSupportedRole(role?: string | null): UserProfile['role'] {
  if (role === 'specialist' || role === 'center_admin') {
    return role;
  }

  return 'user';
}
