import { env } from '../../config/env';
import type { ProfileRow } from '../../database/schema.types';
import { ApiError } from '../../utils/ApiError';
import { authRepository } from './auth.repository';

type UserRole = 'user' | 'specialist' | 'center_admin';
type PublicRegistrationRole = 'user' | 'specialist';

type RegisterPayload = {
  email?: string;
  password?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  specialty?: string;
};

type LoginPayload = {
  email?: string;
  password?: string;
};

type GoogleLoginPayload = {
  idToken?: string;
};

type ResetPasswordPayload = {
  email?: string;
};

type UpdatePasswordPayload = {
  newPassword?: string;
  accessToken?: string;
  authorizationHeader?: string;
};

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type AuthSession = {
  access_token: string;
};

type AuthResponseBody = {
  message: string;
  token: string;
  session: AuthSession;
  user: AuthUser;
  profile: ProfileRow | null;
};

export function getAuthHealth() {
  return {
    module: 'auth',
    status: 'ready'
  };
}

export const authService = {
  register: async (payload: RegisterPayload): Promise<AuthResponseBody> => {
    const { email, password, username, firstName, lastName, role, specialty } = payload;

    if (!email || !password || !username || !firstName || !lastName || !role) {
      throw new ApiError(400, 'email, password, username, firstName, lastName and role are required');
    }

    const normalizedRole = normalizePublicRegistrationRole(role);
    const normalizedSpecialty = normalizeSpecialty(specialty);
    const normalizedEmail = email.trim().toLowerCase();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    const { data: createdUser, error: createUserError } = await authRepository.createAuthUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        role: normalizedRole,
        specialty: normalizedRole === 'specialist' ? normalizedSpecialty : undefined
      }
    });

    if (createUserError) {
      if (isDuplicateEmailError(createUserError.message)) {
        throw new ApiError(409, 'Ya existe una cuenta registrada con ese correo.');
      }

      throw mapAuthProviderError(createUserError, 400);
    }

    if (!createdUser.user) {
      throw new ApiError(500, 'User registration did not return a user');
    }

    const { data: sessionData, error: sessionError } = await authRepository.signInWithPassword(normalizedEmail, password);

    if (sessionError) {
      throw mapLoginError(sessionError);
    }

    if (!sessionData.session || !sessionData.user) {
      throw new ApiError(500, 'User registration did not return a session token');
    }

    const profile = await createOrUpdateProfileSafely({
      id: createdUser.user.id,
      email: normalizedEmail,
      full_name: fullName,
      role: normalizedRole
    });

    return {
      message: 'User registered successfully',
      token: sessionData.session.access_token,
      session: sessionData.session,
      user: sessionData.user,
      profile
    };
  },

  login: async (payload: LoginPayload): Promise<AuthResponseBody> => {
    const { email, password } = payload;

    if (!email || !password) {
      throw new ApiError(400, 'email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await authRepository.signInWithPassword(normalizedEmail, password);

    if (error) {
      throw mapLoginError(error);
    }

    if (!data.user || !data.session) {
      throw new ApiError(401, 'Invalid login response');
    }

    const profile = await findProfileSafely(data.user.id);

    return {
      message: 'Login successful',
      token: data.session.access_token,
      session: data.session,
      user: data.user,
      profile
    };
  },

  googleLogin: async (payload: GoogleLoginPayload): Promise<{ access_token: string; isNewUser: boolean }> => {
    const { idToken } = payload;

    if (!idToken) {
      throw new ApiError(400, 'idToken is required');
    }

    const { data, error } = await authRepository.signInWithIdToken('google', idToken);

    if (error) {
      throw mapAuthProviderError(error, 401);
    }

    if (!data.user || !data.session?.access_token) {
      throw new ApiError(401, 'Google authentication failed');
    }

    const existingProfile = await findProfileSafely(data.user.id);
    let isNewUser = false;

    if (!existingProfile) {
      await createProfileFromProviderUser(data.user);
      isNewUser = true;
    }

    return {
      access_token: data.session.access_token,
      isNewUser
    };
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<{ message: string }> => {
    const { email } = payload;

    if (!email) {
      throw new ApiError(400, 'email is required');
    }

    const { error } = await authRepository.resetPasswordForEmail(email, getPasswordResetRedirectUrl());

    if (error) {
      if (error.status === 429) {
        throw new ApiError(429, 'Ya se solicito un restablecimiento recientemente. Espera unos minutos antes de intentarlo otra vez.');
      }

      throw mapAuthProviderError(error, 400);
    }

    return {
      message: 'Te enviamos un enlace para restablecer tu contrasena.'
    };
  },

  updatePassword: async (payload: UpdatePasswordPayload): Promise<{ message: string }> => {
    const { newPassword, accessToken, authorizationHeader } = payload;

    if (!newPassword) {
      throw new ApiError(400, 'newPassword is required');
    }

    const token = getAuthorizationToken(authorizationHeader) ?? accessToken;

    if (!token) {
      throw new ApiError(401, 'Recovery access token is required');
    }

    const { error } = await authRepository.updatePasswordWithToken(token, newPassword);

    if (error) {
      throw mapAuthProviderError(error, 400);
    }

    return {
      message: 'Password updated successfully'
    };
  }
};

function normalizeRole(role: string): UserRole {
  if (role === 'specialist') {
    return 'specialist';
  }

  if (role === 'center_admin') {
    return 'center_admin';
  }

  if (role === 'user') {
    return 'user';
  }

  throw new ApiError(400, 'role must be user, specialist or center_admin');
}

function normalizePublicRegistrationRole(role: string): PublicRegistrationRole {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'center_admin') {
    throw new ApiError(403, 'No podes registrarte como administrador desde el registro publico.');
  }

  return normalizedRole;
}

function normalizeSpecialty(specialty?: string): 'dermatologo' | 'cosmetologo' | null {
  if (!specialty) {
    return null;
  }

  if (specialty === 'dermatologo' || specialty === 'cosmetologo') {
    return specialty;
  }

  throw new ApiError(400, 'specialty must be dermatologo or cosmetologo');
}

function getPasswordResetRedirectUrl(): string {
  if (env.passwordResetRedirectUrl) {
    return env.passwordResetRedirectUrl;
  }

  return `${env.corsOrigin.replace(/\/$/, '')}/update-password`;
}

function getAuthorizationToken(authorizationHeader?: string): string | null {
  const [scheme, token] = authorizationHeader?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function isDuplicateEmailError(message: string): boolean {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes('already') ||
    normalizedMessage.includes('registered') ||
    normalizedMessage.includes('exists')
  );
}

function mapLoginError(error: { message: string; status?: number }): ApiError {
  if (error.message.toLowerCase().includes('invalid login credentials')) {
    return new ApiError(401, 'Email o contrasena incorrectos.');
  }

  return mapAuthProviderError(error, 401);
}

function mapAuthProviderError(error: { message: string; status?: number }, fallbackStatus: number): ApiError {
  return new ApiError(error.status ?? fallbackStatus, getSafeProviderErrorMessage(error.status ?? fallbackStatus));
}

function getSafeProviderErrorMessage(status: number): string {
  if (status === 400) return 'Revisá los datos ingresados.';
  if (status === 401) return 'Tu sesión expiró. Iniciá sesión nuevamente.';
  if (status === 403) return 'No tenés permisos para realizar esta acción.';
  if (status === 404) return 'No se encontró la solicitud.';
  if (status === 409) return 'Ya existe una cuenta registrada con ese correo.';
  if (status === 429) return 'Demasiados intentos. Probá nuevamente en unos minutos.';
  return 'Ocurrió un error. Intentá nuevamente.';
}

async function findProfileSafely(userId: string): Promise<ProfileRow | null> {
  try {
    return await authRepository.findProfileById(userId);
  } catch {
    throw new ApiError(500, 'Ocurrió un error. Intentá nuevamente.');
  }
}

async function createOrUpdateProfileSafely(data: {
  id: string;
  email: string;
  full_name: string;
  role: PublicRegistrationRole;
}): Promise<ProfileRow> {
  try {
    return await authRepository.upsertProfile(data);
  } catch {
    throw new ApiError(500, 'Ocurrió un error. Intentá nuevamente.');
  }
}

async function createProfileFromProviderUser(user: AuthUser): Promise<void> {
  const metadata = user.user_metadata ?? {};
  const email = user.email ?? '';
  const emailUsername = email.split('@')[0] || user.id;
  const fullName = typeof metadata.name === 'string' ? metadata.name : '';
  const [fallbackFirstName = '', ...fallbackLastNameParts] = fullName.split(' ');

  const firstName =
    typeof metadata.given_name === 'string' && metadata.given_name
      ? metadata.given_name
      : fallbackFirstName;
  const lastName =
    typeof metadata.family_name === 'string' && metadata.family_name
      ? metadata.family_name
      : fallbackLastNameParts.join(' ');
  const username =
    typeof metadata.preferred_username === 'string' && metadata.preferred_username
      ? metadata.preferred_username
      : emailUsername;

  try {
    await authRepository.createProfile({
      id: user.id,
      email,
      full_name: [firstName, lastName].filter(Boolean).join(' ').trim() || username,
      role: 'user'
    });
  } catch {
    throw new ApiError(500, 'Ocurrió un error. Intentá nuevamente.');
  }
}
