import axios from 'axios';
import { getRefreshToken, setTokens, clearTokens } from './tokens';
import { Config } from '../config';

/**
 * Shared refresh-queue state for all axios clients (main + AI).
 *
 * Why ref-object pattern for `isRefreshing`:
 *   Some bundlers (Metro in production mode) rewrite `export let` into
 *   frozen bindings that cannot be reassigned from another module. A mutable
 *   ref-object (`{ current: boolean }`) exposes the same observable state
 *   without relying on live-binding semantics.
 */
export const refreshState: { current: boolean } = { current: false };

export type QueueEntry = {
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
};

export const failedQueue: QueueEntry[] = [];

export function isRefreshing(): boolean {
  return refreshState.current;
}

export function setRefreshing(v: boolean): void {
  refreshState.current = v;
}

export function enqueue(entry: QueueEntry): void {
  failedQueue.push(entry);
}

export function processQueue(error: unknown, token: string | null = null): void {
  const snapshot = failedQueue.splice(0, failedQueue.length);
  snapshot.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token ?? '');
    }
  });
}

/**
 * Perform the actual token refresh against the backend.
 * Returns the new access token. On failure the caller is responsible for
 * calling `clearTokens()` + notifying the auth invalidation handler.
 */
export async function refreshAuthTokens(baseUrl: string = Config.API_BASE_URL): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const response = await axios.post(`${baseUrl}/auth/refresh`, {
    refresh_token: refreshToken,
  });
  const { access_token, refresh_token: newRefreshToken } = response.data.data ?? response.data;
  await setTokens(access_token, newRefreshToken ?? refreshToken);
  return access_token;
}

export async function clearAuthTokens(): Promise<void> {
  await clearTokens();
}
