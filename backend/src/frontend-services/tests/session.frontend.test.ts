type StorageMap = Record<string, string>;

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
};

const profile = {
  id: 'user-1',
  name: 'Marta Lopez',
  email: 'marta@example.com',
  role: 'user' as const,
  skinType: 'mixed' as const
};

const session = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresAt: 123456,
  expiresIn: 3600,
  tokenType: 'bearer'
};

let mockPlatformOS: 'web' | 'ios' = 'web';
let mockSecureStore: StorageMap = {};
let localStorageData: StorageMap = {};
let mockRefreshSession: jest.Mock = jest.fn();
let mockSetSession: jest.Mock = jest.fn();
let mockSignOut: jest.Mock = jest.fn();
let mockCreateClient: jest.Mock = jest.fn();

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformOS;
    }
  }
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecureStore[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockSecureStore[key];
  })
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args)
}));

function makeSupabaseSession(accessToken: string, refreshToken: string): SupabaseSession {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: 654321,
    expires_in: 7200,
    token_type: 'bearer'
  };
}

function installLocalStorage() {
  Object.defineProperty(global, 'localStorage', {
    configurable: true,
    value: {
      getItem: jest.fn((key: string) => localStorageData[key] ?? null),
      setItem: jest.fn((key: string, value: string) => {
        localStorageData[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete localStorageData[key];
      })
    }
  });
}

async function loadSessionService() {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://eos.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

  mockRefreshSession = jest.fn();
  mockSetSession = jest.fn(async () => ({ data: {}, error: null }));
  mockSignOut = jest.fn(async () => ({ error: null }));
  mockCreateClient = jest.fn(() => ({
    auth: {
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
      setSession: (...args: unknown[]) => mockSetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args)
    }
  }));
  jest.doMock(require.resolve('@supabase/supabase-js', { paths: [`${process.cwd()}\\..`] }), () => ({
    createClient: (...args: unknown[]) => mockCreateClient(...args)
  }));

  return import('@/services/session');
}

async function seedStoredSession(service: Awaited<ReturnType<typeof loadSessionService>>) {
  await service.saveSession(profile, session);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  mockPlatformOS = 'web';
  mockSecureStore = {};
  localStorageData = {};
  installLocalStorage();
});

