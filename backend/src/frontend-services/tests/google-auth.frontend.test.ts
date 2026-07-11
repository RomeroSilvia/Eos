import type { UserProfile } from '@/types/user';

type PlatformOS = 'android' | 'ios' | 'web';

const profile: UserProfile = {
  id: 'user-1',
  name: 'Marta Lopez',
  email: 'marta@example.com',
  role: 'user',
  skinType: 'mixed'
};

let mockPlatformOS: PlatformOS = 'android';
let mockConfigure: jest.Mock = jest.fn();
let mockHasPlayServices: jest.Mock = jest.fn();
let mockSignIn: jest.Mock = jest.fn();
let mockLoginWithGoogleIdToken: jest.Mock = jest.fn();

function googleModuleMock() {
  return {
    GoogleSignin: {
      configure: mockConfigure,
      hasPlayServices: mockHasPlayServices,
      signIn: mockSignIn
    },
    statusCodes: {
      SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
      IN_PROGRESS: 'IN_PROGRESS',
      PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE'
    },
    isCancelledResponse: (response: { type?: string }) => response.type === 'cancelled',
    isSuccessResponse: (response: { type?: string }) => response.type === 'success',
    isErrorWithCode: (error: unknown): error is { code: string } => (
      Boolean(error)
      && typeof error === 'object'
      && typeof (error as { code?: unknown }).code === 'string'
    )
  };
}

async function loadGoogleAuthService() {
  jest.resetModules();

  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client-id';
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = 'android-client-id';
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-client-id.apps.googleusercontent.com';

  mockConfigure = jest.fn();
  mockHasPlayServices = jest.fn(async () => true);
  mockSignIn = jest.fn();
  mockLoginWithGoogleIdToken = jest.fn(async () => profile);

  jest.doMock('react-native', () => ({
    Platform: {
      get OS() {
        return mockPlatformOS;
      }
    }
  }));

  const googleMock = googleModuleMock();
  jest.doMock('@react-native-google-signin/google-signin', () => googleMock);
  jest.doMock(
    require.resolve('@react-native-google-signin/google-signin', { paths: [`${process.cwd()}\\..`] }),
    () => googleMock
  );
  jest.doMock('@/services/auth', () => ({
    loginWithGoogleIdToken: mockLoginWithGoogleIdToken
  }));

  const service = await import('@/services/googleAuth');
  service.resetGoogleSignInForTests();
  return service;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  mockPlatformOS = 'android';
});

describe('services/googleAuth', () => {
  it('inicia sesion con Google, obtiene idToken y llama al backend', async () => {
    const service = await loadGoogleAuthService();
    mockSignIn.mockResolvedValue({
      type: 'success',
      data: {
        idToken: 'google-id-token'
      }
    });

    await expect(service.signInWithGoogle()).resolves.toEqual(profile);

    expect(mockConfigure).toHaveBeenCalledWith({
      scopes: ['profile', 'email'],
      webClientId: 'web-client-id',
      iosClientId: undefined
    });
    expect(mockHasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
    expect(mockLoginWithGoogleIdToken).toHaveBeenCalledWith('google-id-token');
  });

  it('trata la cancelacion como resultado nulo y no llama al backend', async () => {
    const service = await loadGoogleAuthService();
    mockSignIn.mockResolvedValue({
      type: 'cancelled',
      data: null
    });

    await expect(service.signInWithGoogle()).resolves.toBeNull();

    expect(mockLoginWithGoogleIdToken).not.toHaveBeenCalled();
  });

  it('falla si Google no devuelve idToken', async () => {
    const service = await loadGoogleAuthService();
    mockSignIn.mockResolvedValue({
      type: 'success',
      data: {
        idToken: null
      }
    });

    await expect(service.signInWithGoogle()).rejects.toMatchObject({
      reason: 'missing-id-token'
    });
    expect(mockLoginWithGoogleIdToken).not.toHaveBeenCalled();
  });

  it('mapea errores de Play Services lanzados por el SDK', async () => {
    const service = await loadGoogleAuthService();
    mockHasPlayServices.mockRejectedValue(Object.assign(new Error('Play Services'), {
      code: 'PLAY_SERVICES_NOT_AVAILABLE'
    }));

    await expect(service.signInWithGoogle()).rejects.toMatchObject({
      reason: 'play-services-unavailable'
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('mapea el error IN_PROGRESS del SDK sin iniciar otra validacion backend', async () => {
    const service = await loadGoogleAuthService();
    mockSignIn.mockRejectedValue(Object.assign(new Error('In progress'), {
      code: 'IN_PROGRESS'
    }));

    await expect(service.signInWithGoogle()).rejects.toMatchObject({
      reason: 'in-progress'
    });

    expect(mockLoginWithGoogleIdToken).not.toHaveBeenCalled();
  });

  it('falla si el backend rechaza o devuelve una respuesta invalida', async () => {
    const service = await loadGoogleAuthService();
    mockSignIn.mockResolvedValue({
      type: 'success',
      data: {
        idToken: 'google-id-token'
      }
    });
    mockLoginWithGoogleIdToken.mockRejectedValue(new Error('La respuesta de autenticacion esta incompleta.'));

    await expect(service.signInWithGoogle()).rejects.toMatchObject({
      reason: 'backend'
    });
  });

  it('no inicia Google Sign-In en web con esta libreria', async () => {
    mockPlatformOS = 'web';
    const service = await loadGoogleAuthService();

    await expect(service.signInWithGoogle()).rejects.toMatchObject({
      reason: 'unsupported-platform'
    });

    expect(mockConfigure).not.toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('previene doble envio compartiendo una unica llamada en curso', async () => {
    const service = await loadGoogleAuthService();
    let resolveSignIn: (value: unknown) => void = () => {};
    mockSignIn.mockReturnValue(new Promise((resolve) => {
      resolveSignIn = resolve;
    }));

    const firstSignIn = service.signInWithGoogle();
    const secondSignIn = service.signInWithGoogle();

    await Promise.resolve();
    await Promise.resolve();
    resolveSignIn({
      type: 'success',
      data: {
        idToken: 'google-id-token'
      }
    });

    await expect(Promise.all([firstSignIn, secondSignIn])).resolves.toEqual([profile, profile]);
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockLoginWithGoogleIdToken).toHaveBeenCalledTimes(1);
  });
});
