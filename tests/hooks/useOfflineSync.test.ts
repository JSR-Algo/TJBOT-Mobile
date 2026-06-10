import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { OfflineError, useOfflineSync } from '@/hooks/useOfflineSync';

const queueStorageKey = '@TJBot/offline_queue';

describe('useOfflineSync', () => {
  let netInfoListener: ((state: NetInfoState) => void) | null;
  let unsubscribe: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    netInfoListener = null;
    unsubscribe = jest.fn();
    jest.spyOn(NetInfo, 'addEventListener').mockImplementation((listener) => {
      netInfoListener = listener;
      return unsubscribe;
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.MockedFunction<typeof fetch>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads persisted queue length and unsubscribes from connectivity listener', async () => {
    await AsyncStorage.setItem(queueStorageKey, JSON.stringify([
      {
        id: 'queued-1',
        url: 'https://api.test/v1/controls',
        method: 'POST',
        body: '{"enabled":true}',
        enqueuedAt: 1779120000000,
        attempts: 0,
      },
    ]));

    const { result, unmount } = renderHook(() => useOfflineSync());

    await waitFor(() => expect(result.current.queueLength).toBe(1));
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('queues replay-safe requests while offline and reports an offline error state', async () => {
    const { result } = renderHook(() => useOfflineSync());
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(queueStorageKey));

    act(() => {
      netInfoListener?.({
        type: 'none',
        isConnected: false,
        isInternetReachable: false,
        details: null,
      } as NetInfoState);
    });

    await act(async () => {
      await expect(
        result.current.safeFetch('https://api.test/v1/controls', {
          method: 'PATCH',
          headers: { 'X-Request-Id': 'controls-replay-1' },
          body: JSON.stringify({ quiet_hours: true }),
        }),
      ).rejects.toMatchObject({
        name: 'OfflineError',
        isOfflineError: true,
        message: 'You are offline. Your request has been saved and will be sent when reconnected.',
      } satisfies Partial<OfflineError>);
    });

    await waitFor(() => expect(result.current.queueLength).toBe(1));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('blocks unsafe offline mutations without adding replayable queue entries', async () => {
    const { result } = renderHook(() => useOfflineSync());
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(queueStorageKey));

    act(() => {
      netInfoListener?.({
        type: 'none',
        isConnected: false,
        isInternetReachable: false,
        details: null,
      } as NetInfoState);
    });

    await expect(
      result.current.safeFetch('https://api.test/v1/sessions', { method: 'POST' }),
    ).rejects.toMatchObject({
      name: 'OfflineError',
      message: 'You are offline. This request cannot be safely replayed.',
    } satisfies Partial<OfflineError>);

    expect(result.current.queueLength).toBe(0);
  });

  it('blocks high-risk account and billing mutations even with replay headers', async () => {
    const { result } = renderHook(() => useOfflineSync());
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(queueStorageKey));

    act(() => {
      netInfoListener?.({
        type: 'none',
        isConnected: false,
        isInternetReachable: false,
        details: null,
      } as NetInfoState);
    });

    await expect(
      result.current.safeFetch('https://api.test/v1/billing/checkout-session', {
        method: 'POST',
        headers: { 'X-Request-Id': 'checkout-1' },
        body: JSON.stringify({ sku_id: 'device' }),
      }),
    ).rejects.toMatchObject({
      name: 'OfflineError',
      message: 'You are offline. This request cannot be safely replayed.',
    } satisfies Partial<OfflineError>);

    await expect(
      result.current.safeFetch('https://api.test/v1/account/delete', {
        method: 'POST',
        headers: { 'X-Request-Id': 'delete-1' },
        body: JSON.stringify({ confirm_phrase: 'DELETE' }),
      }),
    ).rejects.toMatchObject({
      name: 'OfflineError',
      message: 'You are offline. This request cannot be safely replayed.',
    } satisfies Partial<OfflineError>);

    expect(result.current.queueLength).toBe(0);
  });

  it('rejects direct enqueue calls for unsafe mutations', async () => {
    const { result } = renderHook(() => useOfflineSync());
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(queueStorageKey));

    await expect(
      result.current.enqueue('https://api.test/v1/billing/subscription/cancel', 'POST', {}, {
        'X-Request-Id': 'sub-cancel-1',
      }),
    ).rejects.toMatchObject({
      name: 'OfflineError',
      message: 'This request cannot be safely replayed.',
    } satisfies Partial<OfflineError>);

    expect(result.current.queueLength).toBe(0);
  });

  it('replays queued requests on reconnect and clears successful entries', async () => {
    const { result } = renderHook(() => useOfflineSync());
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(queueStorageKey));

    await act(async () => {
      await result.current.enqueue('https://api.test/v1/controls', 'POST', { enabled: true }, {
        Authorization: 'Bearer token',
        'X-Request-Id': 'controls-replay-2',
      });
    });
    await waitFor(() => expect(result.current.queueLength).toBe(1));

    act(() => {
      netInfoListener?.({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: {},
      } as NetInfoState);
    });

    await waitFor(() => expect(result.current.queueLength).toBe(0));
    expect(global.fetch).toHaveBeenCalledWith('https://api.test/v1/controls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'X-Request-Id': 'controls-replay-2',
      },
      body: JSON.stringify({ enabled: true }),
    });
  });
});
