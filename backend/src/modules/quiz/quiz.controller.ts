import type { RequestHandler } from 'express';
import { supabase } from '../../config/supabase';

type SaveQuizBody = {
  ageRange?: string;
  skinType?: string;
  imperfections?: string;
  mainGoal?: string;
  routineSteps?: string;
};

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

export const saveQuizProfile: RequestHandler = async (req, res) => {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authorization Bearer token is required',
      });
    }

    const {
      ageRange,
      skinType,
      imperfections,
      mainGoal,
      routineSteps,
    } = req.body as SaveQuizBody;

    if (!ageRange || !skinType || !imperfections || !mainGoal || !routineSteps) {
      return res.status(400).json({
        status: 'error',
        message: 'ageRange, skinType, imperfections, mainGoal and routineSteps are required',
      });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return res.status(401).json({
        status: 'error',
        message: authError?.message ?? 'Invalid or expired token',
      });
    }

    const skinProfilesTable = supabase.from('skin_profiles') as any;
    const { data: skinProfile, error: insertError } = await skinProfilesTable
      .insert({
        user_id: authData.user.id,
        age_range: ageRange,
        skin_type: skinType,
        imperfections,
        main_goal: mainGoal,
        routine_steps: routineSteps,
      })
      .select('*')
      .single();

    if (insertError) {
      return res.status(400).json({
        status: 'error',
        message: insertError.message,
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Skin profile created successfully',
      data: {
        skinProfile,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unexpected server error',
    });
  }
};
