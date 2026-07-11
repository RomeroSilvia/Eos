import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { loginWithGoogleIdToken } from '@/services/auth';
import type { UserProfile } from '@/types/user';

type GoogleSignInErrorReason =
  | 'unsupported-platform'
  | 'configuration'
  | 'play-services-unavailable'
  | 'in-progress'
  | 'missing-id-token'
  | 'backend'
  | 'unknown';

export class GoogleSignInError extends Error {
  reason: GoogleSignInErrorReason;

  constructor(reason: GoogleSignInErrorReason, message: string) {
    super(message);
    this.name = 'GoogleSignInError';
    this.reason = reason;
  }
}

let isConfigured = false;
let signInInFlight: Promise<UserProfile | null> | null = null;

export async function signInWithGoogle(): Promise<UserProfile | null> {
  if (signInInFlight) {
    return signInInFlight;
  }

  signInInFlight = signInWithGoogleInternal();

  try {
    return await signInInFlight;
  } finally {
    signInInFlight = null;
  }
}

export function resetGoogleSignInForTests(): void {
  isConfigured = false;
  signInInFlight = null;
}

export function getGoogleSignInErrorMessage(error: unknown): string {
  if (error instanceof GoogleSignInError) {
    return error.message;
  }

  return 'No pudimos iniciar sesion con Google. Intenta nuevamente.';
}

async function signInWithGoogleInternal(): Promise<UserProfile | null> {
  ensureSupportedPlatform();
  configureGoogleSignIn();

  if (Platform.OS === 'android') {
    let hasPlayServices = false;

    try {
      hasPlayServices = await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true
      });
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleSignInError(
          'play-services-unavailable',
          'Google Play Services no esta disponible o necesita actualizarse.'
        );
      }

      throw error;
    }

    if (!hasPlayServices) {
      throw new GoogleSignInError(
        'play-services-unavailable',
        'Google Play Services no esta disponible o necesita actualizarse.'
      );
    }
  }

  try {
    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      return null;
    }

    if (!isSuccessResponse(response)) {
      throw new GoogleSignInError('unknown', 'No pudimos iniciar sesion con Google.');
    }

    const idToken = response.data.idToken;

    if (!idToken) {
      throw new GoogleSignInError(
        'missing-id-token',
        'Google no devolvio un token de identidad valido.'
      );
    }

    try {
      return await loginWithGoogleIdToken(idToken);
    } catch {
      throw new GoogleSignInError(
        'backend',
        'No pudimos validar tu cuenta de Google. Intenta nuevamente.'
      );
    }
  } catch (error) {
    if (error instanceof GoogleSignInError) {
      throw error;
    }

    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return null;
      }

      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleSignInError(
          'play-services-unavailable',
          'Google Play Services no esta disponible o necesita actualizarse.'
        );
      }

      if ('IN_PROGRESS' in statusCodes && error.code === statusCodes.IN_PROGRESS) {
        throw new GoogleSignInError(
          'in-progress',
          'Ya hay un inicio de sesion con Google en curso.'
        );
      }
    }

    throw new GoogleSignInError(
      'unknown',
      'No pudimos iniciar sesion con Google. Intenta nuevamente.'
    );
  }
}

function ensureSupportedPlatform(): void {
  if (Platform.OS === 'web') {
    throw new GoogleSignInError(
      'unsupported-platform',
      'Google Sign-In web requiere un flujo diferente y no esta disponible en esta app.'
    );
  }
}

function configureGoogleSignIn(): void {
  if (isConfigured) {
    return;
  }

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  if (!webClientId) {
    throw new GoogleSignInError(
      'configuration',
      'Falta configurar EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.'
    );
  }

  if (Platform.OS === 'android' && !androidClientId) {
    throw new GoogleSignInError(
      'configuration',
      'Falta configurar EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.'
    );
  }

  if (Platform.OS === 'ios' && !iosClientId) {
    throw new GoogleSignInError(
      'configuration',
      'Falta configurar EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.'
    );
  }

  GoogleSignin.configure({
    scopes: ['profile', 'email'],
    webClientId,
    iosClientId: Platform.OS === 'ios' ? iosClientId : undefined
  });
  isConfigured = true;
}
