import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getProfileHealth, updateMyProfile } from './profile.service';

export const profileHealth: RequestHandler = (_req, res) => {
  res.json(getProfileHealth());
};

export const updateProfile: RequestHandler = asyncHandler(async (req, res) => {
  const profile = await updateMyProfile({
    userId: req.user.id,
    role: req.user.role ?? 'user',
    fullName: (req.body as { fullName?: unknown }).fullName
  });

  res.json({ profile });
});
