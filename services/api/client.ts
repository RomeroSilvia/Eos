import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function getExpoHostUri(): string | undefined {
  const expoConstants = Constants as typeof Constants & {
    manifest?: { debuggerHost?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
  };

  return (
    Constants.expoConfig?.hostUri ??
    expoConstants.manifest?.debuggerHost ??
    expoConstants.manifest2?.extra?.expoClient?.hostUri
  );
}

function getDefaultApiUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }

  const hostUri = getExpoHostUri();
  const host = hostUri?.split(':')[0];

  return host ? `http://${host}:3000/api` : 'http://localhost:3000/api';
}

function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL ?? getDefaultApiUrl();

  if (Platform.OS !== 'android') {
    return configuredUrl;
  }

  try {
    const url = new URL(configuredUrl);

    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return configuredUrl;
    }

    const expoHost = getExpoHostUri()?.split(':')[0];
    url.hostname = expoHost || '10.0.2.2';
    return url.toString().replace(/\/$/, '');
  } catch {
    return configuredUrl;
  }
}

export const apiConfig = {
  baseUrl: getApiBaseUrl()
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

export async function apiRequest<TResponse>({ path, headers, ...options }: ApiRequestOptions): Promise<TResponse> {
  const url = `${apiConfig.baseUrl}/${path.replace(/^\//, '')}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeader()),
      ...headers
    }
  });

  const text = await response.text();
  const body = parseResponseBody(text);

  if (!response.ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('FETCH URL:', url);
      console.error('FETCH STATUS:', response.status);
      console.error('FETCH BODY:', body);
    }

    throw new ApiRequestError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return body as TResponse;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('eos-access-token');
  }

  return SecureStore.getItemAsync('eos-access-token');
}

function parseResponseBody(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
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
