import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const defaultApiUrl = 'http://localhost:3000/api';

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl,
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS !== 'false'
};

type ApiRequestOptions = RequestInit & {
  path: string;
};

export class ApiRequestError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(formatErrorBody(body));
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }
}

export function getFriendlyApiErrorMessage(status?: number): string {
  if (status === 400) return 'Revisa los datos ingresados e intenta nuevamente.';
  if (status === 401) return 'Tu sesion expiro. Volve a iniciar sesion.';
  if (status === 403) return 'No tenes permisos para realizar esta accion.';
  if (status === 404) return 'No pudimos encontrar la informacion solicitada.';
  if (status === 409) return 'Ya existe un registro con esos datos.';
  if (status === 413) return 'La imagen es demasiado grande. Proba con una foto mas liviana.';
  if (status === 500) return 'Ocurrio un error del servidor. Intenta nuevamente mas tarde.';
  return 'No pudimos completar la accion. Intenta nuevamente.';
}

export function getFriendlyAuthErrorMessage(status?: number): string {
  if (status === 400) return 'Revisá los datos ingresados.';
  if (status === 401) return 'Tu sesión expiró. Iniciá sesión nuevamente.';
  if (status === 403) return 'No tenés permisos para realizar esta acción.';
  if (status === 404) return 'No se encontró la solicitud.';
  if (status === 429) return 'Demasiados intentos. Probá nuevamente en unos minutos.';
  return 'Ocurrió un error. Intentá nuevamente.';
}

export function getFriendlyErrorMessage(error: unknown, fallback = 'No pudimos completar la accion. Intenta nuevamente.'): string {
  if (error instanceof ApiRequestError) {
    return getFriendlyApiErrorMessage(error.status);
  }

  if (error instanceof Error && !hasTechnicalDetails(error.message)) {
    return error.message;
  }

  return fallback;
}

export class ApiClientError extends ApiRequestError {
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(status, details ?? message);
    this.name = 'ApiClientError';
    this.message = message;
    this.details = details;
  }
}

export async function apiRequest<TResponse>({ path, headers, ...options }: ApiRequestOptions): Promise<TResponse> {
  const url = `${apiConfig.baseUrl}/${path.replace(/^\//, '')}`;
  const accessToken = await getStoredAccessToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const requestHeaders = new Headers(headers ?? undefined);

  if (!isFormData) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers: requestHeaders
  });

  if (response.status === 404) {
    console.error('URL NO EXISTE:', url);
  }

  if (!response.ok) {
    const text = await response.text();
    let parsed: { message?: string; details?: unknown } | undefined;

    try {
      parsed = text ? (JSON.parse(text) as { message?: string; details?: unknown }) : undefined;
    } catch {
      parsed = undefined;
    }

    if (response.status !== 401 && response.status !== 403 && response.status !== 409) {
      console.error('RESPONSE ERROR:', text);
    }
    throw new ApiClientError(
      response.status,
      parsed?.message ?? `API request failed with status ${response.status}`,
      parsed?.details
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

async function getStoredAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('eos-access-token');
  }

  return SecureStore.getItemAsync('eos-access-token');
}

function hasTechnicalDetails(message: string): boolean {
  const normalizedMessage = message.toLowerCase();

  return [
    'stack',
    'sql',
    'row-level security',
    'rls',
    'supabase',
    'specialist_profiles',
    'specialist-docs',
    'bucket',
    'storage.objects',
    'trace',
    '{"',
    'error:',
    'exception'
  ].some((unsafeText) => normalizedMessage.includes(unsafeText));
}

function formatErrorBody(body: unknown): string {
  if (typeof body === 'string') {
    return body;
  }

  if (body === null || typeof body === 'undefined') {
    return 'Empty response body';
  }

  return JSON.stringify(body);
}
