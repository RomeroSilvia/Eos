import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authService, getAuthHealth } from './auth.service';

export const authHealth: RequestHandler = (_req, res) => {
  res.json(getAuthHealth());
};

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});
export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});

export const googleLogin = asyncHandler(async (req, res) => {
  const result = await authService.googleLogin(req.body);
  res.json(result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.status(200).json(result);
});

export const updatePassword = asyncHandler(async (req, res) => {
  const result = await authService.updatePassword({
    ...req.body,
    authorizationHeader: req.header('Authorization')
  });
  res.status(200).json(result);
});
