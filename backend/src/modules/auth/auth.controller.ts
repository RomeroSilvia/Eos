import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { supabase } from '../../config/supabase';
import { authRepository } from './auth.repository';
import { getAuthHealth, signIn, signUp } from './auth.service';

function splitGoogleName(fullName: string | undefined) {
  if (!fullName) {
    return {
      firstName: '',
      lastName: ''
    };
  }

  const [firstName, ...lastNameParts] = fullName.trim().split(' ');

  return {
    firstName: firstName ?? '',
    lastName: lastNameParts.join(' ')
  };
}

export const authHealth = asyncHandler(async (_req, res) => {
  res.json(getAuthHealth());
});

export const signUpController = asyncHandler(async (req, res) => {
  const { email, password, username, firstName, lastName, role } = req.body;

  if (!email || !password || !username || !firstName || !lastName || !role) {
    throw new ApiError(400, 'email, password, username, firstName, lastName and role are required');
  }

  const authResponse = await signUp({
    email,
    password,
    username,
    firstName,
    lastName,
    role
  });

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: authResponse
  });
});

export const signInController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'email and password are required');
  }

  const authResponse = await signIn({ email, password });

  res.json({
    status: 'success',
    message: 'User authenticated successfully',
    data: authResponse
  });
});

export const googleSignInController = asyncHandler(async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new ApiError(400, 'idToken is required');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken
    });

    if (error) {
      throw new ApiError(401, error.message);
    }

    if (!data.user || !data.session?.access_token) {
      throw new ApiError(401, 'Google authentication failed');
    }

    const existingProfile = await authRepository.findProfileById(data.user.id);
    let isNewUser = false;

    if (!existingProfile) {
      const metadata = data.user.user_metadata;
      const fallbackName = splitGoogleName(metadata?.full_name ?? metadata?.name);

      await authRepository.upsertProfile({
        id: data.user.id,
        username: null,
        first_name: metadata?.given_name ?? fallbackName.firstName,
        last_name: metadata?.family_name ?? fallbackName.lastName,
        role: 'usuario'
      });

      isNewUser = true;
    }

    res.json({
      status: 'success',
      message: 'User authenticated with Google successfully',
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        session: data.session,
        user: data.user,
        isNewUser
      }
    });
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 500;

    res.status(statusCode).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unexpected server error'
    });
  }
});
