import type { AxiosRequestConfig } from 'axios';

type HeaderBag = Record<string, string>;

type CapturedRequest = AxiosRequestConfig & {
  headers: HeaderBag;
};

type ResponseFulfilled = (response: unknown) => unknown;
type ResponseRejected = (error: unknown) => unknown;
type RequestFulfilled = (config: CapturedRequest) => CapturedRequest | Promise<CapturedRequest>;

type FakeAxiosInstance = {
  (config: AxiosRequestConfig): Promise<unknown>;
  get: (url: string, config?: AxiosRequestConfig) => Promise<unknown>;
  interceptors: {
    request: { use: jest.Mock<void, [RequestFulfilled]> };
    response: { use: jest.Mock<void, [ResponseFulfilled, ResponseRejected]> };
  };
  defaults: { baseURL: string; timeout: number };
};

type AxiosMock = {
  create: jest.Mock<FakeAxiosInstance, [AxiosRequestConfig]>;
  post: jest.Mock<Promise<unknown>, [string, unknown]>;
};

type TokensMock = {
  getAccessToken: jest.Mock<Promise<string | null>, []>;
  getRefreshToken: jest.Mock<Promise<string | null>, []>;
  setTokens: jest.Mock<Promise<void>, [string, string]>;
  clearTokens: jest.Mock<Promise<void>, []>;
};

const makeDeferred = <T>() => {
  let resolveValue: (value: T) => void = () => undefined;
  let rejectValue: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolveValue = resolve;
    rejectValue = reject;
  });
  return { promise, resolve: resolveValue, reject: rejectValue };
};

const flushMicrotasks = async (): Promise<void> => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};

async function loadClientHarness(): Promise<{
  axiosMock: AxiosMock;
  tokensMock: TokensMock;
  protectedAttempts: CapturedRequest[];
  clientModule: typeof import('../../src/services/http/client');
}> {
  jest.resetModules();
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;

  const requestHandlers: RequestFulfilled[] = [];
  const responseRejectedHandlers: ResponseRejected[] = [];
  const protectedAttempts: CapturedRequest[] = [];
  let accessToken = 'old-access';
  let refreshToken = 'refresh-token';

  const tokensMock: TokensMock = {
    getAccessToken: jest.fn(async () => accessToken),
    getRefreshToken: jest.fn(async () => refreshToken),
    setTokens: jest.fn(async (nextAccessToken: string, nextRefreshToken: string) => {
      accessToken = nextAccessToken;
      refreshToken = nextRefreshToken;
    }),
    clearTokens: jest.fn(async () => undefined),
  };

  const runRequestHandlers = async (config: AxiosRequestConfig): Promise<CapturedRequest> => {
    let next: CapturedRequest = {
      ...config,
      headers: { ...(config.headers as HeaderBag | undefined) },
    };
    for (const handler of requestHandlers) {
      next = await handler(next);
    }
    return next;
  };

  const runResponseRejectedHandlers = (error: unknown): unknown => {
    const [handler] = responseRejectedHandlers;
    if (!handler) throw error;
    return handler(error);
  };

  const fakeClient = (async (config: AxiosRequestConfig): Promise<unknown> => {
    const request = await runRequestHandlers(config);
    protectedAttempts.push(request);
    if (request.url === '/ok') {
      return { status: 200, data: { ok: true }, config: request };
    }
    if (request.url === '/retryable-429') {
      return runResponseRejectedHandlers({
        config: request,
        response: {
          status: 429,
          headers: { 'Retry-After': '7' },
          data: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
        },
      });
    }
    if (request.headers.Authorization === 'Bearer refreshed-access') {
      return { status: 200, data: { ok: true }, config: request };
    }
    return runResponseRejectedHandlers({ config: request, response: { status: 401, data: {} } });
  }) as FakeAxiosInstance;

  fakeClient.get = (url: string, config: AxiosRequestConfig = {}) => fakeClient({ ...config, method: 'get', url });
  fakeClient.interceptors = {
    request: {
      use: jest.fn((handler: RequestFulfilled) => {
        requestHandlers.push(handler);
      }),
    },
    response: {
      use: jest.fn((_fulfilled: ResponseFulfilled, rejected: ResponseRejected) => {
        responseRejectedHandlers.push(rejected);
      }),
    },
  };
  fakeClient.defaults = { baseURL: '', timeout: 0 };

  const axiosMock: AxiosMock = {
    create: jest.fn((config: AxiosRequestConfig) => {
      fakeClient.defaults = {
        baseURL: typeof config.baseURL === 'string' ? config.baseURL : '',
        timeout: typeof config.timeout === 'number' ? config.timeout : 0,
      };
      return fakeClient;
    }),
    post: jest.fn(),
  };

  jest.doMock('axios', () => ({
    __esModule: true,
    default: axiosMock,
    ...axiosMock,
  }));
  jest.doMock('../../src/config', () => ({
    Config: { API_BASE_URL: 'https://api.test/v1' },
  }));
  jest.doMock('../../src/services/http/tokens', () => tokensMock);

  const clientModule = require('../../src/services/http/client') as typeof import('../../src/services/http/client');
  return { axiosMock, tokensMock, protectedAttempts, clientModule };
}

