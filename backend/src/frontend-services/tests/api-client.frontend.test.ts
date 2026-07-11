type MockResponseInput = {
  status: number;
  body?: unknown;
};

let getAccessTokenMock: jest.Mock;
let refreshAccessTokenMock: jest.Mock;
let clearSessionMock: jest.Mock;
let fetchMock: jest.Mock;

function makeResponse({ status, body }: MockResponseInput) {
  const ok = status >= 200 && status < 300;
  const serializedBody = typeof body === 'undefined' ? '' : JSON.stringify(body);

  return {
    ok,
    status,
    text: jest.fn(async () => serializedBody),
    json: jest.fn(async () => body)
  };
}

async function loadApiClient() {
  jest.resetModules();

  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
  getAccessTokenMock = jest.fn(async () => 'access-1');
  refreshAccessTokenMock = jest.fn();
  clearSessionMock = jest.fn(async () => undefined);
  fetchMock = jest.fn();

  jest.doMock('@/services/session', () => ({
    getAccessToken: getAccessTokenMock,
    refreshAccessToken: refreshAccessTokenMock,
    clearSession: clearSessionMock
  }));

  global.fetch = fetchMock as unknown as typeof fetch;

  return import('@/services/api/client');
}

function getAuthorizationHeader(callIndex: number): string | null {
  const headers = fetchMock.mock.calls[callIndex][1].headers as Headers;
  return headers.get('Authorization');
}

function getContentTypeHeader(callIndex: number): string | null {
  const headers = fetchMock.mock.calls[callIndex][1].headers as Headers;
  return headers.get('Content-Type');
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('services/api/client auth retry', () => {
  it('ante 401 refresca y reintenta una vez con el access token nuevo', async () => {
    const { apiRequest } = await loadApiClient();
    getAccessTokenMock
      .mockResolvedValueOnce('access-1')
      .mockResolvedValueOnce('access-2');
    refreshAccessTokenMock.mockResolvedValue('access-2');
    fetchMock
      .mockResolvedValueOnce(makeResponse({ status: 401, body: { message: 'expired' } }))
      .mockResolvedValueOnce(makeResponse({ status: 200, body: { ok: true } }));

    await expect(apiRequest<{ ok: boolean }>({ path: '/products', method: 'GET' })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(getAuthorizationHeader(0)).toBe('Bearer access-1');
    expect(getAuthorizationHeader(1)).toBe('Bearer access-2');
  });

  it('ante 401 en /auth/me refresca y reintenta una vez', async () => {
    const { apiRequest } = await loadApiClient();
    getAccessTokenMock
      .mockResolvedValueOnce('access-1')
      .mockResolvedValueOnce('access-2');
    refreshAccessTokenMock.mockResolvedValue('access-2');
    fetchMock
      .mockResolvedValueOnce(makeResponse({ status: 401, body: { message: 'expired' } }))
      .mockResolvedValueOnce(makeResponse({
        status: 200,
        body: {
          user: { id: 'user-1', email: 'marta@example.com' },
          profile: { id: 'user-1', name: 'Marta', role: 'user', skinType: 'mixed' }
        }
      }));

    await expect(apiRequest({ path: '/auth/me', method: 'GET' })).resolves.toMatchObject({
      user: { id: 'user-1' }
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(getAuthorizationHeader(1)).toBe('Bearer access-2');
  });

  it('un segundo 401 limpia la sesion y no genera loops', async () => {
    const { apiRequest } = await loadApiClient();
    getAccessTokenMock
      .mockResolvedValueOnce('access-1')
      .mockResolvedValueOnce('access-2');
    refreshAccessTokenMock.mockResolvedValue('access-2');
    fetchMock
      .mockResolvedValueOnce(makeResponse({ status: 401, body: { message: 'expired' } }))
      .mockResolvedValueOnce(makeResponse({ status: 401, body: { message: 'still expired' } }));

    await expect(apiRequest({ path: '/products', method: 'GET' })).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(clearSessionMock).toHaveBeenCalledTimes(1);
  });

  it('un error distinto de 401 no dispara refresh', async () => {
    const { apiRequest } = await loadApiClient();
    fetchMock.mockResolvedValue(makeResponse({ status: 500, body: { message: 'server error' } }));

    await expect(apiRequest({ path: '/products', method: 'GET' })).rejects.toMatchObject({ status: 500 });

    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(clearSessionMock).not.toHaveBeenCalled();
  });

  it('un endpoint de login no refresca aunque responda 401', async () => {
    const { apiRequest } = await loadApiClient();
    fetchMock.mockResolvedValue(makeResponse({ status: 401, body: { message: 'bad credentials' } }));

    await expect(apiRequest({ path: '/auth/login?source=test', method: 'POST', body: JSON.stringify({}) }))
      .rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(clearSessionMock).not.toHaveBeenCalled();
  });

  it('FormData puede reintentarse y conserva headers personalizados', async () => {
    const { apiRequest } = await loadApiClient();
    getAccessTokenMock
      .mockResolvedValueOnce('access-1')
      .mockResolvedValueOnce('access-2');
    refreshAccessTokenMock.mockResolvedValue('access-2');
    fetchMock
      .mockResolvedValueOnce(makeResponse({ status: 401, body: { message: 'expired' } }))
      .mockResolvedValueOnce(makeResponse({ status: 200, body: { id: 'product-1' } }));
    const formData = new FormData();
    formData.append('name', 'Serum');

    await expect(apiRequest({
      path: '/products',
      method: 'POST',
      headers: { 'X-Trace-Id': 'trace-1' },
      body: formData
    })).resolves.toEqual({ id: 'product-1' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].body).toBe(formData);
    expect(getContentTypeHeader(1)).toBeNull();
    expect((fetchMock.mock.calls[1][1].headers as Headers).get('X-Trace-Id')).toBe('trace-1');
    expect(getAuthorizationHeader(1)).toBe('Bearer access-2');
  });

  it('ReadableStream no se reintenta automaticamente', async () => {
    const { apiRequest } = await loadApiClient();
    fetchMock.mockResolvedValue(makeResponse({ status: 401, body: { message: 'expired' } }));
    const stream = new ReadableStream();

    await expect(apiRequest({ path: '/products', method: 'POST', body: stream }))
      .rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(clearSessionMock).not.toHaveBeenCalled();
  });

  it('si el refresh falla limpia sesion sin reintentar la request', async () => {
    const { apiRequest } = await loadApiClient();
    refreshAccessTokenMock.mockResolvedValue(null);
    fetchMock.mockResolvedValue(makeResponse({ status: 401, body: { message: 'expired' } }));

    await expect(apiRequest({ path: '/products', method: 'GET' })).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(clearSessionMock).toHaveBeenCalledTimes(1);
  });
});
