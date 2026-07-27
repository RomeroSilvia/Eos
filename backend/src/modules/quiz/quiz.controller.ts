import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { getQuizHealth, getQuizProfile as getQuizProfileService, saveQuiz as saveQuizService } from './quiz.service';

type SaveQuizBody = {
  ageRange?: string;
  skinType?: string;
  imperfections?: string;
  mainGoal?: string;
  routineSteps?: string;
};

export const quizHealth: RequestHandler = (_req, res) => {
  res.json(getQuizHealth());
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

  const skinProfile = await saveQuizService({
    userId: req.user.id,
    userRole: req.user.role ?? 'user',
    ageRange: ageRange.trim(),
    skinType: skinType.trim(),
    imperfections: imperfections.trim(),
    mainGoal: mainGoal.trim(),
    routineSteps: routineSteps.trim()
  });

  res.status(201).json({
    message: 'Test de piel guardado correctamente.',
    skinProfile
  });
});

export const getQuizProfile: RequestHandler = asyncHandler(async (req, res) => {
  const skinProfile = await getQuizProfileService(req.user.id);

  res.json({
    skinProfile
  });
});
