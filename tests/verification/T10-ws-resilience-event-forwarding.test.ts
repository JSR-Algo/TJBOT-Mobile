import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import posthog from 'posthog-react-native';
import { openRealtime } from '@/services/ws/realtime';
import { connectXiaozhiDevice } from '@/services/ws/xiaozhi-device';

type PostHogMock = { capture?: jest.Mock };
const posthogMock = posthog as unknown as PostHogMock;

type NetInfoState = { isConnected: boolean; isInternetReachable: boolean };
type NetInfoHandler = (state: NetInfoState) => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;

  url: string;
  readyState = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string | ArrayBuffer | Uint8Array }) => void) | null = null;
  onerror: ((event: { message?: string; error?: Error }) => void) | null = null;
  onclose: ((event: { code: number; reason: string; wasClean: boolean }) => void) | null = null;
  sent: (string | ArrayBuffer | Uint8Array)[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string | ArrayBuffer | Uint8Array): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.readyState = MockWebSocket.CLOSED;
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }

  simulateError(event: { message?: string; error?: Error }): void {
    this.onerror?.(event);
  }

  simulateClose(event: { code: number; reason: string; wasClean: boolean }): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(event);
  }
}

// WebSocket constants used by the production code
MockWebSocket.prototype.CONNECTING = 0;
MockWebSocket.prototype.OPEN = 1;
MockWebSocket.prototype.CLOSING = 2;
MockWebSocket.prototype.CLOSED = 3;
Object.assign(MockWebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

let netInfoListener: NetInfoHandler | null = null;
const addEventListenerSpy = jest.fn((handler: NetInfoHandler) => {
  netInfoListener = handler;
  return jest.fn(() => {
    netInfoListener = null;
  });
});

jest.mock('@/services/http/tokens', () => ({
  getAccessToken: jest.fn(() => Promise.resolve('test-access-token')),
}));

jest.useFakeTimers();

beforeEach(() => {
  MockWebSocket.instances = [];
  netInfoListener = null;
  addEventListenerSpy.mockClear();
  (NetInfo.addEventListener as jest.Mock).mockImplementation(addEventListenerSpy);
  (Sentry.captureException as jest.Mock)?.mockClear?.();
  (Sentry.captureMessage as jest.Mock)?.mockClear?.();
  posthogMock.capture?.mockClear?.();
  (globalThis as { WebSocket?: unknown }).WebSocket = MockWebSocket as unknown as typeof WebSocket;
});

afterEach(() => {
  jest.clearAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

describe('T10: WebSocket resilience and event forwarding', () => {
  describe('realtime.ts', () => {
    it('forwards original error data to onError instead of a generic string', async () => {
      const onError = jest.fn();
      const originalError = new Error('native ws failure');

      const conn = await openRealtime('sess-123', { onError });
      const ws = MockWebSocket.instances[0];
      ws?.simulateError({ message: 'native ws failure', error: originalError });

      expect(onError).toHaveBeenCalledTimes(1);
      const received = onError.mock.calls[0][0];
      expect(received).toBeTruthy();
      const message = typeof received === 'string' ? received : received.message || String(received);
      expect(message).toMatch(/native ws failure|Realtime WebSocket error/i);
      // After the fix, the original information must be preserved somewhere on the error.
      const hasOriginal =
        typeof received === 'object' &&
        (received.cause === originalError ||
          received.original === originalError ||
          received.code !== undefined ||
          /native ws failure/i.test(received.message || ''));
      expect(hasOriginal).toBe(true);

      conn.close();
    });

    it('forwards code, reason, and wasClean to onClose', async () => {
      const onClose = jest.fn();

      const conn = await openRealtime('sess-123', { onClose });
      const ws = MockWebSocket.instances[0];
      ws?.simulateClose({ code: 1006, reason: 'abnormal', wasClean: false });

      expect(onClose).toHaveBeenCalledTimes(1);
      const args = onClose.mock.calls[0];
      expect(args[0]).toBe(1006);
      expect(args[1]).toBe('abnormal');
      expect(args[2]).toBe(false);

      conn.close();
    });

    it('includes jitter in reconnect delay and caps attempts before terminal error', async () => {
      const onError = jest.fn();
      const onClose = jest.fn();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const conn = await openRealtime('sess-123', { onError, onClose });
      const delays: number[] = [];

      for (let i = 0; i < 20; i += 1) {
        const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
        ws?.simulateClose({ code: 1006, reason: 'retry', wasClean: false });

        const scheduled = setTimeoutSpy.mock.calls.filter(
          (call) => typeof call[1] === 'number',
        );
        const lastCall = scheduled[scheduled.length - 1];
        if (lastCall) {
          delays.push(lastCall[1] as number);
        }

        // Do not advance timers to the next reconnect if we have hit the cap;
        // the test loop will keep closing the latest socket and observe no new timers.
        if (delays.length >= 2 && new Set(delays).size > 1) {
          // Jitter confirmed; now run out the remaining attempts.
        }
        jest.runOnlyPendingTimers();
      }

      // Jitter: not all delays are identical to deterministic exponential backoff.
      expect(new Set(delays).size).toBeGreaterThan(1);

      // Max attempts: after a reasonable cap the client should surface a terminal error
      // and stop creating new sockets for the same failure.
      const uniqueSockets = MockWebSocket.instances.length;
      expect(uniqueSockets).toBeLessThan(25);

      // A terminal error should have been reported.
      const terminalCalls = onError.mock.calls.filter((call) => {
        const err = call[0];
        return (
          typeof err === 'object' &&
          err !== null &&
          (/terminal|exhausted|max attempt/i.test(err.message || '') || err.terminal === true)
        );
      });
      expect(terminalCalls.length).toBeGreaterThan(0);

      conn.close();
      setTimeoutSpy.mockRestore();
    });

    it('pauses reconnect while offline and resumes when online', async () => {
      const onOpen = jest.fn();
      const onError = jest.fn();

      const conn = await openRealtime('sess-123', { onOpen, onError });
      const ws = MockWebSocket.instances[0];
      ws?.simulateClose({ code: 1006, reason: 'offline', wasClean: false });

      // Move forward so any pending reconnect would fire.
      jest.advanceTimersByTime(60_000);

      // Simulate going offline.
      expect(netInfoListener).toBeTruthy();
      netInfoListener?.({ isConnected: false, isInternetReachable: false });

      const socketsBeforeOffline = MockWebSocket.instances.length;
      jest.advanceTimersByTime(120_000);
      expect(MockWebSocket.instances.length).toBe(socketsBeforeOffline);

      // Come back online.
      netInfoListener?.({ isConnected: true, isInternetReachable: true });
      jest.advanceTimersByTime(100);
      expect(MockWebSocket.instances.length).toBeGreaterThan(socketsBeforeOffline);

      conn.close();
    });

    it('reports raw close codes to telemetry on non-clean close', async () => {
      const conn = await openRealtime('sess-123', {});
      const ws = MockWebSocket.instances[0];
      ws?.simulateClose({ code: 1011, reason: 'server error', wasClean: false });

      // Give the async telemetry a tick.
      await Promise.resolve();

      const sentryCalls = [
        ...((Sentry.captureException as jest.Mock)?.mock?.calls ?? []),
        ...((Sentry.captureMessage as jest.Mock)?.mock?.calls ?? []),
      ];
      const posthogCalls = posthogMock.capture?.mock?.calls ?? [];

      const allContexts = [
        ...sentryCalls.map((call) => call[1]?.contexts || call[1]?.extra || {}),
        ...posthogCalls.map((call) => call[1] || {}),
      ];

      const hasCode = allContexts.some(
        (ctx) =>
          ctx?.wsCloseCode === 1011 ||
          ctx?.code === 1011 ||
          ctx?.ws?.code === 1011 ||
          /1011/i.test(JSON.stringify(ctx)),
      );
      expect(hasCode).toBe(true);

      conn.close();
    });
  });

  describe('xiaozhi-device.ts', () => {
    it('forwards original error data to onError instead of a generic string', () => {
      const onError = jest.fn();
      const originalError = new Error('device ws failure');

      const conn = connectXiaozhiDevice({
        url: 'wss://device.example/ws',
        deviceId: 'd-1',
        clientId: 'c-1',
        onError,
      });

      const ws = MockWebSocket.instances[0];
      ws?.simulateError({ message: 'device ws failure', error: originalError });

      expect(onError).toHaveBeenCalledTimes(1);
      const received = onError.mock.calls[0][0];
      const hasOriginal =
        typeof received === 'object' &&
        received !== null &&
        (received.cause === originalError ||
          received.original === originalError ||
          received.code !== undefined ||
          /device ws failure/i.test(received.message || ''));
      expect(hasOriginal).toBe(true);

      conn.close();
    });

    it('forwards code, reason, and wasClean to onClose', () => {
      const onClose = jest.fn();

      const conn = connectXiaozhiDevice({
        url: 'wss://device.example/ws',
        deviceId: 'd-1',
        clientId: 'c-1',
        onClose,
      });

      const ws = MockWebSocket.instances[0];
      ws?.simulateClose({ code: 1001, reason: 'going away', wasClean: true });

      expect(onClose).toHaveBeenCalledTimes(1);
      const args = onClose.mock.calls[0];
      expect(args[0]).toBe(1001);
      expect(args[1]).toBe('going away');
      expect(args[2]).toBe(true);

      conn.close();
    });
  });
});
