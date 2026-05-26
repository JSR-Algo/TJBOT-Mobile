import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken } from './tokens';
import { normalizeError, type AppError } from '../../utils/errors';
import { Config } from '../../config';
import {
  isRefreshing,
  setRefreshing,
  enqueue,
  processQueue,
  refreshAuthTokens,
  clearAuthTokens,
} from './refresh-queue';

const BASE_URL = Config.API_BASE_URL;

if (__DEV__) {
  // One-line dev banner so the developer can confirm in Metro logs which URL
  // resolved without needing to repro the bug. Stripped from production
  // bundles by Metro's __DEV__ dead-code elimination.
  // eslint-disable-next-line no-console
  console.info('[api] baseURL =', BASE_URL);
}

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  // 30s timeout: Render free-tier cold starts can take 10-20s after idle.
  // 15s was too tight — users on first request after backend sleep hit
  // ECONNABORTED and saw "Network Error" even though the backend was alive.
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  validateStatus: (status) => status >= 200 && status < 300 || status === 307,
});

// Global hook that AuthContext can register to force a logout when token
// refresh fails. Without this, `clearTokens()` wipes SecureStore but the
// in-memory `isAuthenticated` flag stays true and the root stack keeps the
// user stranded on the Main stack. See the Round 4 stale-token fix.
let onAuthInvalidated: (() => void) | null = null;

export function setAuthInvalidatedHandler(handler: (() => void) | null): void {
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
    headers['X-Request-Id'] = headers['X-Request-Id'] ?? headers['Idempotency-Key'] ?? `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return config;
});

function isFreshAuthEndpoint(url: string | undefined): boolean {
  return typeof url === 'string' && (url.includes('/parent/auth') || url.includes('/auth/login') || url.includes('/auth/register'));
}

function withRetryMetadata(error: AppError, status: number | undefined): AppError {
  if (status === 429 || status === 503 || status === 504) {
    return { ...error, retryable: true };
  }
  return error;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && !isFreshAuthEndpoint(originalRequest.url)) {
      if (isRefreshing()) {
        return new Promise((resolve, reject) => {
          enqueue({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      setRefreshing(true);

      try {
        const access_token = await refreshAuthTokens(BASE_URL);
        processQueue(null, access_token);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearAuthTokens();
        // Kick the UI back to the Auth stack so the user isn't stranded on
        // an authenticated screen with invalid tokens.
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

    const normalized = withRetryMetadata(normalizeError(error), error.response?.status);
    return Promise.reject(normalized);
  },
);

export default client;
export { BASE_URL };
