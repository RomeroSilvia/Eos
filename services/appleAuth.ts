import * as AppleAuthentication from 'expo-apple-authentication';
import { loginWithAppleIdentityToken } from '@/services/auth';
import type { UserProfile } from '@/types/user';

type AppleSignInErrorReason =
  | 'unsupported-platform'
  | 'missing-identity-token'
  | 'backend'
  | 'unknown';

export class AppleSignInError extends Error {
  reason: AppleSignInErrorReason;

  constructor(reason: AppleSignInErrorReason, message: string) {
    super(message);
    this.name = 'AppleSignInError';
    this.reason = reason;
  }
}

let signInInFlight: Promise<UserProfile | null> | null = null;

export async function isAppleSignInAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<UserProfile | null> {
  if (signInInFlight) {
    return signInInFlight;
  }

  signInInFlight = signInWithAppleInternal();

  try {
    return await signInInFlight;
  } finally {
    signInInFlight = null;
  }
}

export function resetAppleSignInForTests(): void {
  signInInFlight = null;
}

export function getAppleSignInErrorMessage(error: unknown): string {
  if (error instanceof AppleSignInError) {
    return error.message;
  }

  return 'No pudimos iniciar sesion con Apple. Intenta nuevamente.';
}

async function signInWithAppleInternal(): Promise<UserProfile | null> {
  const isAvailable = await isAppleSignInAvailable().catch(() => false);

  if (!isAvailable) {
    throw new AppleSignInError(
      'unsupported-platform',
      'Apple Sign-In no esta disponible en esta plataforma.'
    );
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL
      ]
    });

    if (!credential.identityToken) {
      throw new AppleSignInError(
        'missing-identity-token',
        'Apple no devolvio un token de identidad valido.'
      );
    }

    try {
      return await loginWithAppleIdentityToken({
        identityToken: credential.identityToken,
        givenName: sanitizeOptionalText(credential.fullName?.givenName),
        familyName: sanitizeOptionalText(credential.fullName?.familyName),
        email: sanitizeOptionalEmail(credential.email)
      });
    } catch {
      throw new AppleSignInError(
        'backend',
        'No pudimos validar tu cuenta de Apple. Intenta nuevamente.'
      );
    }
  } catch (error) {
    if (error instanceof AppleSignInError) {
      throw error;
    }

    if (isAppleCancellationError(error)) {
      return null;
    }

    throw new AppleSignInError(
      'unknown',
      'No pudimos iniciar sesion con Apple. Intenta nuevamente.'
    );
  }
}

function isAppleCancellationError(error: unknown): boolean {
  return (
    Boolean(error)
    && typeof error === 'object'
    && (error as { code?: unknown }).code === 'ERR_REQUEST_CANCELED'
  );
}

function sanitizeOptionalText(value?: string | null): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue || undefined;
}

function sanitizeOptionalEmail(value?: string | null): string | undefined {
  const trimmedValue = value?.trim().toLowerCase();
  return trimmedValue || undefined;
}
