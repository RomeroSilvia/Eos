import type { RequestHandler } from 'express';
import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { recordAuditLog } from '../audit/audit.service';
import { TABLE_NAMES } from '../../database/tableNames';
import { env } from '../../config/env';

type SaveQuizBody = {
  ageRange?: string;
  skinType?: string;
  imperfections?: string;
  mainGoal?: string;
  routineSteps?: string;
};

export const quizHealth: RequestHandler = (_req, res) => {
  res.json({
    module: 'quiz',
    status: 'ready'
  });
};

export const saveQuiz: RequestHandler = asyncHandler(async (req, res) => {
  const {
    ageRange,
    skinType,
    imperfections,
    mainGoal,
    routineSteps
  } = req.body as SaveQuizBody;

  if (!ageRange?.trim() || !skinType?.trim() || !imperfections?.trim() || !mainGoal?.trim() || !routineSteps?.trim()) {
    throw new ApiError(400, 'Todas las respuestas del test son obligatorias.');
  }

  const normalizedBody = {
    ageRange: ageRange.trim(),
    skinType: skinType.trim(),
    imperfections: imperfections.trim(),
    mainGoal: mainGoal.trim(),
    routineSteps: routineSteps.trim()
  };

  const { data: previousProfile } = await supabase
    .from(TABLE_NAMES.skinProfiles)
    .select('id, user_id, age_range, skin_type, imperfections, main_goal, routine_steps, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from(TABLE_NAMES.skinProfiles)
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
    throw mapQuizError(error);
  }

  void recordAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role ?? 'user',
    action: 'create',
    entity: 'skin_profile',
    entityId: data.id,
    before: previousProfile ?? undefined,
    after: data,
    metadata: previousProfile ? { changeType: 'skin_quiz_retake' } : undefined
  });

  const normalizedSkinType = normalizeSkinTypeToEnglish(normalizedBody.skinType);

  if (normalizedSkinType) {
    const { error: profileError } = await supabase
      .from(TABLE_NAMES.profiles)
      .update({ skin_type: normalizedSkinType })
      .eq('id', req.user.id);

    if (profileError && env.nodeEnv === 'development') {
      console.error('[quiz] No se pudo actualizar el skin_type del perfil:', profileError.message);
    }
  }

  res.status(201).json({
    message: 'Test de piel guardado correctamente.',
    skinProfile: data
  });
});

export const getQuizProfile: RequestHandler = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.skinProfiles)
    .select('id, user_id, age_range, skin_type, imperfections, main_goal, routine_steps, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw mapQuizError(error);
  }

  if (!data) {
    throw new ApiError(404, 'No encontramos un test de piel para este usuario.');
  }

  res.json({
    skinProfile: data
  });
});

function mapQuizError(error: { code?: string; message: string }): ApiError {
  if (env.nodeEnv === 'development') {
    console.error('[quiz] Error de Supabase:', error.message);
  }

  if (error.code === '23505') {
    return new ApiError(409, 'Ya existe un test de piel para este usuario.');
  }

  return new ApiError(500, 'No pudimos guardar tu test de piel. Intentá nuevamente.');
}

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
