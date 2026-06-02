/**
 * useOfflineSync — offline-first mutation queue for TJBot mobile.
 *
 * Queues failed API calls in AsyncStorage when the device is offline.
 * Replays them with exponential backoff on reconnect.
 * Prevents session start while offline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  enqueuedAt: number;
  attempts: number;
}

export interface OfflineSyncState {
  isConnected: boolean;
  queueLength: number;
  isSyncing: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUEUE_STORAGE_KEY = '@TJBot/offline_queue';
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const UNSAFE_REPLAY_MESSAGE = 'This request cannot be safely replayed.';
const OFFLINE_UNSAFE_REPLAY_MESSAGE = `You are offline. ${UNSAFE_REPLAY_MESSAGE}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function backoffDelay(attempts: number): number {
  const delay = BASE_BACKOFF_MS * Math.pow(2, attempts);
  return Math.min(delay, MAX_BACKOFF_MS);
}

function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function isHighRiskReplayPath(path: string): boolean {
  return (
    path.includes('/sessions') ||
    path.includes('/billing/') ||
    path.includes('/account/delete') ||
    path.includes('/account/deletion')
  );
}

function hasReplayHeader(headers?: HeadersInit | Record<string, string>): boolean {
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has('X-Request-Id');
  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === 'x-request-id');
  }
  return Object.keys(headers).some((key) => key.toLowerCase() === 'x-request-id');
}

function canReplayRequest(
  url: string,
  method: string,
  headers?: HeadersInit | Record<string, string>,
): boolean {
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD') return true;
  if (isHighRiskReplayPath(pathFromUrl(url))) return false;
  return hasReplayHeader(headers);
}

async function loadQueue(): Promise<QueuedRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedRequest[];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedRequest[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage failure — best effort
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    isConnected: true,
    queueLength: 0,
    isSyncing: false,
  });

  const queueRef = useRef<QueuedRequest[]>([]);
  const isSyncingRef = useRef(false);

  // Load persisted queue on mount
  useEffect(() => {
    loadQueue().then((q) => {
      queueRef.current = q;
      setState((s) => ({ ...s, queueLength: q.length }));
    });
  }, []);

  /**
   * Enqueue a failed request for later replay.
   */
  const enqueue = useCallback(
    async (
      url: string,
      method: string,
      body?: unknown,
      headers?: Record<string, string>,
    ): Promise<void> => {
      if (!canReplayRequest(url, method, headers)) {
        throw new OfflineError(UNSAFE_REPLAY_MESSAGE);
      }

      const item: QueuedRequest = {
        id: generateId(),
        url,
        method: method.toUpperCase(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        headers,
        enqueuedAt: Date.now(),
        attempts: 0,
      };

      queueRef.current = [...queueRef.current, item];
      await saveQueue(queueRef.current);
      setState((s) => ({ ...s, queueLength: queueRef.current.length }));
    },
    [],
  );

  /**
   * Replay all queued requests. Safe to call manually.
   */
  const replayQueue = useCallback(async (): Promise<void> => {
    if (isSyncingRef.current || queueRef.current.length === 0) return;

    isSyncingRef.current = true;
    setState((s) => ({ ...s, isSyncing: true }));

    const remaining: QueuedRequest[] = [];

    for (const req of queueRef.current) {
      try {
        const resp = await fetch(req.url, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            ...req.headers,
          },
          body: req.body,
        });

        if (!resp.ok) {
          const updated = { ...req, attempts: req.attempts + 1 };
          if (updated.attempts < MAX_ATTEMPTS) {
            remaining.push(updated);
          }
          continue;
        }
      } catch {
        const updated = { ...req, attempts: req.attempts + 1 };
        if (updated.attempts < MAX_ATTEMPTS) {
          const delay = backoffDelay(updated.attempts);
          await new Promise<void>((resolve) => setTimeout(resolve, Math.min(delay, 500)));
          remaining.push(updated);
        }
      }
    }

    queueRef.current = remaining;
    await saveQueue(remaining);

    isSyncingRef.current = false;
    setState((s) => ({
      ...s,
      isSyncing: false,
      queueLength: remaining.length,
    }));
  }, []);

  // Listen to connectivity changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const connected = netState.isConnected === true && netState.isInternetReachable !== false;
      setState((s) => ({ ...s, isConnected: connected }));

      if (connected && queueRef.current.length > 0) {
        void replayQueue();
      }
    });

    return () => unsubscribe();
  }, [replayQueue]);

  /**
   * Clear the entire queue (e.g. on logout).
   */
  const clearQueue = useCallback(async (): Promise<void> => {
    queueRef.current = [];
    await saveQueue([]);
    setState((s) => ({ ...s, queueLength: 0 }));
  }, []);

  /**
   * Offline-safe fetch wrapper.
   *
   * - Online: performs fetch normally.
   * - Offline: enqueues non-session requests; throws OfflineError for session starts.
   */
  const safeFetch = useCallback(
    async (
      url: string,
      options: RequestInit = {},
    ): Promise<Response> => {
      const { isConnected } = state;

      if (!isConnected) {
        const method = options.method ?? 'GET';

        if (!canReplayRequest(url, method, options.headers)) {
          throw new OfflineError(OFFLINE_UNSAFE_REPLAY_MESSAGE);
        }

        await enqueue(
          url,
          method,
          options.body ? JSON.parse(options.body as string) : undefined,
          options.headers as Record<string, string>,
        );

        throw new OfflineError(
          'You are offline. Your request has been saved and will be sent when reconnected.',
        );
      }

      try {
        return await fetch(url, options);
      } catch (err) {
        if (err instanceof TypeError && err.message.toLowerCase().includes('network')) {
          const method = options.method ?? 'GET';
          if (!canReplayRequest(url, method, options.headers)) {
            throw new OfflineError(UNSAFE_REPLAY_MESSAGE);
          }
          await enqueue(
            url,
            method,
            options.body ? JSON.parse(options.body as string) : undefined,
            options.headers as Record<string, string>,
          );
          throw new OfflineError('Network request failed. Your request has been queued.');
        }
        throw err;
      }
    },
    [state, enqueue],
  );

  return {
    isConnected: state.isConnected,
    queueLength: state.queueLength,
    isSyncing: state.isSyncing,
    enqueue,
    replayQueue,
    clearQueue,
    safeFetch,
  };
}

// ---------------------------------------------------------------------------
// OfflineError
// ---------------------------------------------------------------------------

export class OfflineError extends Error {
  readonly isOfflineError = true;

  constructor(message: string) {
    super(message);
    this.name = 'OfflineError';
  }
}
