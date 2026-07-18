import type { Request, Response } from 'express';
import { saveQuiz } from '../quiz.controller';
import { supabase } from '../../../config/supabase';
import { recordAuditLog } from '../../audit/audit.service';

jest.mock('../../../config/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../../audit/audit.service', () => ({
  recordAuditLog: jest.fn(async () => undefined)
}));

const mockedSupabase = jest.mocked(supabase);
const mockedRecordAuditLog = jest.mocked(recordAuditLog);

function makeRequest(body: Record<string, unknown>): Request {
  return {
    user: { id: 'user-1', role: 'user' },
    body
  } as unknown as Request;
}

function makeResponse(): Response & { json: jest.Mock; status: jest.Mock } {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };

  return response as unknown as Response & { json: jest.Mock; status: jest.Mock };
}

function mockQuizChain(options: { previousProfile: unknown; inserted: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: options.previousProfile, error: null });
  const limit = jest.fn().mockReturnValue({ maybeSingle });
  const order = jest.fn().mockReturnValue({ limit });
  const eqSelect = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq: eqSelect });

  const single = jest.fn().mockResolvedValue({ data: options.inserted, error: null });
  const selectAfterInsert = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select: selectAfterInsert });

  const eqUpdate = jest.fn().mockResolvedValue({ data: null, error: null });
  const update = jest.fn().mockReturnValue({ eq: eqUpdate });

  mockedSupabase.from.mockImplementation((table: string) => {
    if (table === 'skin_profiles') {
      return { select, insert } as never;
    }

    if (table === 'profiles') {
      return { update } as never;
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { select, insert, update };
}

const quizBody = {
  ageRange: '25-30',
  skinType: 'Normal',
  imperfections: 'Manchas',
  mainGoal: 'Unificar el tono',
  routineSteps: 'Tres pasos'
};

describe('quizController.saveQuiz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('audita la creacion del test de piel cuando no habia uno previo', async () => {
    const inserted = { id: 'quiz-1', user_id: 'user-1', age_range: '25-30' };
    mockQuizChain({ previousProfile: null, inserted });

    const req = makeRequest(quizBody);
    const res = makeResponse();

    await saveQuiz(req, res, jest.fn());

    expect(mockedRecordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'user-1',
      actorRole: 'user',
      action: 'create',
      entity: 'skin_profile',
      entityId: 'quiz-1',
      before: undefined,
      after: inserted
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('marca metadata de reintento cuando ya existia un test de piel previo', async () => {
    const previousProfile = { id: 'quiz-0', user_id: 'user-1', age_range: '-25' };
    const inserted = { id: 'quiz-2', user_id: 'user-1', age_range: '25-30' };
    mockQuizChain({ previousProfile, inserted });

    const req = makeRequest(quizBody);
    const res = makeResponse();

    await saveQuiz(req, res, jest.fn());

    expect(mockedRecordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      entity: 'skin_profile',
      entityId: 'quiz-2',
      before: previousProfile,
      after: inserted,
      metadata: { changeType: 'skin_quiz_retake' }
    }));
  });
});
