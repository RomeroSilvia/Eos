import { supabase } from '../../config/supabase';
import { authService } from './auth.service';

jest.mock('../../config/supabase', () => ({
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

function makeSession(accessToken = 'access-token-1', refreshToken = 'refresh-token-1') {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: 123456,
    expires_in: 3600,
    token_type: 'bearer'
  };
}

function makeUser() {
  return {
    id: 'user-1',
    email: 'marta@example.com',
    user_metadata: {
      name: 'Marta Lopez'
    }
  };
}

function makeProfile(role = 'user') {
  return {
    id: 'user-1',
    email: 'marta@example.com',
    full_name: 'Marta Lopez',
    role,
    skin_type: 'mixed',
    created_at: '2026-07-11T00:00:00.000Z',
    updated_at: '2026-07-11T00:00:00.000Z'
  };
}

function mockProfileLookup(profile = makeProfile()) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: profile,
    error: null
  });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });

  mockedSupabase.from.mockReturnValue({ select } as never);
}

function mockProfileUpsert(profile = makeProfile()) {
  const single = jest.fn().mockResolvedValue({
    data: profile,
    error: null
  });
  const select = jest.fn().mockReturnValue({ single });
  const upsert = jest.fn().mockReturnValue({ select });

  mockedSupabase.from.mockReturnValue({ upsert } as never);
}

describe('contrato uniforme de autenticacion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registro devuelve usuario, perfil y sesion publica sin exponer la sesion cruda de Supabase', async () => {
    mockedSupabase.auth.admin.createUser.mockResolvedValue({
      data: { user: makeUser() },
      error: null
    } as never);
    mockedSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: makeUser(),
        session: makeSession('register-access', 'register-refresh')
      },
      error: null
    } as never);
    mockProfileUpsert();

    const result = await authService.register({
      email: 'marta@example.com',
      password: 'secret123',
      username: '@marta',
      firstName: 'Marta',
      lastName: 'Lopez',
      role: 'user'
    });

    expect(result).toEqual({
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
        accessToken: 'register-access',
        refreshToken: 'register-refresh',
        expiresAt: 123456,
        expiresIn: 3600,
        tokenType: 'bearer'
      }
    });
    expect(result.session).not.toHaveProperty('access_token');
    expect(result.session).not.toHaveProperty('refresh_token');
    expect(result.user).not.toHaveProperty('user_metadata');
  });

  it('login email/password devuelve el mismo contrato publico', async () => {
    mockedSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: makeUser(),
        session: makeSession('login-access', 'login-refresh')
      },
      error: null
    } as never);
    mockProfileLookup(makeProfile('specialist'));

    const result = await authService.login({
      email: 'marta@example.com',
      password: 'secret123'
    });

    expect(result.session).toEqual({
      accessToken: 'login-access',
      refreshToken: 'login-refresh',
      expiresAt: 123456,
      expiresIn: 3600,
      tokenType: 'bearer'
    });
    expect(result.profile.role).toBe('specialist');
    expect(result.profile.name).toBe('Marta Lopez');
  });

  it('Google backend existente devuelve el mismo contrato publico', async () => {
    mockedSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: {
        user: makeUser(),
        session: makeSession('google-access', 'google-refresh')
      },
      error: null
    } as never);
    mockProfileLookup(makeProfile('user'));

    const result = await authService.googleLogin({ idToken: 'google-id-token' });

    expect(result).toEqual({
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
  });
});
