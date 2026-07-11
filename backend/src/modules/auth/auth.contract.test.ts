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

function makeAppleUser(email?: string | null) {
  return {
    id: 'apple-user-1',
    email: email ?? undefined,
    user_metadata: {}
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

function makeAppleProfile(overrides: Partial<ReturnType<typeof makeProfile>> = {}) {
  return {
    ...makeProfile('user'),
    id: 'apple-user-1',
    email: 'private@privaterelay.appleid.com',
    full_name: 'Ana Apple',
    ...overrides
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

function mockProfileLookupOnce(profile: ReturnType<typeof makeProfile> | null) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: profile,
    error: null
  });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });

  mockedSupabase.from.mockReturnValueOnce({ select } as never);

  return { maybeSingle };
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

function mockProfileInsert(profile = makeAppleProfile()) {
  const single = jest.fn().mockResolvedValue({
    data: profile,
    error: null
  });
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });

  mockedSupabase.from.mockReturnValueOnce({ insert } as never);

  return { insert };
}

function mockProfileUpdate(profile = makeAppleProfile()) {
  const single = jest.fn().mockResolvedValue({
    data: profile,
    error: null
  });
  const select = jest.fn().mockReturnValue({ single });
  const eq = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq });

  mockedSupabase.from.mockReturnValueOnce({ update } as never);

  return { update };
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

  it('Apple con token valido devuelve el contrato publico y crea perfil nuevo', async () => {
    mockedSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: {
        user: makeAppleUser('private@privaterelay.appleid.com'),
        session: makeSession('apple-access', 'apple-refresh')
      },
      error: null
    } as never);
    mockProfileLookupOnce(null);
    const { insert } = mockProfileInsert();

    const result = await authService.appleLogin({
      identityToken: 'apple-identity-token',
      givenName: 'Ana',
      familyName: 'Apple',
      email: 'Private@PrivateRelay.AppleId.com'
    });

    expect(mockedSupabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'apple-identity-token'
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'apple-user-1',
      email: 'private@privaterelay.appleid.com',
      full_name: 'Ana Apple',
      role: 'user'
    }));
    expect(result).toEqual({
      user: {
        id: 'apple-user-1',
        email: 'private@privaterelay.appleid.com'
      },
      profile: {
        id: 'apple-user-1',
        name: 'Ana Apple',
        email: 'private@privaterelay.appleid.com',
        role: 'user',
        skinType: 'mixed'
      },
      session: {
        accessToken: 'apple-access',
        refreshToken: 'apple-refresh',
        expiresAt: 123456,
        expiresIn: 3600,
        tokenType: 'bearer'
      }
    });
    expect(result.session).not.toHaveProperty('access_token');
    expect(result.user).not.toHaveProperty('user_metadata');
  });

  it('Apple rechazado por Supabase devuelve error seguro', async () => {
    expect.assertions(2);
    mockedSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'invalid apple token', status: 401 }
    } as never);

    await authService.appleLogin({ identityToken: 'bad-token' }).catch((error) => {
      expect(error.statusCode).toBe(401);
      expect(error.message).not.toContain('invalid apple token');
    });
  });

  it('Apple con sesion nula falla sin crear perfil', async () => {
    mockedSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: {
        user: makeAppleUser('ana@example.com'),
        session: null
      },
      error: null
    } as never);

    await expect(authService.appleLogin({ identityToken: 'apple-identity-token' })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Apple authentication failed'
    });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('Apple recupera perfil existente sin sobrescribir datos editados', async () => {
    const existingProfile = makeAppleProfile({
      email: 'editado@example.com',
      full_name: 'Nombre Editado'
    });
    mockedSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: {
        user: makeAppleUser('private@privaterelay.appleid.com'),
        session: makeSession('apple-access', 'apple-refresh')
      },
      error: null
    } as never);
    mockProfileLookupOnce(existingProfile);

    const result = await authService.appleLogin({
      identityToken: 'apple-identity-token',
      givenName: 'Ana',
      familyName: 'Apple',
      email: 'private@privaterelay.appleid.com'
    });

    expect(mockedSupabase.from).toHaveBeenCalledTimes(1);
    expect(result.profile.name).toBe('Nombre Editado');
    expect(result.profile.email).toBe('editado@example.com');
  });

  it('Apple completa nombre y email faltantes en perfil existente', async () => {
    mockedSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: {
        user: makeAppleUser('relay@privaterelay.appleid.com'),
        session: makeSession('apple-access', 'apple-refresh')
      },
      error: null
    } as never);
    mockProfileLookupOnce(makeAppleProfile({ email: '', full_name: '' }));
    const { update } = mockProfileUpdate(makeAppleProfile({
      email: 'relay@privaterelay.appleid.com',
      full_name: 'Ana Apple'
    }));

    const result = await authService.appleLogin({
      identityToken: 'apple-identity-token',
      givenName: 'Ana',
      familyName: 'Apple'
    });

    expect(update).toHaveBeenCalledWith({
      email: 'relay@privaterelay.appleid.com',
      full_name: 'Ana Apple'
    });
    expect(result.profile.name).toBe('Ana Apple');
  });

  it('Apple crea perfil aunque nombre y email opcionales esten ausentes', async () => {
    mockedSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: {
        user: makeAppleUser(null),
        session: makeSession('apple-access', 'apple-refresh')
      },
      error: null
    } as never);
    mockProfileLookupOnce(null);
    const { insert } = mockProfileInsert(makeAppleProfile({
      email: '',
      full_name: 'apple-user-1'
    }));

    const result = await authService.appleLogin({ identityToken: 'apple-identity-token' });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'apple-user-1',
      email: '',
      full_name: 'apple-user-1',
      role: 'user'
    }));
    expect(result.profile.email).toBe('');
  });
});
