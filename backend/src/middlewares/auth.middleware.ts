import type { RequestHandler } from 'express';
import { supabase } from '../config/supabase';
import { ApiError } from '../utils/ApiError';

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = getBearerToken(req.header('Authorization'));

    if (!token) {
      throw new ApiError(401, 'Authorization token is required');
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new ApiError(401, 'Invalid or expired token');
    }

    req.user = {
      id: data.user.id
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
