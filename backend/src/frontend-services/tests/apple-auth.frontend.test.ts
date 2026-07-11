import type { UserProfile } from '@/types/user';

const profile: UserProfile = {
  id: 'user-1',
  name: 'Ana Apple',
  email: 'ana@example.com',
  role: 'user',
  skinType: 'mixed'
};

let mockIsAvailableAsync: jest.Mock = jest.fn();
let mockSignInAsync: jest.Mock = jest.fn();
let mockLoginWithAppleIdentityToken: jest.Mock = jest.fn();

function appleModuleMock() {
  return {
    isAvailableAsync: mockIsAvailableAsync,
    signInAsync: mockSignInAsync,
    AppleAuthenticationScope: {
      FULL_NAME: 0,
      EMAIL: 1
    }
  };
}

async function loadAppleAuthService() {
  jest.resetModules();

  mockIsAvailableAsync = jest.fn(async () => true);
  mockSignInAsync = jest.fn();
  mockLoginWithAppleIdentityToken = jest.fn(async () => profile);

  const appleMock = appleModuleMock();
  jest.doMock('expo-apple-authentication', () => appleMock);
  jest.doMock(
    require.resolve('expo-apple-authentication', { paths: [`${process.cwd()}\\..`] }),
    () => appleMock
  );
  jest.doMock('@/services/auth', () => ({
    loginWithAppleIdentityToken: mockLoginWithAppleIdentityToken
  }));

  const service = await import('@/services/appleAuth');
  service.resetAppleSignInForTests();
  return service;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('services/appleAuth', () => {
  it('confirma disponibilidad de Apple Sign-In', async () => {
    const service = await loadAppleAuthService();

    await expect(service.isAppleSignInAvailable()).resolves.toBe(true);

    expect(mockIsAvailableAsync).toHaveBeenCalledTimes(1);
  });

  it('falla si Apple Sign-In no esta disponible', async () => {
    const service = await loadAppleAuthService();
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(service.signInWithApple()).rejects.toMatchObject({
      reason: 'unsupported-platform'
    });
    expect(mockSignInAsync).not.toHaveBeenCalled();
  });

  it('trata un error de disponibilidad como plataforma no disponible', async () => {
    const service = await loadAppleAuthService();
    mockIsAvailableAsync.mockRejectedValue(new Error('native module unavailable'));

    await expect(service.signInWithApple()).rejects.toMatchObject({
      reason: 'unsupported-platform'
    });
    expect(mockSignInAsync).not.toHaveBeenCalled();
  });

  it('inicia sesion con identityToken, nombre y email cuando Apple los entrega', async () => {
    const service = await loadAppleAuthService();
    mockSignInAsync.mockResolvedValue({
      identityToken: 'apple-identity-token',
      fullName: {
        givenName: ' Ana ',
        familyName: ' Apple '
      },
      email: 'ANA@EXAMPLE.COM'
    });

    await expect(service.signInWithApple()).resolves.toEqual(profile);

    expect(mockSignInAsync).toHaveBeenCalledWith({
      requestedScopes: [0, 1]
    });
    expect(mockLoginWithAppleIdentityToken).toHaveBeenCalledWith({
      identityToken: 'apple-identity-token',
      givenName: 'Ana',
      familyName: 'Apple',
      email: 'ana@example.com'
    });
  });

  it('inicia sesion aunque Apple no entregue nombre ni email', async () => {
    const service = await loadAppleAuthService();
    mockSignInAsync.mockResolvedValue({
      identityToken: 'apple-identity-token',
      fullName: null,
      email: null
    });

    await expect(service.signInWithApple()).resolves.toEqual(profile);

    expect(mockLoginWithAppleIdentityToken).toHaveBeenCalledWith({
      identityToken: 'apple-identity-token',
      givenName: undefined,
      familyName: undefined,
      email: undefined
    });
  });

  it('trata la cancelacion como resultado nulo y no llama al backend', async () => {
    const service = await loadAppleAuthService();
    mockSignInAsync.mockRejectedValue(Object.assign(new Error('cancelled'), {
      code: 'ERR_REQUEST_CANCELED'
    }));

    await expect(service.signInWithApple()).resolves.toBeNull();

    expect(mockLoginWithAppleIdentityToken).not.toHaveBeenCalled();
  });

  it('falla si Apple no devuelve identityToken', async () => {
    const service = await loadAppleAuthService();
    mockSignInAsync.mockResolvedValue({
      identityToken: null,
      fullName: null,
      email: null
    });

    await expect(service.signInWithApple()).rejects.toMatchObject({
      reason: 'missing-identity-token'
    });
    expect(mockLoginWithAppleIdentityToken).not.toHaveBeenCalled();
  });

  it('previene doble ejecucion con una sola llamada real', async () => {
    const service = await loadAppleAuthService();
    let resolveSignIn: (value: unknown) => void = () => {};
    mockSignInAsync.mockReturnValue(new Promise((resolve) => {
      resolveSignIn = resolve;
    }));

    const firstSignIn = service.signInWithApple();
    const secondSignIn = service.signInWithApple();

    await Promise.resolve();
    resolveSignIn({
      identityToken: 'apple-identity-token',
      fullName: null,
      email: null
    });

    await expect(Promise.all([firstSignIn, secondSignIn])).resolves.toEqual([profile, profile]);
    expect(mockSignInAsync).toHaveBeenCalledTimes(1);
    expect(mockLoginWithAppleIdentityToken).toHaveBeenCalledTimes(1);
  });

  it('mapea errores del SDK', async () => {
    const service = await loadAppleAuthService();
    mockSignInAsync.mockRejectedValue(new Error('native error'));

    await expect(service.signInWithApple()).rejects.toMatchObject({
      reason: 'unknown'
    });
  });

  it('mapea errores del backend', async () => {
    const service = await loadAppleAuthService();
    mockSignInAsync.mockResolvedValue({
      identityToken: 'apple-identity-token',
      fullName: null,
      email: null
    });
    mockLoginWithAppleIdentityToken.mockRejectedValue(new Error('backend error'));

    await expect(service.signInWithApple()).rejects.toMatchObject({
      reason: 'backend'
    });
  });
});
