import type { Request, Response } from 'express';
import { googleLogin, login, register } from '../auth.controller';
import { supabase } from '../../../config/supabase';

jest.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      admin: {
        createUser: jest.fn()
      },
      signInWithPassword: jest.fn(),
      signInWithIdToken: jest.fn()
    },
    from: jest.fn()
  }
}));

const mockedSupabase = jest.mocked(supabase);

function makeRegisterRequest(role: string): Request {
  return {
    body: {
      email: 'marta@example.com',
      password: 'secret123',
      username: '@marta',
      firstName: 'Marta',
      lastName: 'Lopez',
      role
    }
  } as Request;
}

function makeLoginRequest(): Request {
  return {
    body: {
      email: 'marta@example.com',
      password: 'secret123'
    }
  } as Request;
}

function makeGoogleRequest(): Request {
  return {
    body: {
      idToken: 'google-id-token'
    }
  } as Request;
}

function makeResponse(): Response & { json: jest.Mock; status: jest.Mock } {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };

  return response as unknown as Response & { json: jest.Mock; status: jest.Mock };
}

async function runHandler(req: Request, res: Response, next: jest.Mock): Promise<void> {
  register(req, res, next);
  await new Promise((resolve) => setImmediate(resolve));
}

async function runLoginHandler(req: Request, res: Response, next: jest.Mock): Promise<void> {
  login(req, res, next);
  await new Promise((resolve) => setImmediate(resolve));
}

async function runGoogleHandler(req: Request, res: Response, next: jest.Mock): Promise<void> {
  googleLogin(req, res, next);
  await new Promise((resolve) => setImmediate(resolve));
}

function makeSupabaseSession(accessToken = 'access-token-1', refreshToken = 'refresh-token-1') {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: 123456,
    expires_in: 3600,
    token_type: 'bearer'
  };
}

function makeProfile(role: string) {
  return {
    id: 'user-1',
    email: 'marta@example.com',
    full_name: 'Marta Lopez',
    role,
    skin_type: 'mixed'
  };
}

function mockProfileLookup(profile = makeProfile('user')) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: profile,
    error: null
  });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });

  mockedSupabase.from.mockReturnValue({ select } as never);

  return { maybeSingle };
}

function mockSuccessfulSupabase(role: string) {
  const single = jest.fn().mockResolvedValue({
    data: {
      id: 'user-1',
      email: 'marta@example.com',
      full_name: 'Marta Lopez',
      role,
      skin_type: 'mixed'
    },
    error: null
  });
  const select = jest.fn().mockReturnValue({ single });
  const upsert = jest.fn().mockReturnValue({ select });

  mockedSupabase.auth.admin.createUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null
  } as never);
  mockedSupabase.auth.signInWithPassword.mockResolvedValue({
    data: {
      user: { id: 'user-1', email: 'marta@example.com' },
      session: makeSupabaseSession('token-1', 'refresh-1')
    },
    error: null
  } as never);
  mockedSupabase.from.mockReturnValue({ upsert } as never);

  return { upsert };
}

describe('authController.register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('permite registrar un usuario con rol user', async () => {
    const { upsert } = mockSuccessfulSupabase('user');
    const res = makeResponse();
    const next = jest.fn();

    await runHandler(makeRegisterRequest('user'), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user' }),
      { onConflict: 'id' }
    );
  });

  it('permite registrar un usuario con rol specialist', async () => {
    const { upsert } = mockSuccessfulSupabase('specialist');
    const res = makeResponse();
    const next = jest.fn();

    await runHandler(makeRegisterRequest('specialist'), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'specialist' }),
      { onConflict: 'id' }
    );
  });

  it('no permite registrar center_admin desde el registro publico', async () => {
    const res = makeResponse();
    const next = jest.fn();

    await runHandler(makeRegisterRequest('center_admin'), res, next);

    expect(mockedSupabase.auth.admin.createUser).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'No podes registrarte como administrador desde el registro publico.'
      })
    );
  });

  it('guarda el rol en profiles.role', async () => {
    const { upsert } = mockSuccessfulSupabase('specialist');
    const res = makeResponse();
    const next = jest.fn();

    await runHandler(makeRegisterRequest('specialist'), res, next);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        email: 'marta@example.com',
        full_name: 'Marta Lopez',
        role: 'specialist'
      }),
      { onConflict: 'id' }
    );
  });

  it('devuelve el contrato uniforme de sesion en registro sin exponer la sesion cruda de Supabase', async () => {
    mockSuccessfulSupabase('user');
    const res = makeResponse();
    const next = jest.fn();

    await runHandler(makeRegisterRequest('user'), res, next);

    expect(res.json).toHaveBeenCalledWith({
      user: {
        id: 'user-1',
        email: 'marta@example.com'
      },
      profile: {
        id: 'user-1',
        name: 'Marta Lopez',
        email: 'marta@example.com',
        role: 'user',
        skinType: 'mixed'
      },
      session: {
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
        expiresAt: 123456,
        expiresIn: 3600,
        tokenType: 'bearer'
      }
    });
    expect(res.json.mock.calls[0][0].session).not.toHaveProperty('access_token');
    expect(res.json.mock.calls[0][0].session).not.toHaveProperty('refresh_token');
  });

  it('devuelve el mismo contrato uniforme en login email/password', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'marta@example.com' },
        session: makeSupabaseSession('login-access', 'login-refresh')
      },
      error: null
    } as never);
    mockProfileLookup(makeProfile('specialist'));

    await runLoginHandler(makeLoginRequest(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      user: {
        id: 'user-1',
        email: 'marta@example.com'
      },
      profile: {
        id: 'user-1',
        name: 'Marta Lopez',
        email: 'marta@example.com',
        role: 'specialist',
        skinType: 'mixed'
      },
      session: {
        accessToken: 'login-access',
        refreshToken: 'login-refresh',
        expiresAt: 123456,
        expiresIn: 3600,
        tokenType: 'bearer'
      }
    });
  });

  it('devuelve el mismo contrato uniforme en Google backend existente', async () => {
    const res = makeResponse();
    const next = jest.fn();

    mockedSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'marta@example.com', user_metadata: { name: 'Marta Lopez' } },
        session: makeSupabaseSession('google-access', 'google-refresh')
      },
      error: null
    } as never);
    mockProfileLookup(makeProfile('user'));

    await runGoogleHandler(makeGoogleRequest(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      user: {
        id: 'user-1',
        email: 'marta@example.com'
      },
      profile: {
        id: 'user-1',
        name: 'Marta Lopez',
        email: 'marta@example.com',
        role: 'user',
        skinType: 'mixed'
      },
      session: {
        accessToken: 'google-access',
        refreshToken: 'google-refresh',
        expiresAt: 123456,
        expiresIn: 3600,
        tokenType: 'bearer'
      }
    });
    expect(res.json.mock.calls[0][0].user).not.toHaveProperty('user_metadata');
  });
});
