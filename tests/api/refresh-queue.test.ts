/**
 * Tests for the shared refresh-queue module.
 *
 * Covers (per plan AC-24 + Phase 0B):
 *   - queue flush on success (all waiters resolve with new token)
 *   - queue reject on failure (all waiters reject with the error)
 *   - single-refresh invariant under 5 concurrent 401s
 */

import axios from 'axios';
import {
  refreshState,
  failedQueue,
  isRefreshing,
  setRefreshing,
  enqueue,
  processQueue,
  refreshAuthTokens,
} from '../../src/api/refresh-queue';

jest.mock('axios');
jest.mock('../../src/api/tokens', () => ({
  getAccessToken: jest.fn(async () => 'old-access'),
  getRefreshToken: jest.fn(async () => 'refresh-xyz'),
  setTokens: jest.fn(async () => undefined),
  clearTokens: jest.fn(async () => undefined),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('refresh-queue', () => {
  beforeEach(() => {
    // Reset module state between tests.
    refreshState.current = false;
    failedQueue.splice(0, failedQueue.length);
    jest.clearAllMocks();
  });

  describe('flags', () => {
    it('isRefreshing reflects setRefreshing', () => {
      expect(isRefreshing()).toBe(false);
      setRefreshing(true);
      expect(isRefreshing()).toBe(true);
      setRefreshing(false);
      expect(isRefreshing()).toBe(false);
    });
  });

  describe('processQueue', () => {
    it('resolves every queued waiter on success and drains the queue', async () => {
      const waiters = Array.from({ length: 5 }, () => {
        return new Promise<string>((resolve, reject) => {
          enqueue({ resolve, reject });
        });
      });
      expect(failedQueue.length).toBe(5);

      processQueue(null, 'new-token');

      const results = await Promise.all(waiters);
      expect(results).toEqual(['new-token', 'new-token', 'new-token', 'new-token', 'new-token']);
      expect(failedQueue.length).toBe(0);
    });

    it('rejects every queued waiter on failure and drains the queue', async () => {
      const err = new Error('refresh failed');
      const waiters = Array.from({ length: 3 }, () => {
        return new Promise<string>((resolve, reject) => {
          enqueue({ resolve, reject });
        }).catch((e) => {
          throw e;
        });
      });

      processQueue(err, null);

      const results = await Promise.allSettled(waiters);
      expect(results.every((r) => r.status === 'rejected')).toBe(true);
      expect(failedQueue.length).toBe(0);
    });
  });

  describe('refreshAuthTokens', () => {
    it('POSTs to /auth/refresh and returns the new access_token', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { data: { access_token: 'AT-1', refresh_token: 'RT-1' } },
      });
      const token = await refreshAuthTokens('https://api.example/v1');
      expect(token).toBe('AT-1');
      expect(mockedAxios.post).toHaveBeenCalledWith('https://api.example/v1/auth/refresh', {
        refresh_token: 'refresh-xyz',
      });
    });

    it('tolerates flat response shape (no .data wrapper)', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'AT-2' },
      });
      const token = await refreshAuthTokens('https://api.example/v1');
      expect(token).toBe('AT-2');
    });
  });

  describe('single-refresh invariant', () => {
    /**
     * Simulate the interceptor pattern: 5 concurrent 401s arrive. Only the
     * first should call refreshAuthTokens; the other 4 must queue and then
     * resolve off the single refresh result.
     */
    it('under 5 concurrent 401s, refreshAuthTokens fires exactly once', async () => {
      let refreshCalls = 0;
      mockedAxios.post.mockImplementation(async () => {
        refreshCalls += 1;
        // Small delay to ensure concurrent 401s pile up in the queue.
        await new Promise((r) => setTimeout(r, 10));
        return { data: { data: { access_token: `AT-${refreshCalls}` } } };
      });

      const simulate401 = async (): Promise<string> => {
        if (isRefreshing()) {
          return new Promise<string>((resolve, reject) => {
            enqueue({ resolve, reject });
          });
        }
        setRefreshing(true);
        try {
          const token = await refreshAuthTokens('https://api.example/v1');
          processQueue(null, token);
          return token;
        } catch (err) {
          processQueue(err, null);
          throw err;
        } finally {
          setRefreshing(false);
        }
      };

      const results = await Promise.all(Array.from({ length: 5 }, () => simulate401()));

      expect(refreshCalls).toBe(1);
      expect(results).toHaveLength(5);
      expect(new Set(results).size).toBe(1);
      expect(results[0]).toBe('AT-1');
    });
  });
});
