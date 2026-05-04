const defaultApiUrl = 'http://localhost:3000/api';

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl,
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
