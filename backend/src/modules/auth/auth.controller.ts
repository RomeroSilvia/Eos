import type { RequestHandler } from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { getAuthHealth } from './auth.service';

export const authHealth: RequestHandler = (_req, res) => {
  res.json(getAuthHealth());
};

export const register = asyncHandler(async (req, res) => {
  const { email, password, username, firstName, lastName, role } = req.body as {
    email?: string;
    password?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };

  if (!email || !password || !username || !firstName || !lastName || !role) {
    throw new ApiError(400, 'email, password, username, firstName, lastName and role are required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      role
    }
  });

  if (createUserError) {
    if (isDuplicateEmailError(createUserError.message)) {
      throw new ApiError(409, 'Ya existe una cuenta registrada con ese correo.');
    }

    throw new ApiError(createUserError.status ?? 400, createUserError.message);
  }

  if (!createdUser.user) {
    throw new ApiError(500, 'User registration did not return a user');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (sessionError) {
    throw new ApiError(sessionError.status ?? 401, sessionError.message);
  }

  if (!sessionData.session || !sessionData.user) {
    throw new ApiError(500, 'User registration did not return a session token');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: createdUser.user.id,
        email: normalizedEmail,
        full_name: fullName
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (profileError) {
    throw new ApiError(500, profileError.message);
  }

  res.status(201).json({
    message: 'User registered successfully',
    token: sessionData.session.access_token,
    session: sessionData.session,
    user: sessionData.user,
    profile
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    throw new ApiError(400, 'email and password are required');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      throw new ApiError(401, 'Email o contrasena incorrectos.');
    }

    throw new ApiError(error.status ?? 401, error.message);
  }

  if (!data.user || !data.session) {
    throw new ApiError(401, 'Invalid login response');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    throw new ApiError(500, profileError.message);
  }

  res.json({
    message: 'Login successful',
    token: data.session.access_token,
    session: data.session,
    user: data.user,
    profile
  });
});

export const googleLogin: RequestHandler = async (req, res, next) => {
  try {
    const { idToken } = req.body as {
      idToken?: string;
    };

    if (!idToken) {
      throw new ApiError(400, 'idToken is required');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken
    });

    if (error) {
      throw new ApiError(error.status ?? 401, error.message);
    }

    if (!data.user || !data.session?.access_token) {
      throw new ApiError(401, 'Google authentication failed');
    }

    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      throw new ApiError(500, profileError.message);
    }

    let isNewUser = false;

    if (!existingProfile) {
      const metadata = data.user.user_metadata;
      const email = data.user.email ?? '';
      const emailUsername = email.split('@')[0] || data.user.id;
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

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          full_name: [firstName, lastName].filter(Boolean).join(' ').trim() || username
        });

      if (insertError) {
        throw new ApiError(500, insertError.message);
      }

      isNewUser = true;
    }

    res.json({
      access_token: data.session.access_token,
      isNewUser
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    const { email } = req.body as {
      email?: string;
    };

    if (!email) {
      throw new ApiError(400, 'email is required');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl()
    });

    if (error) {
      if (error.status === 429) {
        throw new ApiError(429, 'Ya se solicito un restablecimiento recientemente. Espera unos minutos antes de intentarlo otra vez.');
      }

      throw new ApiError(error.status ?? 400, error.message);
    }

    res.status(200).json({
      message: 'Te enviamos un enlace para restablecer tu contrasena.'
    });
  } catch (error) {
    next(error);
  }
};

function getPasswordResetRedirectUrl(): string {
  if (env.passwordResetRedirectUrl) {
    return env.passwordResetRedirectUrl;
  }

  return `${env.corsOrigin.replace(/\/$/, '')}/update-password`;
}

function isDuplicateEmailError(message: string): boolean {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes('already') ||
    normalizedMessage.includes('registered') ||
    normalizedMessage.includes('exists')
  );
}

export const updatePassword: RequestHandler = async (req, res, next) => {
  try {
    const { newPassword, accessToken } = req.body as {
      newPassword?: string;
      accessToken?: string;
    };

    if (!newPassword) {
      throw new ApiError(400, 'newPassword is required');
    }

    const token = getAuthorizationToken(req.header('Authorization')) ?? accessToken;

    if (!token) {
      throw new ApiError(401, 'Recovery access token is required');
    }

    const passwordClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { error } = await passwordClient.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new ApiError(error.status ?? 400, error.message);
    }

    res.status(200).json({
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

function getAuthorizationToken(authorizationHeader?: string): string | null {
  const [scheme, token] = authorizationHeader?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}
