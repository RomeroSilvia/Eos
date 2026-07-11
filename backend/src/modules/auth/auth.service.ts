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

type AppleLoginPayload = {
  identityToken?: string;
  givenName?: string;
  familyName?: string;
  email?: string;
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

type ProviderProfileHint = {
  givenName?: string;
  familyName?: string;
  email?: string;
};

type ProviderSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
};

type AuthSessionDto = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  expiresIn: number | null;
  tokenType: string;
};

type AuthUserDto = {
  id: string;
  email: string | null;
};

type AuthProfileDto = {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  skinType: string | null;
};

type AuthResponseBody = {
  user: AuthUserDto;
  profile: AuthProfileDto;
  session: AuthSessionDto;
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

    return buildAuthResponse(sessionData.user, sessionData.session, profile);
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

    const profile = await findOrCreateProfileForAuthUser(data.user);

    return buildAuthResponse(data.user, data.session, profile);
  },

  googleLogin: async (payload: GoogleLoginPayload): Promise<AuthResponseBody> => {
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

    const profile = await findOrCreateProfileForAuthUser(data.user);

    return buildAuthResponse(data.user, data.session, profile);
  },

  appleLogin: async (payload: AppleLoginPayload = {}): Promise<AuthResponseBody> => {
    const { identityToken, givenName, familyName, email } = payload;

    if (!identityToken) {
      throw new ApiError(400, 'identityToken is required');
    }

    const { data, error } = await authRepository.signInWithIdToken('apple', identityToken);

    if (error) {
      throw mapAuthProviderError(error, 401);
    }

    if (!data.user || !data.session?.access_token) {
      throw new ApiError(401, 'Apple authentication failed');
    }

    const profile = await findOrCreateProfileForAuthUser(data.user, {
      givenName: sanitizeOptionalText(givenName),
      familyName: sanitizeOptionalText(familyName),
      email: sanitizeOptionalEmail(email)
    });

    return buildAuthResponse(data.user, data.session, profile);
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
  const status = resolveHttpStatus(error.status, fallbackStatus);
  return new ApiError(status, getSafeProviderErrorMessage(status));
}

function resolveHttpStatus(status: number | undefined, fallbackStatus: number): number {
  if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599) {
    return status;
  }

  return fallbackStatus;
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

async function findOrCreateProfileForAuthUser(user: AuthUser, hint: ProviderProfileHint = {}): Promise<ProfileRow> {
  const existingProfile = await findProfileSafely(user.id);

  if (existingProfile) {
    return completeExistingProfileSafely(existingProfile, user, hint);
  }

  return createProfileFromProviderUser(user, hint);
}

async function createProfileFromProviderUser(user: AuthUser, hint: ProviderProfileHint = {}): Promise<ProfileRow> {
  const metadata = user.user_metadata ?? {};
  const email = user.email ?? hint.email ?? '';
  const emailUsername = email.split('@')[0] || user.id;
  const fullName = typeof metadata.name === 'string' ? metadata.name : '';
  const [fallbackFirstName = '', ...fallbackLastNameParts] = fullName.split(' ');
  const metadataGivenName =
    typeof metadata.given_name === 'string' && metadata.given_name ? metadata.given_name : undefined;
  const metadataFamilyName =
    typeof metadata.family_name === 'string' && metadata.family_name ? metadata.family_name : undefined;

  const firstName = hint.givenName ?? metadataGivenName ?? fallbackFirstName;
  const lastName = hint.familyName ?? metadataFamilyName ?? fallbackLastNameParts.join(' ');
  const username =
    typeof metadata.preferred_username === 'string' && metadata.preferred_username
      ? metadata.preferred_username
      : emailUsername;

  try {
    return await authRepository.createProfile({
      id: user.id,
      email,
      full_name: [firstName, lastName].filter(Boolean).join(' ').trim() || username,
      role: 'user'
    });
  } catch {
    throw new ApiError(500, 'Ocurrió un error. Intentá nuevamente.');
  }
}

async function completeExistingProfileSafely(
  profile: ProfileRow,
  user: AuthUser,
  hint: ProviderProfileHint
): Promise<ProfileRow> {
  const update: { email?: string; full_name?: string } = {};
  const nextEmail = user.email ?? hint.email;
  const nextFullName = [hint.givenName, hint.familyName].filter(Boolean).join(' ').trim();

  if (!profile.email && nextEmail) {
    update.email = nextEmail;
  }

  if (!profile.full_name && nextFullName) {
    update.full_name = nextFullName;
  }

  if (Object.keys(update).length === 0) {
    return profile;
  }

  try {
    return await authRepository.updateProfile(profile.id, update);
  } catch {
    throw new ApiError(500, 'Ocurrio un error. Intenta nuevamente.');
  }
}

function sanitizeOptionalText(value?: string): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue || undefined;
}

function sanitizeOptionalEmail(value?: string): string | undefined {
  const trimmedValue = value?.trim().toLowerCase();
  return trimmedValue || undefined;
}

function buildAuthResponse(user: AuthUser, session: ProviderSession, profile: ProfileRow): AuthResponseBody {
  return {
    user: mapAuthUser(user),
    profile: mapProfile(profile, user),
    session: mapSession(session)
  };
}

function mapAuthUser(user: AuthUser): AuthUserDto {
  return {
    id: user.id,
    email: user.email ?? null
  };
}

function mapSession(session: ProviderSession): AuthSessionDto {
  if (!session.access_token || !session.refresh_token) {
    throw new ApiError(500, 'Supabase no devolvio una sesion completa.');
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: typeof session.expires_at === 'number' ? session.expires_at : null,
    expiresIn: typeof session.expires_in === 'number' ? session.expires_in : null,
    tokenType: session.token_type ?? 'bearer'
  };
}

function mapProfile(profile: ProfileRow, user: AuthUser): AuthProfileDto {
  return {
    id: profile.id,
    name: profile.full_name || user.email || 'Usuario',
    email: profile.email ?? user.email ?? null,
    role: normalizeProfileRole(profile.role),
    skinType: profile.skin_type ?? null
  };
}

function normalizeProfileRole(role?: string | null): UserRole {
  if (role === 'specialist' || role === 'center_admin') {
    return role;
  }

  return 'user';
}
