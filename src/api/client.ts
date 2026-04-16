import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokens';
import { normalizeError } from '../utils/errors';
import { Config } from '../config';

const BASE_URL = Config.API_BASE_URL;

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Global hook that AuthContext can register to force a logout when token
// refresh fails. Without this, `clearTokens()` wipes SecureStore but the
// in-memory `isAuthenticated` flag stays true and `RootNavigator` keeps the
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
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: string) => void; reject: (reason: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token ?? '');
    }
  });
  failedQueue = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const { access_token, refresh_token: newRefreshToken } = response.data.data ?? response.data;
        await setTokens(access_token, newRefreshToken ?? refreshToken);
        processQueue(null, access_token);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearTokens();
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
        isRefreshing = false;
      }
    }

    const normalized = normalizeError(error);
    return Promise.reject(normalized);
  },
);

export default client;
export { BASE_URL };