describe('services/session', () => {
  it('guarda y recupera una sesion en storage web', async () => {
    const service = await loadSessionService();

    await service.saveSession(profile, session);

    await expect(service.getStoredSession()).resolves.toMatchObject({
      profile,
      session
    });
    expect(localStorage.getItem('eos-auth-session-v1')).toContain('access-1');
  });

  it('usa SecureStore en native con mock y no localStorage', async () => {
    mockPlatformOS = 'ios';
    const service = await loadSessionService();

    await service.saveSession(profile, session);

    expect(mockSecureStore['eos-auth-session-v1']).toContain('refresh-1');
    expect(localStorage.getItem('eos-auth-session-v1')).toBeNull();
    await expect(service.getAccessToken()).resolves.toBe('access-1');
  });

  it('migra desde eos-session y eos-access-token', async () => {
    localStorageData['eos-session'] = JSON.stringify({ profile });
    localStorageData['eos-access-token'] = 'legacy-access';
    const service = await loadSessionService();

    await expect(service.getStoredSession()).resolves.toMatchObject({
      profile,
      session: {
        accessToken: 'legacy-access',
        refreshToken: null,
        expiresAt: null,
        expiresIn: null,
        tokenType: 'bearer'
      }
    });
    expect(localStorage.getItem('eos-session')).toBeNull();
    expect(localStorage.getItem('eos-access-token')).toBeNull();
  });

  it('recupera una sesion legacy si la sesion nueva esta corrupta', async () => {
    localStorageData['eos-auth-session-v1'] = '{no-json';
    localStorageData['eos-session'] = JSON.stringify({ profile });
    localStorageData['eos-access-token'] = 'legacy-access';
    const service = await loadSessionService();

    await expect(service.getAccessToken()).resolves.toBe('legacy-access');
    expect(localStorage.getItem('eos-auth-session-v1')).toContain('legacy-access');
  });

  it('limpia claves nuevas y legacy si la sesion legacy esta corrupta', async () => {
    localStorageData['eos-session'] = '{no-json';
    localStorageData['eos-access-token'] = 'legacy-access';
    const service = await loadSessionService();

    await expect(service.getStoredSession()).resolves.toBeNull();

    expect(localStorage.getItem('eos-auth-session-v1')).toBeNull();
    expect(localStorage.getItem('eos-session')).toBeNull();
    expect(localStorage.getItem('eos-access-token')).toBeNull();
  });

  it('refresca la sesion exitosamente y devuelve el nuevo access token', async () => {
    const service = await loadSessionService();
    await seedStoredSession(service);
    mockRefreshSession.mockResolvedValue({
      data: { session: makeSupabaseSession('access-2', 'refresh-2') },
      error: null
    });

    await expect(service.refreshAccessToken()).resolves.toBe('access-2');
    await expect(service.getStoredSession()).resolves.toMatchObject({
      session: {
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        expiresAt: 654321,
        expiresIn: 7200,
        tokenType: 'bearer'
      }
    });
  });

  it('limpia la sesion si el refresh falla', async () => {
    const service = await loadSessionService();
    await seedStoredSession(service);
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'invalid refresh token' }
    });

    await expect(service.refreshAccessToken()).resolves.toBeNull();
    await expect(service.getStoredSession()).resolves.toBeNull();
  });

  it('rota access token y refresh token sin conservar el par anterior', async () => {
    const service = await loadSessionService();
    await seedStoredSession(service);
    mockRefreshSession.mockResolvedValue({
      data: { session: makeSupabaseSession('rotated-access', 'rotated-refresh') },
      error: null
    });

    await service.refreshAccessToken();

    const serialized = localStorage.getItem('eos-auth-session-v1') ?? '';
    expect(serialized).toContain('rotated-access');
    expect(serialized).toContain('rotated-refresh');
    expect(serialized).not.toContain('access-1');
    expect(serialized).not.toContain('refresh-1');
  });

  it('detecta si una sesion esta expirada usando expiresAt', async () => {
    const service = await loadSessionService();
    const now = Math.floor(Date.now() / 1000);

    expect(service.isSessionExpired({ ...session, expiresAt: now - 1 })).toBe(true);
    expect(service.isSessionExpired({ ...session, expiresAt: now + 120 })).toBe(false);
  });

  it('dos refresh simultaneos producen una sola llamada real', async () => {
    const service = await loadSessionService();
    await seedStoredSession(service);
    mockRefreshSession.mockResolvedValue({
      data: { session: makeSupabaseSession('access-2', 'refresh-2') },
      error: null
    });

    await Promise.all([
      service.refreshAccessToken(),
      service.refreshAccessToken()
    ]);

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it('logout durante refresh impide que el refresh tardio restaure la sesion', async () => {
    const service = await loadSessionService();
    await seedStoredSession(service);
    let resolveRefresh: (value: unknown) => void = () => {};
    mockRefreshSession.mockReturnValue(new Promise((resolve) => {
      resolveRefresh = resolve;
    }));

    const refreshPromise = service.refreshAccessToken();
    await service.clearSession({ remote: true });
    resolveRefresh({
      data: { session: makeSupabaseSession('late-access', 'late-refresh') },
      error: null
    });

    await expect(refreshPromise).resolves.toBeNull();
    await expect(service.getStoredSession()).resolves.toBeNull();
  });

  it('logout limpia claves nuevas y legacy', async () => {
    const service = await loadSessionService();
    await seedStoredSession(service);
    localStorageData['eos-session'] = JSON.stringify({ profile });
    localStorageData['eos-access-token'] = 'legacy-access';

    await service.clearSession();

    expect(localStorage.getItem('eos-auth-session-v1')).toBeNull();
    expect(localStorage.getItem('eos-session')).toBeNull();
    expect(localStorage.getItem('eos-access-token')).toBeNull();
  });

  it('notifica invalidacion de sesion y permite desuscribirse', async () => {
    const service = await loadSessionService();
    await seedStoredSession(service);
    const listener = jest.fn();
    const unsubscribe = service.onSessionInvalidated(listener);

    await service.clearSession();
    unsubscribe();
    await service.clearSession();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('fallo de Supabase signOut no impide limpieza local', async () => {
    const service = await loadSessionService();
    await seedStoredSession(service);
    mockSignOut.mockRejectedValue(new Error('network error'));

    await service.clearSession({ remote: true });

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'access-1',
      refresh_token: 'refresh-1'
    });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    await expect(service.getStoredSession()).resolves.toBeNull();
  });
});
