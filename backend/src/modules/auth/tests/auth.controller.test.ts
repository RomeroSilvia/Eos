import type { Request, Response } from 'express';
import { register } from '../auth.controller';
import { supabase } from '../../../config/supabase';

jest.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      admin: {
        createUser: jest.fn()
      },
      signInWithPassword: jest.fn()
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

function mockSuccessfulSupabase(role: string) {
  const single = jest.fn().mockResolvedValue({
    data: {
      id: 'user-1',
      email: 'marta@example.com',
      full_name: 'Marta Lopez',
      role
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
      session: { access_token: 'token-1' }
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
});
