import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/ApiError';
import { authRepository } from './auth.repository';

type AuthProfile = {
  id: string;
  full_name: string | null;
  role: string;
  skinType: string;
};

type AuthResponse = {
  token: string;
  refreshToken: string;
  expiresAt: number | null;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    skinType: string;
  };
};

type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
  skinType?: string;
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

  return {
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    user: {
      id: user.id,
      email: user.email ?? '',
      full_name: profile.full_name ?? '',
      role: profile.role,
      skinType: profile.skinType
    }
  };
}

export async function signUp(input: SignUpInput): Promise<AuthResponse> {
  const fullName = input.fullName.trim();
  const role = 'user';
  const skinType = input.skinType?.trim() || 'not_defined';

  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      skinType
    }
  });

  if (createError) throw new ApiError(400, createError.message);
  if (!createdUser.user) throw new ApiError(500, 'User was not created');

  const profile = await authRepository.upsertProfile({
    id: createdUser.user.id,
    full_name: fullName,
    role,
    skinType
  });

  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password
  });

  if (signInError) throw new ApiError(401, signInError.message);
  if (!sessionData.user) throw new ApiError(401, 'User was created but could not be authenticated');

  return buildAuthResponse(sessionData.user, sessionData.session, profile);
}

export async function signIn(input: SignInInput): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password
  });

  if (error) throw new ApiError(401, error.message);
  if (!data.user) throw new ApiError(401, 'Invalid credentials');

  const metadata = data.user.user_metadata;
  const profile =
    (await authRepository.findProfileById(data.user.id)) ??
    (await authRepository.upsertProfile({
      id: data.user.id,
      full_name: metadata?.full_name ?? '',
      role: metadata?.role ?? 'user',
      skinType: metadata?.skinType ?? 'not_defined'
    }));

  return buildAuthResponse(data.user, data.session, profile);
}
