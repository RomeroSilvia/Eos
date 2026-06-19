import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const defaultApiUrl = 'http://localhost:3000/api';

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl,
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS !== 'false'
};

type ApiRequestOptions = RequestInit & {
  path: string;
};

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

    if (response.status !== 401 && response.status !== 403) {
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
