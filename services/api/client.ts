import Constants from 'expo-constants';
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

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? getDefaultApiUrl(),
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS !== 'false'
};

type ApiRequestOptions = RequestInit & {
  path: string;
};

export async function apiRequest<TResponse>({ path, headers, ...options }: ApiRequestOptions): Promise<TResponse> {
  const url = `${apiConfig.baseUrl}/${path.replace(/^\//, '')}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });

  if (response.status === 404) {
    console.error('URL NO EXISTE:', url);
  }

  if (!response.ok) {
    const text = await response.text();
    console.error('RESPONSE ERROR:', text);
    throw new Error(`API request failed with status ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}
