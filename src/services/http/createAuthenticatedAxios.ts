import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, invalidateAccessTokenCache } from './tokens';
import { normalizeError, type AppError } from '../../utils/errors';
import { newRequestId } from './idempotency';
import {
  isRefreshing,
  setRefreshing,
  enqueue,
  processQueue,
  refreshAuthTokens,
  clearAuthTokens,
} from './refresh-queue';

export interface CreateAuthenticatedAxiosOptions {
  timeout?: number;
  validateStatus?: (status: number) => boolean;
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 50;

function isFreshAuthEndpoint(url: string | undefined): boolean {
  return (
    typeof url === 'string' &&
    (url.includes('/parent/auth') || url.includes('/auth/login') || url.includes('/auth/register'))
  );
}

function withRetryMetadata(error: AppError, status: number | undefined): AppError {
  if (status === 429 || status === 503 || status === 504) {
    return { ...error, retryable: true };
  }
  return error;
}

function getRetryDelayMs(
  error: { response?: { headers?: Record<string, string | number | undefined> } },
  retryCount: number,
): number {
  const headers = error.response?.headers ?? {};
  const retryAfter = headers['retry-after'] ?? headers['Retry-After'];
  if (typeof retryAfter === 'number') {
    return retryAfter * 1000;
  }
  if (typeof retryAfter === 'string') {
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(seconds)) {
      return seconds * 1000;
    }
  }
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** retryCount, 1000);
}

export function createAuthenticatedAxios(
  baseURL: string,
  options: CreateAuthenticatedAxiosOptions = {},
): { client: AxiosInstance; setAuthInvalidatedHandler: (handler: (() => void) | null) => void } {
  const client = axios.create({
    baseURL,
    timeout: options.timeout ?? 30000,
    headers: { 'Content-Type': 'application/json' },
    validateStatus:
      options.validateStatus ??
      ((status) => (status >= 200 && status < 300) || status === 307),
  });

  let onAuthInvalidated: (() => void) | null = null;

  function setAuthInvalidatedHandler(handler: (() => void) | null): void {
    onAuthInvalidated = handler;
  }

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const method = config.method?.toUpperCase();
    if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      const headers = config.headers as Record<string, string | undefined>;
      headers['X-Request-Id'] = headers['X-Request-Id'] ?? headers['Idempotency-Key'] ?? newRequestId();
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as AxiosRequestConfig & {
        _retry?: boolean;
        _retryCount?: number;
      };
      const status = error.response?.status;

      if (status === 401 && !originalRequest._retry && !isFreshAuthEndpoint(originalRequest.url)) {
        if (isRefreshing()) {
          const { promise, resolve, reject } = Promise.withResolvers<string>();
          enqueue({ resolve, reject });
          const token = await promise;
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return client(originalRequest);
        }

        originalRequest._retry = true;
        setRefreshing(true);

        try {
          const access_token = await refreshAuthTokens(baseURL);
          processQueue(null, access_token);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          await clearAuthTokens();
          if (typeof invalidateAccessTokenCache === 'function') {
            invalidateAccessTokenCache();
          }
          if (onAuthInvalidated) {
            try {
              onAuthInvalidated();
            } catch {
              // swallow — handler is best-effort
            }
          }
          return Promise.reject(refreshError);
        } finally {
          setRefreshing(false);
        }
      }

      const isIdempotentGet = originalRequest.method?.toLowerCase() === 'get';
      const isRetryableStatus = status === 429 || status === 503 || status === 504;
      const retryCount = originalRequest._retryCount ?? 0;

      if (isIdempotentGet && isRetryableStatus && retryCount < MAX_RETRIES) {
        const delayMs = getRetryDelayMs(error, retryCount);
        const { promise: delayPromise, resolve: delayResolve } = Promise.withResolvers<void>();
        setTimeout(delayResolve, delayMs);
        await delayPromise;
        return client({ ...originalRequest, _retryCount: retryCount + 1 } as AxiosRequestConfig & { _retryCount?: number });
      }

      const normalized = withRetryMetadata(normalizeError(error), status);
      return Promise.reject(normalized);
    },
  );

  return { client, setAuthInvalidatedHandler };
}

export function createAuthenticatedClient(options: {
  baseURL: string;
  timeout?: number;
}): AxiosInstance {
  const { client } = createAuthenticatedAxios(options.baseURL, { timeout: options.timeout });
  return client;
}
