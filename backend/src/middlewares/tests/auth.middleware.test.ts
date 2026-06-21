import type { NextFunction, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/ApiError';
import { authenticate } from '../auth.middleware';

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn()
  }
}));

const mockedSupabase = jest.mocked(supabase);

function makeRequest(token = 'token-valido'): Request {
  return {
    header: jest.fn((name: string) => (name === 'Authorization' ? `Bearer ${token}` : undefined))
  } as unknown as Request;
}

describe('authenticate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('carga req.user.id y req.user.role cuando el token y perfil son validos', async () => {
    const req = makeRequest();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { role: 'specialist' },
      error: null
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });

    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    } as any);
    mockedSupabase.from.mockReturnValue({ select } as any);

    await authenticate(req, {} as Response, next);

    expect(req.user).toEqual({
      id: 'user-1',
      role: 'specialist',
      accessToken: 'token-valido'
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('no expone el mensaje tecnico cuando falla la carga del perfil', async () => {
    const internalMessage = 'relation "profiles" does not exist';
    const next = jest.fn() as jest.MockedFunction<NextFunction>;
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: internalMessage }
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });

    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    } as any);
    mockedSupabase.from.mockReturnValue({ select } as any);

    await authenticate(makeRequest(), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = next.mock.calls[0][0] as unknown as ApiError;
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('No pudimos validar tu sesión.');
    expect(error.message).not.toContain(internalMessage);
  });

  it('mantiene 401 para token invalido', async () => {
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid jwt' }
    } as any);

    await authenticate(makeRequest('token-invalido'), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = next.mock.calls[0][0] as unknown as ApiError;
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Token inválido o expirado.');
  });
});
