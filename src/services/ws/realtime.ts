import { Config } from '@/config';
import { getAccessToken } from '@/services/http/tokens';
import { captureError } from '@/services/observability/sentry';

export interface RealtimeSocketCloseEvent {
  readonly code: number;
  readonly reason: string;
  readonly wasClean?: boolean;
}

export interface RealtimeSocketErrorEvent {
  readonly message?: string;
}

export interface RealtimeSocketMessageEvent {
  readonly data: string;
}

export interface RealtimeSocket {
  onopen: (() => void) | null;
  onmessage: ((event: RealtimeSocketMessageEvent) => void) | null;
  onerror: ((event: RealtimeSocketErrorEvent) => void) | null;
  onclose: ((event: RealtimeSocketCloseEvent) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type RealtimeSocketFactory = (url: string, token: string) => RealtimeSocket;
export type RealtimeTokenProvider = () => Promise<string | null>;

export interface RealtimeReconnectOptions {
  readonly initialDelayMs?: number;
  readonly maxAttempts?: number;
  readonly maxDelayMs?: number;
}

export interface OpenRealtimeOptions {
  readonly baseUrl?: string;
  readonly createSocket?: RealtimeSocketFactory;
  readonly onClose?: (event: RealtimeSocketCloseEvent) => void;
  readonly onError?: (error: Error) => void;
  readonly onFrame?: (frame: unknown) => void;
  readonly onOpen?: () => void;
  readonly reconnect?: RealtimeReconnectOptions | false;
  readonly tokenProvider?: RealtimeTokenProvider;
}

export interface RealtimeConnection {
  readonly url: string;
  close(code?: number, reason?: string): void;
  send(payload: unknown): void;
}

export interface CreateReconnectingSocketOptions {
  readonly continueAfterReconnectExhausted?: boolean;
  readonly createSocket?: RealtimeSocketFactory;
  readonly onClose?: (event: RealtimeSocketCloseEvent) => void;
  readonly onError?: (error: Error) => void;
  readonly onMessage?: (event: RealtimeSocketMessageEvent) => void;
  readonly onOpen?: () => void;
  readonly onReconnect?: () => void;
  readonly onReconnectExhausted?: () => void;
  readonly reconnect?: RealtimeReconnectOptions | false;
  readonly shouldReconnect?: (event: RealtimeSocketCloseEvent) => boolean;
  readonly tokenProvider?: RealtimeTokenProvider;
}

export class RealtimeConnectionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RealtimeConnectionError';
  }
}

const DEFAULT_RECONNECT: Required<RealtimeReconnectOptions> = {
  initialDelayMs: 500,
  maxAttempts: 5,
  maxDelayMs: 8_000,
};

export async function openRealtime(
  sessionId: string,
  options: OpenRealtimeOptions = {},
): Promise<RealtimeConnection> {
  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    throw new RealtimeConnectionError(
      'REALTIME_SESSION_ID_REQUIRED',
      'Realtime observer session id is required',
    );
  }

  const url = observerUrl(options.baseUrl ?? Config.API_BASE_URL, normalizedSessionId);
  return createReconnectingSocket(url, {
    createSocket: options.createSocket,
    onClose: options.onClose,
    onError: options.onError,
    onMessage: (event) => {
      let frame: unknown;
      try {
        frame = JSON.parse(event.data) as unknown;
      } catch {
        throw new RealtimeConnectionError(
          'REALTIME_FRAME_INVALID_JSON',
          'Realtime frame was not valid JSON',
        );
      }
      options.onFrame?.(frame);
    },
    onOpen: options.onOpen,
    reconnect: options.reconnect,
    tokenProvider: options.tokenProvider,
  });
}

