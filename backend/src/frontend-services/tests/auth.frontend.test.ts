import type { UserProfile } from '@/types/user';

const profile: UserProfile = {
  id: 'user-1',
  name: 'Marta Lopez',
  email: 'marta@example.com',
  role: 'user',
  skinType: 'mixed'
};

const authResponse = {
  user: {
    id: 'user-1',
    email: 'marta@example.com'
  },
  profile,
  session: {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresAt: 123456,
    expiresIn: 3600,
    tokenType: 'bearer'
  }
};

let mockApiRequest: jest.Mock = jest.fn();
let mockSaveSession: jest.Mock = jest.fn();
let mockRegisterPushToken: jest.Mock = jest.fn();
let mockGetSpecialistStatus: jest.Mock = jest.fn();

async function loadAuthService() {
  jest.resetModules();

  mockApiRequest = jest.fn();
  mockSaveSession = jest.fn(async () => undefined);
  mockRegisterPushToken = jest.fn(async () => undefined);
  mockGetSpecialistStatus = jest.fn(async () => null);

  jest.doMock('@/services/api/client', () => ({
    ApiRequestError: class ApiRequestError extends Error {
      status: number;
      body: unknown;

      constructor(status: number, body: unknown) {
        super(String(body));
        this.status = status;
        this.body = body;
      }
    },
    apiRequest: mockApiRequest
  }));
  jest.doMock('@/services/session', () => ({
    clearSession: jest.fn(),
    getStoredProfile: jest.fn(),
    saveSession: mockSaveSession,
    updateStoredProfile: jest.fn()
  }));
  jest.doMock('@/services/notifications', () => ({
    registerPushToken: mockRegisterPushToken,
    unregisterPushToken: jest.fn()
  }));
  jest.doMock('@/services/specialist', () => ({
    getSpecialistStatus: mockGetSpecialistStatus
  }));

  return import('@/services/auth');
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('services/auth Google frontend', () => {
  it('consume /auth/google y guarda la sesion uniforme', async () => {
    const service = await loadAuthService();
    mockApiRequest.mockResolvedValue(authResponse);

    await expect(service.loginWithGoogleIdToken('google-id-token')).resolves.toEqual(profile);

    expect(mockApiRequest).toHaveBeenCalledWith({
      path: '/auth/google',
      method: 'POST',
      body: JSON.stringify({ idToken: 'google-id-token' })
    });
    expect(mockSaveSession).toHaveBeenCalledWith(profile, authResponse.session);
    expect(mockRegisterPushToken).toHaveBeenCalledTimes(1);
  });

  it('rechaza una respuesta backend con sesion incompleta y no persiste nada', async () => {
    const service = await loadAuthService();
    mockApiRequest.mockResolvedValue({
      ...authResponse,
      session: {
        ...authResponse.session,
        refreshToken: null
      }
    });

    await expect(service.loginWithGoogleIdToken('google-id-token')).rejects.toThrow(
      'La respuesta de autenticacion esta incompleta.'
    );
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('mantiene la navegacion por rol despues del login', async () => {
    const service = await loadAuthService();
    mockGetSpecialistStatus.mockResolvedValue({ license_status: 'verified' });

    await expect(service.getPostLoginRoute({ role: 'user' })).resolves.toBe('/(tabs)/home');
    await expect(service.getPostLoginRoute({ role: 'center_admin' })).resolves.toBe('/(tabs-admin)');
    await expect(service.getPostLoginRoute({ role: 'specialist' })).resolves.toBe('/(tabs-specialist)');

    mockGetSpecialistStatus.mockResolvedValue({ license_status: 'pending' });
    await expect(service.getPostLoginRoute({ role: 'specialist' })).resolves.toBe('/specialist-status');
  });

  it('mapea el rol devuelto por Google antes de guardar sesion', async () => {
    const service = await loadAuthService();
    const specialistProfile: UserProfile = {
      ...profile,
      role: 'specialist'
    };
    mockApiRequest.mockResolvedValue({
      ...authResponse,
      profile: {
        ...authResponse.profile,
        role: 'specialist'
      }
    });

    await expect(service.loginWithGoogleIdToken('google-id-token')).resolves.toEqual(specialistProfile);

    expect(mockSaveSession).toHaveBeenCalledWith(specialistProfile, authResponse.session);
  });
});
