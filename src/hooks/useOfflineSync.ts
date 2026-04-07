/**
 * useOfflineSync — offline-first mutation queue for TBOT mobile.
 *
 * Queues failed API calls in AsyncStorage when the device is offline.
 * Replays them with exponential backoff on reconnect.
 * Prevents session start while offline.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Lightweight shims so this module compiles even when the native packages
// haven't been installed yet.  The real packages are declared as peer deps
// and will be resolved at runtime on device.
// ---------------------------------------------------------------------------

// AsyncStorage shim
type AsyncStorageStatic = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

function getAsyncStorage(): AsyncStorageStatic {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    // In-memory fallback for tests / web
    const mem: Record<string, string> = {};
    return {
      getItem: async (key) => mem[key] ?? null,
      setItem: async (key, value) => { mem[key] = value; },
    };
  }
}

// NetInfo shim
type NetInfoSubscription = () => void;
type NetInfoChangeHandler = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void;

function getNetInfo(): { addEventListener: (handler: NetInfoChangeHandler) => NetInfoSubscription } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-community/netinfo').default;
  } catch {
    // No-op fallback — assume always connected
    return {
      addEventListener: (_handler: NetInfoChangeHandler) => () => { /* noop */ },
    };
  }
}

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

const QUEUE_STORAGE_KEY = '@tbot/offline_queue';
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

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

async function loadQueue(): Promise<QueuedRequest[]> {
  try {
    const AsyncStorage = getAsyncStorage();
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedRequest[];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedRequest[]): Promise<void> {
  try {
    const AsyncStorage = getAsyncStorage();
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

  // Listen to connectivity changes
  useEffect(() => {
    const NetInfo = getNetInfo();
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const connected = netState.isConnected === true && netState.isInternetReachable !== false;
      setState((s) => ({ ...s, isConnected: connected }));

      if (connected && queueRef.current.length > 0) {
        void replayQueue();
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const isSessionStart =
          url.includes('/sessions') &&
          (options.method?.toUpperCase() === 'POST' || !options.method);

        if (isSessionStart) {
          throw new OfflineError(
            'You are offline. A session cannot be started without an internet connection.',
          );
        }

        await enqueue(
          url,
          options.method ?? 'GET',
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
          await enqueue(
            url,
            options.method ?? 'GET',
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
