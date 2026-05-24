import type { RequestHandler } from 'express';
import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/ApiError';

type SaveQuizBody = {
  ageRange?: string;
  skinType?: string;
  imperfections?: string;
  mainGoal?: string;
  routineSteps?: string;
};

function getBearerToken(authorizationHeader?: string): string | null {
  const [scheme, token] = authorizationHeader?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export const saveQuiz: RequestHandler = async (req, res, next) => {
  try {
    const token = getBearerToken(req.header('Authorization'));
    const {
      ageRange,
      skinType,
      imperfections,
      mainGoal,
      routineSteps
    } = req.body as SaveQuizBody;

    const normalizedBody = {
      ageRange: ageRange?.trim() || 'No especificado',
      skinType: skinType?.trim() || 'No especificado',
      imperfections: imperfections?.trim() || 'No especificado',
      mainGoal: mainGoal?.trim() || 'No especificado',
      routineSteps: routineSteps?.trim() || 'No especificado'
    };

    let userId: string | undefined;

    if (token) {
      const { data: authData, error: authError } = await supabase.auth.getUser(token);

      if (authError || !authData.user) {
        throw new ApiError(401, 'Invalid or expired token');
      }

      userId = authData.user.id;
    }

    if (!userId) {
      res.status(201).json({
        message: 'Skin profile received in development mode',
        skinProfile: {
          id: 'development-preview',
          user_id: req.user?.id ?? 'development-user',
          age_range: normalizedBody.ageRange,
          skin_type: normalizedBody.skinType,
          imperfections: normalizedBody.imperfections,
          main_goal: normalizedBody.mainGoal,
          routine_steps: normalizedBody.routineSteps,
          created_at: new Date().toISOString()
        }
      });
      return;
    }

    const { data, error } = await supabase
      .from('skin_profiles')
      .insert({
        user_id: userId,
        age_range: normalizedBody.ageRange,
        skin_type: normalizedBody.skinType,
        imperfections: normalizedBody.imperfections,
        main_goal: normalizedBody.mainGoal,
        routine_steps: normalizedBody.routineSteps
      })
      .select('id, user_id, age_range, skin_type, imperfections, main_goal, routine_steps, created_at')
      .single();

    if (error) {
      const statusCode = error.code === '23505' ? 409 : 500;
      throw new ApiError(statusCode, error.message);
    }

    res.status(201).json({
      message: 'Skin profile created',
      skinProfile: data
    });
  } catch (error) {
    next(error);
  }
};
