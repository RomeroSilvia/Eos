import type { Request, Response } from 'express';
import { assignRoutineToPatient } from '../specialists.directory.controller';
import { specialistsDirectoryService } from '../specialists.directory.service';

jest.mock('../specialists.directory.service', () => ({
  specialistsDirectoryService: {
    assignRoutineToPatient: jest.fn()
  }
}));

const mockedService = jest.mocked(specialistsDirectoryService);

type MockRequest = Partial<Request> & {
  params: Record<string, string | undefined>;
  user: {
    id: string;
    role?: 'user' | 'specialist' | 'center_admin';
  };
  body: Record<string, unknown>;
};

function mockResponse(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as unknown as Response;
}

describe('specialists.directory.controller assignRoutineToPatient', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('ignora assigned_by del frontend y asigna usando specialistId autenticado', async () => {
    const req = {
      params: { patientId: 'client-1' },
      user: { id: 'specialist-1', role: 'specialist', accessToken: 'token' },
      body: {
        name: 'Rutina indicada',
        description: 'Objetivo hidratacion',
        time_of_day: 'morning',
        is_active: true,
        assigned_by: 'malicious-user'
      }
    } as MockRequest;
    const res = mockResponse();

    mockedService.assignRoutineToPatient.mockResolvedValue({
      id: 'routine-1',
      user_id: 'client-1',
      assigned_by: 'specialist-1'
    } as any);

    await assignRoutineToPatient(req as Request, res, jest.fn());

    expect(mockedService.assignRoutineToPatient).toHaveBeenCalledWith('specialist-1', {
      clientId: 'client-1',
      name: 'Rutina indicada',
      description: 'Objetivo hidratacion',
      timeOfDay: 'morning',
      isActive: true
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
