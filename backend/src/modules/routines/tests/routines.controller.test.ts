import type { Request, Response } from 'express';
import { createRoutine, deleteStep, updateStep } from '../routines.controller';
import { routinesService } from '../routines.service';

jest.mock('../routines.service', () => ({
  routinesService: {
    createRoutine: jest.fn(),
    updateStep: jest.fn(),
    deleteStep: jest.fn()
  }
}));

const mockedService = jest.mocked(routinesService);

type MockRequest = Partial<Request> & {
  user: {
    id: string;
    role?: 'user' | 'specialist' | 'center_admin';
    accessToken: string;
  };
  body: Record<string, unknown>;
  params?: Record<string, string>;
};

function mockResponse(): Response {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn()
  } as unknown as Response;

  return response;
}

describe('routines.controller createRoutine', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('usuario comun crea rutina propia con user_id del token y sin assigned_by', async () => {
    const req = {
      user: { id: 'user-1', role: 'user', accessToken: 'token' },
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
      user: { id: 'specialist-1', role: 'specialist', accessToken: 'token' },
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

describe('routines.controller pasos por ruta anidada', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('pasa routineId y stepId al service al editar un paso', async () => {
    const req = {
      user: { id: 'user-1', role: 'user', accessToken: 'token' },
      params: { id: 'routine-1', stepId: 'step-1' },
      body: {
        name: 'Limpieza suave',
        step_order: 2
      }
    } as MockRequest;
    const res = mockResponse();

    mockedService.updateStep.mockResolvedValue({
      id: 'step-1',
      routine_id: 'routine-1',
      name: 'Limpieza suave'
    } as any);

    await updateStep(req as any, res, jest.fn());

    expect(mockedService.updateStep).toHaveBeenCalledWith(
      'step-1',
      'user-1',
      'user',
      req.body,
      'routine-1'
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'step-1',
      routine_id: 'routine-1'
    }));
  });

  it('pasa routineId y stepId al service al eliminar un paso', async () => {
    const req = {
      user: { id: 'user-1', role: 'user', accessToken: 'token' },
      params: { id: 'routine-1', stepId: 'step-1' },
      body: {}
    } as MockRequest;
    const res = mockResponse();

    mockedService.deleteStep.mockResolvedValue(true);

    await deleteStep(req as any, res, jest.fn());

    expect(mockedService.deleteStep).toHaveBeenCalledWith(
      'step-1',
      'user-1',
      'user',
      'routine-1'
    );
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
