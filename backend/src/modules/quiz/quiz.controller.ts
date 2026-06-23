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

export const saveQuiz: RequestHandler = async (req, res, next) => {
  try {
    const {
      ageRange,
      skinType,
      imperfections,
      mainGoal,
      routineSteps
    } = req.body as SaveQuizBody;

    if (!ageRange?.trim() || !skinType?.trim() || !imperfections?.trim() || !mainGoal?.trim() || !routineSteps?.trim()) {
      throw new ApiError(400, 'All quiz answers are required');
    }

    const normalizedBody = {
      ageRange: ageRange.trim(),
      skinType: skinType.trim(),
      imperfections: imperfections.trim(),
      mainGoal: mainGoal.trim(),
      routineSteps: routineSteps.trim()
    };

    const { data, error } = await supabase
      .from('skin_profiles')
      .insert({
        user_id: req.user.id,
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

    const normalizedSkinType = normalizeSkinTypeToEnglish(normalizedBody.skinType);

    if (normalizedSkinType) {
      await supabase
        .from('profiles')
        .update({ skin_type: normalizedSkinType })
        .eq('id', req.user.id);
    }

    res.status(201).json({
      message: 'Skin profile created',
      skinProfile: data
    });
  } catch (error) {
    next(error);
  }
};

export const getQuizProfile: RequestHandler = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('skin_profiles')
      .select('id, user_id, age_range, skin_type, imperfections, main_goal, routine_steps, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, error.message);
    }

    if (!data) {
      throw new ApiError(404, 'Skin profile not found');
    }

    res.json({
      skinProfile: data
    });
  } catch (error) {
    next(error);
  }
};

function normalizeSkinTypeToEnglish(value: string): string | null {
  const map: Record<string, string> = {
    Normal: 'normal',
    Mixta: 'mixed',
    Seca: 'dry',
    Grasa: 'oily',
    Sensible: 'sensitive',
    normal: 'normal',
    mixed: 'mixed',
    dry: 'dry',
    oily: 'oily',
    sensitive: 'sensitive'
  };

  return map[value] ?? null;
}
