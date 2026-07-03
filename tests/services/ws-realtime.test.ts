import { openRealtime, type RealtimeSocket } from '@/services/ws/realtime';

const tokenProvider = jest.fn<Promise<string | null>, []>();
const sockets: FakeSocket[] = [];

class FakeSocket implements RealtimeSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { readonly data: string }) => void) | null = null;
  onerror: ((event: { readonly message?: string }) => void) | null = null;
  onclose: ((event: { readonly code: number; readonly reason: string; readonly wasClean?: boolean }) => void) | null = null;
  readonly sent: string[] = [];
  closed: { readonly code?: number; readonly reason?: string } | null = null;

  constructor(
    readonly url: string,
    readonly token: string,
  ) {}

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closed = { code, reason };
  }

  emitMessage(data: string): void {
    this.onmessage?.({ data });
  }

  emitError(message: string): void {
    this.onerror?.({ message });
  }

  emitClose(code = 1006, reason = 'lost', wasClean = false): void {
    this.onclose?.({ code, reason, wasClean });
  }
}

function createSocket(url: string, token: string): RealtimeSocket {
  const socket = new FakeSocket(url, token);
  sockets.push(socket);
  return socket;
}

describe('openRealtime', () => {
  beforeEach(() => {
    jest.useRealTimers();
    sockets.length = 0;
    tokenProvider.mockReset();
  });

  it('rejects an empty session id before opening a socket', async () => {
    tokenProvider.mockResolvedValue('token-1');

    await expect(
      openRealtime(' ', { createSocket, tokenProvider }),
    ).rejects.toMatchObject({ code: 'REALTIME_SESSION_ID_REQUIRED' });

    expect(sockets).toHaveLength(0);
  });

  it('rejects a missing access token before opening a socket', async () => {
    tokenProvider.mockResolvedValue(null);

    await expect(
      openRealtime('session-1', { createSocket, tokenProvider }),
    ).rejects.toMatchObject({ code: 'REALTIME_AUTH_TOKEN_MISSING' });

    expect(sockets).toHaveLength(0);
  });

  it('opens the observer websocket from the API origin with bearer auth', async () => {
    tokenProvider.mockResolvedValue('token-1');

    const connection = await openRealtime('session 1', {
      baseUrl: 'https://api.example.test/v1',
      createSocket,
      tokenProvider,
    });

    expect(connection.url).toBe('wss://api.example.test/realtime/v1/observer/session%201');
    expect(sockets).toHaveLength(1);
    expect(sockets[0].url).toBe(connection.url);
    expect(sockets[0].token).toBe('token-1');
  });

  it('parses JSON frames, sends JSON payloads, and surfaces socket errors', async () => {
    tokenProvider.mockResolvedValue('token-1');
    const frames: unknown[] = [];
    const errors: Error[] = [];

    const connection = await openRealtime('session-1', {
      createSocket,
      onError: (error) => errors.push(error),
      onFrame: (frame) => frames.push(frame),
      reconnect: false,
      tokenProvider,
    });

    sockets[0].emitMessage('{"type":"observer_snapshot","current_state":"ACTIVE"}');
    connection.send({ type: 'PONG' });
    sockets[0].emitError('network down');
    sockets[0].emitMessage('{bad json');

    expect(frames).toEqual([{ type: 'observer_snapshot', current_state: 'ACTIVE' }]);
    expect(sockets[0].sent).toEqual(['{"type":"PONG"}']);
    expect(errors.map((error) => error.message)).toEqual([
      'network down',
      'Realtime frame was not valid JSON',
    ]);
  });

  it('surfaces consumer frame handler errors without relabeling them as invalid JSON', async () => {
    tokenProvider.mockResolvedValue('token-1');
    const errors: Error[] = [];
    const callbackError = new Error('state machine rejected frame');

    await openRealtime('session-1', {
      createSocket,
      onError: (error) => errors.push(error),
      onFrame: () => {
        throw callbackError;
      },
      reconnect: false,
      tokenProvider,
    });

    sockets[0].emitMessage('{"type":"observer_snapshot","current_state":"ACTIVE"}');

    expect(errors).toEqual([callbackError]);
  });

  it('uses a fresh bearer token when reconnecting after an abnormal close', async () => {
    jest.useFakeTimers();
    tokenProvider
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('token-2');

    await openRealtime('session-1', {
      createSocket,
      reconnect: { initialDelayMs: 5, maxAttempts: 3, maxDelayMs: 5 },
      tokenProvider,
    });

    sockets[0].emitClose(1006, 'lost', false);
    await actReconnectTimer(5);

    expect(sockets).toHaveLength(2);
    expect(sockets[0].token).toBe('token-1');
    expect(sockets[1].token).toBe('token-2');
    expect(tokenProvider).toHaveBeenCalledTimes(2);
  });

  it('does not reset the reconnect budget on short-lived open-close loops', async () => {
    jest.useFakeTimers();
    tokenProvider.mockResolvedValue('token-1');
    const errors: Error[] = [];

    await openRealtime('session-1', {
      createSocket,
      onError: (error) => errors.push(error),
      reconnect: { initialDelayMs: 5, maxAttempts: 2, maxDelayMs: 5 },
      tokenProvider,
    });

    sockets[0].emitClose(1006, 'lost', false);
    await actReconnectTimer(5);
    sockets[1].onopen?.();
    sockets[1].emitClose(1006, 'lost again', false);
    await actReconnectTimer(5);
    sockets[2].onopen?.();
    sockets[2].emitClose(1006, 'policy close', false);
    await actReconnectTimer(50);

    expect(sockets).toHaveLength(3);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ code: 'REALTIME_RECONNECT_EXHAUSTED' });
  });

  it('surfaces socket construction failures during reconnect', async () => {
    jest.useFakeTimers();
    tokenProvider.mockResolvedValue('token-1');
    const errors: Error[] = [];
    const createSocketThenFail = jest.fn<RealtimeSocket, [string, string]>((url, token) => {
      if (sockets.length > 0) {
        throw new Error('native socket unavailable');
      }
      return createSocket(url, token);
    });

    await openRealtime('session-1', {
      createSocket: createSocketThenFail,
      onError: (error) => errors.push(error),
      reconnect: { initialDelayMs: 5, maxAttempts: 2, maxDelayMs: 5 },
      tokenProvider,
    });

    sockets[0].emitClose(1006, 'lost', false);
    await actReconnectTimer(5);

    expect(createSocketThenFail).toHaveBeenCalledTimes(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'REALTIME_SOCKET_CREATE_FAILED',
      message: 'native socket unavailable',
    });
  });

  it('continues reconnecting after a transient reconnect socket construction failure', async () => {
    jest.useFakeTimers();
    tokenProvider.mockResolvedValue('token-1');
    const errors: Error[] = [];
    let createCalls = 0;
    const createSocketFailOnce = jest.fn<RealtimeSocket, [string, string]>((url, token) => {
      createCalls += 1;
      if (createCalls === 2) {
        throw new Error('native socket unavailable');
      }
      return createSocket(url, token);
    });

    await openRealtime('session-1', {
      createSocket: createSocketFailOnce,
      onError: (error) => errors.push(error),
      reconnect: { initialDelayMs: 5, maxAttempts: 3, maxDelayMs: 5 },
      tokenProvider,
    });

    sockets[0].emitClose(1006, 'lost', false);
    await actReconnectTimer(5);
    expect(errors.map((error) => error.message)).toEqual(['native socket unavailable']);
    await jest.runOnlyPendingTimersAsync();

    expect(createSocketFailOnce).toHaveBeenCalledTimes(3);
    expect(sockets).toHaveLength(2);
    expect(errors.map((error) => error.message)).toContain('native socket unavailable');
  });

  it('continues reconnecting when the close observer callback throws', async () => {
    jest.useFakeTimers();
    tokenProvider
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('token-2');
    const errors: Error[] = [];

    await openRealtime('session-1', {
      createSocket,
      onClose: () => {
        throw new Error('state machine close handler failed');
      },
      onError: (error) => errors.push(error),
      reconnect: { initialDelayMs: 5, maxAttempts: 2, maxDelayMs: 5 },
      tokenProvider,
    });

    expect(() => sockets[0].emitClose(1006, 'lost', false)).not.toThrow();
    await actReconnectTimer(5);

    expect(sockets).toHaveLength(2);
    expect(sockets[1].token).toBe('token-2');
    expect(errors.map((error) => error.message)).toContain('state machine close handler failed');
  });

  it('does not crash the socket error handler when the error observer callback throws', async () => {
    tokenProvider.mockResolvedValue('token-1');

    await openRealtime('session-1', {
      createSocket,
      onError: () => {
        throw new Error('state machine error handler failed');
      },
      reconnect: false,
      tokenProvider,
    });

    expect(() => sockets[0].emitError('network down')).not.toThrow();
  });

  it('rejects unsupported base URL schemes before opening a socket', async () => {
    tokenProvider.mockResolvedValue('token-1');

    await expect(
      openRealtime('session-1', {
        baseUrl: 'ftp://api.example.test/v1',
        createSocket,
        tokenProvider,
      }),
    ).rejects.toMatchObject({ code: 'REALTIME_BASE_URL_UNSUPPORTED' });

    expect(sockets).toHaveLength(0);
  });

  it('does not reconnect after manual close', async () => {
    jest.useFakeTimers();
    tokenProvider.mockResolvedValue('token-1');

    const connection = await openRealtime('session-1', {
      createSocket,
      reconnect: { initialDelayMs: 5, maxAttempts: 3, maxDelayMs: 5 },
      tokenProvider,
    });

    connection.close(1000, 'parent left screen');
    sockets[0].emitClose(1000, 'parent left screen', true);
    jest.advanceTimersByTime(50);

    expect(sockets).toHaveLength(1);
  });
});

async function actReconnectTimer(ms: number): Promise<void> {
  await jest.advanceTimersByTimeAsync(ms);
}