describe('http client auth refresh behavior', () => {
  it('replays concurrent 401s through one token refresh', async () => {
    const refresh = makeDeferred<unknown>();
    const { axiosMock, tokensMock, clientModule } = await loadClientHarness();
    axiosMock.post.mockReturnValue(refresh.promise);

    const requests = Array.from({ length: 5 }, () => clientModule.default.get('/protected'));
    await flushMicrotasks();
    expect(axiosMock.post).toHaveBeenCalledTimes(1);

    refresh.resolve({ data: { data: { access_token: 'refreshed-access', refresh_token: 'next-refresh' } } });
    const results = await Promise.all(requests);

    expect(results).toHaveLength(5);
    expect(axiosMock.post).toHaveBeenCalledTimes(1);
    expect(tokensMock.setTokens).toHaveBeenCalledWith('refreshed-access', 'next-refresh');
  });

  it('clears tokens and calls auth invalidation when refresh fails', async () => {
    const { axiosMock, tokensMock, clientModule } = await loadClientHarness();
    const authInvalidated = jest.fn();
    const refreshFailure = new Error('refresh rejected');
    axiosMock.post.mockRejectedValueOnce(refreshFailure);
    clientModule.setAuthInvalidatedHandler(authInvalidated);

    await expect(clientModule.default.get('/protected')).rejects.toBe(refreshFailure);

    expect(tokensMock.clearTokens).toHaveBeenCalledTimes(1);
    expect(authInvalidated).toHaveBeenCalledTimes(1);
  });

  it('does not refresh domain-auth 401s from fresh-auth endpoints', async () => {
    const { axiosMock, clientModule } = await loadClientHarness();

    await expect(clientModule.default({ method: 'post', url: '/v1/parent/auth', data: { pin: '0000' } })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    });

    expect(axiosMock.post).not.toHaveBeenCalled();
  });

  it('uses deterministic base URL and 30s timeout from Config', async () => {
    const { axiosMock, clientModule } = await loadClientHarness();

    expect(clientModule.BASE_URL).toBe('https://api.test/v1');
    expect(axiosMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://api.test/v1',
        timeout: 30000,
      }),
    );
  });

  it('adds mobile request ids to mutations and preserves caller idempotency keys', async () => {
    const { protectedAttempts, clientModule } = await loadClientHarness();

    await clientModule.default({ method: 'post', url: '/ok', data: { name: 'Child' } });
    await clientModule.default({
      method: 'delete',
      url: '/ok',
      headers: { 'Idempotency-Key': 'stable-idempotency-key' },
    });

    expect(protectedAttempts[0]?.headers.Authorization).toBe('Bearer old-access');
    expect(protectedAttempts[0]?.headers['X-Request-Id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(protectedAttempts[1]?.headers['X-Request-Id']).toBe('stable-idempotency-key');
  });

  it('treats invoice 307 responses as successful mobile contract responses', async () => {
    const { axiosMock } = await loadClientHarness();
    const createConfig = axiosMock.create.mock.calls[0]?.[0];
    const validateStatus = createConfig?.validateStatus;

    expect(validateStatus?.(200)).toBe(true);
    expect(validateStatus?.(307)).toBe(true);
    expect(validateStatus?.(308)).toBe(false);
    expect(validateStatus?.(400)).toBe(false);
  });

  it('marks documented retryable statuses with retry metadata and Retry-After seconds', async () => {
    const { clientModule } = await loadClientHarness();

    // Use POST so the interceptor returns the normalized error immediately
    // instead of entering the idempotent-GET retry loop.
    await expect(
      clientModule.default({ method: 'post', url: '/retryable-429', data: {} }),
    ).rejects.toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      retryable: true,
      retryAfterSeconds: 7,
      status: 429,
    });
  });
});