export async function createReconnectingSocket(
  url: string,
  options: CreateReconnectingSocketOptions = {},
): Promise<RealtimeConnection> {
  const tokenProvider = options.tokenProvider ?? getAccessToken;
  const createSocket = options.createSocket ?? createDefaultSocket;
  const reconnect = normalizeReconnect(options.reconnect);
  let socket = await openSocket(url, tokenProvider, createSocket);
  let manualClose = false;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const notifyError = (error: Error): void => {
    try { options.onError?.(error); } catch (callbackError) { captureError(callbackError); }
  };
  const invoke = (callback: (() => void) | undefined): void => {
    try { callback?.(); } catch (error) { notifyError(toError(error)); }
  };
  const clearReconnectTimer = (): void => {
    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };
  const exhausted = (): void => {
    notifyError(new RealtimeConnectionError('REALTIME_RECONNECT_EXHAUSTED', 'Realtime reconnect attempts exhausted'));
    invoke(options.onReconnectExhausted);
    if (options.continueAfterReconnectExhausted && reconnect !== false && !manualClose) {
      clearReconnectTimer();
      reconnectTimer = setTimeout(runReconnectAttempt, reconnect.maxDelayMs);
    }
  };
  const scheduleReconnect = (): void => {
    if (manualClose || reconnect === false) return;
    if (reconnectAttempts >= reconnect.maxAttempts) { exhausted(); return; }
    reconnectAttempts += 1;
    const delay = Math.min(reconnect.initialDelayMs * 2 ** (reconnectAttempts - 1), reconnect.maxDelayMs);
    clearReconnectTimer();
    reconnectTimer = setTimeout(runReconnectAttempt, delay);
  };
  const runReconnectAttempt = (): void => {
    reconnectTimer = null;
    void openSocket(url, tokenProvider, createSocket).then((nextSocket) => {
      socket = nextSocket;
      attachHandlers(socket);
      invoke(options.onReconnect);
    }).catch((error) => {
      notifyError(new RealtimeConnectionError('REALTIME_SOCKET_CREATE_FAILED', toError(error).message));
      scheduleReconnect();
    });
  };
  const attachHandlers = (nextSocket: RealtimeSocket): void => {
    nextSocket.onopen = () => invoke(options.onOpen);
    nextSocket.onmessage = (event) => {
      reconnectAttempts = 0;
      try { options.onMessage?.(event); } catch (error) { notifyError(toError(error)); }
    };
    nextSocket.onerror = (event) => notifyError(new Error(event.message ?? 'Realtime websocket error'));
    nextSocket.onclose = (event) => {
      try { options.onClose?.(event); } catch (error) { notifyError(toError(error)); }
      if (options.shouldReconnect?.(event) !== false) scheduleReconnect();
    };
  };
  attachHandlers(socket);
  return {
    url,
    close(code?: number, reason?: string): void { manualClose = true; clearReconnectTimer(); socket.close(code, reason); },
    send(payload: unknown): void { socket.send(JSON.stringify(payload)); },
  };
}

async function openSocket(
  url: string,
  tokenProvider: RealtimeTokenProvider,
  createSocket: RealtimeSocketFactory,
): Promise<RealtimeSocket> {
  const token = await tokenProvider();
  if (!token) {
    throw new RealtimeConnectionError(
      'REALTIME_AUTH_TOKEN_MISSING',
      'Realtime observer requires an access token',
    );
  }
  return createSocket(url, token);
}

function createDefaultSocket(url: string, token: string): RealtimeSocket {
  if (typeof WebSocket === 'undefined') {
    throw new RealtimeConnectionError(
      'REALTIME_WEBSOCKET_UNAVAILABLE',
      'Realtime websocket implementation is unavailable',
    );
  }
  const socket: unknown = Reflect.construct(WebSocket, [url, null, {
    headers: { Authorization: `Bearer ${token}` },
  }]);
  if (!isRealtimeSocket(socket)) {
    throw new RealtimeConnectionError(
      'REALTIME_WEBSOCKET_INVALID',
      'Realtime websocket implementation is invalid',
    );
  }
  return socket;
}

function observerUrl(baseUrl: string, sessionId: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new RealtimeConnectionError(
      'REALTIME_BASE_URL_INVALID',
      'Realtime observer base URL is invalid',
    );
  }
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
    throw new RealtimeConnectionError(
      'REALTIME_BASE_URL_UNSUPPORTED',
      'Realtime observer base URL protocol is unsupported',
    );
  }
  if (parsed.protocol === 'http:') parsed.protocol = 'ws:';
  if (parsed.protocol === 'https:') parsed.protocol = 'wss:';
  parsed.pathname = `/realtime/v1/observer/${encodeURIComponent(sessionId)}`;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function normalizeReconnect(
  reconnect: RealtimeReconnectOptions | false | undefined,
): Required<RealtimeReconnectOptions> | false {
  if (reconnect === false) return false;
  return {
    initialDelayMs: positiveInt(reconnect?.initialDelayMs, DEFAULT_RECONNECT.initialDelayMs),
    maxAttempts: positiveInt(reconnect?.maxAttempts, DEFAULT_RECONNECT.maxAttempts),
    maxDelayMs: positiveInt(reconnect?.maxDelayMs, DEFAULT_RECONNECT.maxDelayMs),
  };
}

function positiveInt(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function isRealtimeSocket(value: unknown): value is RealtimeSocket {
  if (typeof value !== 'object' || value === null) return false;
  return hasFunction(value, 'send') && hasFunction(value, 'close');
}

function hasFunction(value: object, key: string): boolean {
  return key in value && typeof Reflect.get(value, key) === 'function';
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
