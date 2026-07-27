import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { recordAuditLog } from '../audit/audit.service';
import { quizRepository } from './quiz.repository';
import type { SkinProfileRow } from '../../database/schema.types';

type SaveQuizInput = {
  userId: string;
  userRole: string;
  ageRange: string;
  skinType: string;
  imperfections: string;
  mainGoal: string;
  routineSteps: string;
};

export function getQuizHealth() {
  return {
    module: 'quiz',
    status: 'ready'
  };
}

export async function saveQuiz(input: SaveQuizInput): Promise<SkinProfileRow> {
  const previousProfile = await quizRepository.findLatestByUserId(input.userId);

  let skinProfile: SkinProfileRow;

  try {
    skinProfile = await quizRepository.insert({
      user_id: input.userId,
      age_range: input.ageRange,
      skin_type: input.skinType,
      imperfections: input.imperfections,
      main_goal: input.mainGoal,
      routine_steps: input.routineSteps
    });
  } catch (error) {
    throw mapQuizError(error as { code?: string; message: string });
  }

  void recordAuditLog({
    actorId: input.userId,
    actorRole: input.userRole,
    action: 'create',
    entity: 'skin_profile',
    entityId: skinProfile.id,
    before: previousProfile ?? undefined,
    after: skinProfile,
    metadata: previousProfile ? { changeType: 'skin_quiz_retake' } : undefined
  });

  const normalizedSkinType = normalizeSkinTypeToEnglish(input.skinType);

  if (normalizedSkinType) {
    const profileError = await quizRepository.updateProfileSkinType(input.userId, normalizedSkinType);

    if (profileError && env.nodeEnv === 'development') {
      console.error('[quiz] No se pudo actualizar el skin_type del perfil:', profileError.message);
    }
  }

  return skinProfile;
}

export async function getQuizProfile(userId: string): Promise<SkinProfileRow> {
  let skinProfile: SkinProfileRow | null;

  try {
    skinProfile = await quizRepository.findLatestByUserId(userId);
  } catch (error) {
    throw mapQuizError(error as { code?: string; message: string });
  }

  if (!skinProfile) {
    throw new ApiError(404, 'No encontramos un test de piel para este usuario.');
  }

  return skinProfile;
}

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
