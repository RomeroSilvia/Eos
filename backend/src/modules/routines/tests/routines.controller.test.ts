import type { Request, Response } from 'express';
import { createRoutine } from '../routines.controller';
import { routinesService } from '../routines.service';

jest.mock('../routines.service', () => ({
  routinesService: {
    createRoutine: jest.fn()
  }
}));

const mockedService = jest.mocked(routinesService);

type MockRequest = Partial<Request> & {
  user: {
    id: string;
    role?: 'user' | 'specialist' | 'center_admin';
  };
  body: Record<string, unknown>;
};

function mockResponse(): Response {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as unknown as Response;

  return response;
}

describe('routines.controller createRoutine', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('usuario comun crea rutina propia con user_id del token y sin assigned_by', async () => {
    const req = {
      user: { id: 'user-1', role: 'user' },
      body: {
        name: 'Rutina personal',
        description: 'Descripcion',
        time_of_day: 'morning',
        assigned_by: 'malicious-specialist'
      }
    } as MockRequest;
    const res = mockResponse();

    mockedService.createRoutine.mockResolvedValue({
      id: 'routine-1',
      user_id: 'user-1',
      assigned_by: null
    } as any);

    await createRoutine(req as Request, res, jest.fn());

    expect(mockedService.createRoutine).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: 'Rutina personal',
      description: 'Descripcion',
      time_of_day: 'morning',
      is_active: true
    });
    expect(mockedService.createRoutine).not.toHaveBeenCalledWith(expect.objectContaining({
      assigned_by: expect.anything()
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('especialista crea rutina propia sin assigned_by cuando no hay clientId', async () => {
    const req = {
      user: { id: 'specialist-1', role: 'specialist' },
      body: {
        name: 'Rutina del especialista',
        time_of_day: 'night'
      }
    } as MockRequest;
    const res = mockResponse();

    mockedService.createRoutine.mockResolvedValue({
      id: 'routine-2',
      user_id: 'specialist-1',
      assigned_by: null
    } as any);

    await createRoutine(req as Request, res, jest.fn());

    expect(mockedService.createRoutine).toHaveBeenCalledWith({
      user_id: 'specialist-1',
      name: 'Rutina del especialista',
      description: null,
      time_of_day: 'night',
      is_active: true
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
