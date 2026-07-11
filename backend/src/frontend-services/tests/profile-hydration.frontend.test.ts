import type { UserProfile } from '@/types/user';

class MockApiRequestError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(String(body));
    this.status = status;
    this.body = body;
  }
}

const cachedProfile: UserProfile = {
  id: 'user-1',
  name: 'Perfil cacheado',
  email: 'cache@example.com',
  role: 'user',
  skinType: 'dry'
};

const realProfile: UserProfile = {
  id: 'user-1',
  name: 'Perfil Real',
  email: 'real@example.com',
  role: 'specialist',
  skinType: 'mixed'
};

const newSessionProfile: UserProfile = {
  id: 'user-2',
  name: 'Sesion Nueva',
  email: 'nueva@example.com',
  role: 'user',
  skinType: 'normal'
};

const storedSession = {
  profile: cachedProfile,
  session: {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresAt: 123456,
    expiresIn: 3600,
    tokenType: 'bearer'
  },
  savedAt: 1000,
  sessionId: 'session-1'
};

const authMeResponse = {
  user: {
    id: 'user-1',
    email: 'real@example.com'
  },
  profile: {
    id: 'user-1',
    name: 'Perfil Real',
    email: 'real@example.com',
    role: 'specialist',
    skinType: 'mixed'
  }
};

let mockApiRequest: jest.Mock = jest.fn();
let mockGetStoredSession: jest.Mock = jest.fn();
let mockGetStoredProfile: jest.Mock = jest.fn();
let mockSaveSession: jest.Mock = jest.fn();
let mockUpdateStoredProfileForSession: jest.Mock = jest.fn();

async function loadAuthService() {
  jest.resetModules();

  mockApiRequest = jest.fn(async () => authMeResponse);
  mockGetStoredSession = jest.fn(async () => storedSession);
  mockGetStoredProfile = jest.fn(async () => cachedProfile);
  mockSaveSession = jest.fn(async () => undefined);
  mockUpdateStoredProfileForSession = jest.fn(async () => true);

  jest.doMock('@/services/api/client', () => ({
    ApiRequestError: MockApiRequestError,
    apiRequest: mockApiRequest
  }));
  jest.doMock('@/services/session', () => ({
    clearSession: jest.fn(),
    getStoredProfile: mockGetStoredProfile,
    getStoredSession: mockGetStoredSession,
    saveSession: mockSaveSession,
    updateStoredProfile: jest.fn(),
    updateStoredProfileForSession: mockUpdateStoredProfileForSession
  }));
  jest.doMock('@/services/notifications', () => ({
    registerPushToken: jest.fn(),
    unregisterPushToken: jest.fn()
  }));
  jest.doMock('@/services/specialist', () => ({
    getSpecialistStatus: jest.fn()
  }));

  return import('@/services/auth');
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('hidratacion de perfil autenticado', () => {
  it('consulta /auth/me con sesion almacenada y guarda el perfil real', async () => {
    const service = await loadAuthService();

    await expect(service.synchronizeCurrentProfile()).resolves.toEqual(realProfile);

    expect(mockApiRequest).toHaveBeenCalledWith({
      path: '/auth/me',
      method: 'GET'
    });
    expect(mockUpdateStoredProfileForSession).toHaveBeenCalledWith(realProfile, 'session-1');
  });

  it('reemplaza el perfil cacheado por el perfil real del backend', async () => {
    const service = await loadAuthService();

    await expect(service.getCurrentProfile()).resolves.toEqual(cachedProfile);
    await expect(service.synchronizeCurrentProfile()).resolves.toEqual(realProfile);
  });

  it('devuelve null si /auth/me responde 401 despues del refresh fallido', async () => {
    const service = await loadAuthService();
    mockApiRequest.mockRejectedValue(new MockApiRequestError(401, { message: 'expired' }));

    await expect(service.synchronizeCurrentProfile()).resolves.toBeNull();
    expect(mockUpdateStoredProfileForSession).not.toHaveBeenCalled();
  });

  it('no duplica la carga con multiples consumidores simultaneos', async () => {
    const service = await loadAuthService();
    let resolveRequest: (value: unknown) => void = () => {};
    mockApiRequest.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));

    const first = service.synchronizeCurrentProfile();
    const second = service.synchronizeCurrentProfile();

    await Promise.resolve();
    resolveRequest(authMeResponse);

    await expect(Promise.all([first, second])).resolves.toEqual([realProfile, realProfile]);
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
  });

  it('no pisa una sesion nueva con una respuesta vieja', async () => {
    const service = await loadAuthService();
    mockUpdateStoredProfileForSession.mockResolvedValue(false);
    mockGetStoredProfile.mockResolvedValue(newSessionProfile);

    await expect(service.synchronizeCurrentProfile()).resolves.toEqual(newSessionProfile);
    expect(mockUpdateStoredProfileForSession).toHaveBeenCalledWith(realProfile, 'session-1');
  });

  it('logout durante hidratacion no restaura el perfil anterior', async () => {
    const service = await loadAuthService();
    mockUpdateStoredProfileForSession.mockResolvedValue(false);
    mockGetStoredProfile.mockResolvedValue(null);

    await expect(service.synchronizeCurrentProfile()).resolves.toBeNull();
  });

  it('devuelve el usuario actual sin persistir si se llama directo a /auth/me', async () => {
    const service = await loadAuthService();

    await expect(service.getCurrentAuthenticatedUser()).resolves.toEqual({
      user: authMeResponse.user,
      profile: realProfile
    });
    expect(mockUpdateStoredProfileForSession).not.toHaveBeenCalled();
  });
});
