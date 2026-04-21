import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken } from './tokens';
import { normalizeError } from '../utils/errors';
import { Config } from '../config';
import {
  isRefreshing,
  setRefreshing,
  enqueue,
  processQueue,
  refreshAuthTokens,
  clearAuthTokens,
} from './refresh-queue';

const BASE_URL = Config.API_BASE_URL;

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  // 30s timeout: Render free-tier cold starts can take 10-20s after idle.
  // 15s was too tight — users on first request after backend sleep hit
  // ECONNABORTED and saw "Network Error" even though the backend was alive.
  timeout: 30000,
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

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
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

    const normalized = normalizeError(error);
    return Promise.reject(normalized);
  },
);

export default client;
export { BASE_URL };
