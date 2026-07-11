import type { RequestHandler } from 'express';
import { supabase } from '../config/supabase';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = getBearerToken(req.header('Authorization'));

    if (!token) {
      throw new ApiError(401, 'Token de autorización requerido.');
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new ApiError(401, 'Token inválido o expirado.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      logProfileLoadError(profileError);
      throw new ApiError(500, 'No pudimos validar tu sesión.');
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
      role: normalizeRole(profile?.role),
      accessToken: token
    };

    next();
  } catch (error) {
    next(error);
  }
};

function getBearerToken(authorizationHeader?: string): string | null {
  const [scheme, token] = authorizationHeader?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function normalizeRole(role?: string | null): 'user' | 'specialist' | 'center_admin' {
  if (role === 'specialist' || role === 'center_admin') {
    return role;
  }

  return 'user';
}

function logProfileLoadError(error: unknown): void {
  if (env.nodeEnv !== 'development') return;

  console.error('[auth:profile:error]', {
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error)
  });
}
