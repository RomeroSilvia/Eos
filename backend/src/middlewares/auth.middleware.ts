import type { RequestHandler } from 'express';
import { supabase } from '../config/supabase';
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
      throw new ApiError(500, profileError.message);
    }

    req.user = {
      id: data.user.id,
      role: profile?.role ?? 'user',
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
