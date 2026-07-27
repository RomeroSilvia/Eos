import { apiRequest } from '@/services/api/client';

export type SaveQuizPayload = {
  ageRange: string;
  skinType: string;
  imperfections: string;
  mainGoal: string;
  routineSteps: string;
};

export type SkinProfileResult = {
  ageRange: string;
  skinType: string;
  imperfections: string;
  mainGoal: string;
};

type SkinProfileRow = {
  age_range?: string | null;
  skin_type?: string | null;
  imperfections?: string | null;
  main_goal?: string | null;
};

export async function saveQuiz(payload: SaveQuizPayload): Promise<void> {
  await apiRequest<{ skinProfile: SkinProfileRow }>({
    path: '/quiz/save',
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getQuizProfile(): Promise<SkinProfileResult> {
  const data = await apiRequest<{ skinProfile?: SkinProfileRow }>({
    path: '/quiz/profile',
    method: 'GET'
  });

  if (!data.skinProfile) {
    throw new Error('No pudimos cargar tus resultados.');
  }

  return {
    ageRange: data.skinProfile.age_range ?? '',
    skinType: data.skinProfile.skin_type ?? '',
    imperfections: data.skinProfile.imperfections ?? '',
    mainGoal: data.skinProfile.main_goal ?? ''
  };
}
