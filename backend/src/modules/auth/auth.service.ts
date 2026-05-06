import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/ApiError';
import { authRepository } from './auth.repository';

type AuthProfile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
};

type AuthResponse = {
  session: Session;
  token: string;
  refreshToken: string;
  expiresAt: number | null;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    full_name: string;
    role: string;
  };
};

type SignUpInput = {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
};

type SignInInput = {
  email: string;
  password: string;
};

export function getAuthHealth() {
  return {
    module: 'auth',
    status: 'ready'
  };
}

function assertSession(session: Session | null): asserts session is Session {
  if (!session?.access_token) {
    throw new ApiError(401, 'Authentication session was not created');
  }
}

function buildAuthResponse(user: User, session: Session | null, profile: AuthProfile): AuthResponse {
  assertSession(session);

  const firstName = profile.first_name ?? '';
  const lastName = profile.last_name ?? '';

  return {
    session,
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    user: {
      id: user.id,
      email: user.email ?? '',
      username: profile.username ?? '',
      firstName,
      lastName,
      full_name: [firstName, lastName].filter(Boolean).join(' '),
      role: profile.role
    }
  };
}

export async function signUp(input: SignUpInput): Promise<AuthResponse> {
  const username = input.username.trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const role = input.role.trim();

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        username,
        first_name: firstName,
        last_name: lastName,
        role
      }
    }
  });

  if (error) throw new ApiError(400, error.message);
  if (!data.user) throw new ApiError(500, 'User was not created');

  const profile =
    (await authRepository.findProfileById(data.user.id)) ??
    (await authRepository.upsertProfile({
      id: data.user.id,
      username,
      first_name: firstName,
      last_name: lastName,
      role
    }));

  return buildAuthResponse(data.user, data.session, profile);
}

export async function signIn(input: SignInInput): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password
  });

  if (error) throw new ApiError(401, error.message);
  if (!data.user) throw new ApiError(401, 'Invalid credentials');

  const metadata = data.user.user_metadata;
  const profile =
    (await authRepository.findProfileById(data.user.id)) ??
    (await authRepository.upsertProfile({
      id: data.user.id,
      username: metadata?.username ?? null,
      first_name: metadata?.first_name ?? null,
      last_name: metadata?.last_name ?? null,
      role: metadata?.role ?? 'user'
    }));

  return buildAuthResponse(data.user, data.session, profile);
}
