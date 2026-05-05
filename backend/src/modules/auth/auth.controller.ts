import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { getAuthHealth, signIn, signUp } from './auth.service';

export const authHealth = asyncHandler(async (_req, res) => {
  res.json(getAuthHealth());
});

export const signUpController = asyncHandler(async (req, res) => {
  const { email, password, fullName, skinType } = req.body;

  if (!email || !password || !fullName) {
    throw new ApiError(400, 'email, password and fullName are required');
  }

  const authResponse = await signUp({
    email,
    password,
    fullName,
    skinType
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
