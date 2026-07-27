import { Config } from '@/config';
import { getAccessToken } from '@/services/http/tokens';
import { captureError } from '@/services/observability/sentry';

export class RealtimeConnectionError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'RealtimeConnectionError';
  }
}

const DEFAULT_RECONNECT = { initialDelayMs: 500, maxAttempts: 5, maxDelayMs: 8000 };

export async function openRealtime(sessionId, options = {}) {
  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) throw new RealtimeConnectionError('REALTIME_SESSION_ID_REQUIRED', 'Realtime observer session id is required');
  const url = observerUrl(options.baseUrl ?? Config.API_BASE_URL, normalizedSessionId);
  return createReconnectingSocket(url, {
    createSocket: options.createSocket,
    onClose: options.onClose,
    onError: options.onError,
    onMessage: (event) => {
      let frame;
      try { frame = JSON.parse(event.data); } catch { throw new RealtimeConnectionError('REALTIME_FRAME_INVALID_JSON', 'Realtime frame was not valid JSON'); }
      options.onFrame?.(frame);
    },
    onOpen: options.onOpen,
    reconnect: options.reconnect,
    tokenProvider: options.tokenProvider,
  });
}

export async function createReconnectingSocket(url, options = {}) {
  const tokenProvider = options.tokenProvider ?? getAccessToken;
  const createSocket = options.createSocket ?? createDefaultSocket;
  const reconnect = normalizeReconnect(options.reconnect);
  let socket = await openSocket(url, tokenProvider, createSocket);
  let manualClose = false;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  const notifyError = (error) => { try { options.onError?.(error); } catch (callbackError) { captureError(callbackError); } };
  const invoke = (callback) => { try { callback?.(); } catch (error) { notifyError(toError(error)); } };
  const clearReconnectTimer = () => { if (reconnectTimer !== null) clearTimeout(reconnectTimer); reconnectTimer = null; };
  const exhausted = () => {
    notifyError(new RealtimeConnectionError('REALTIME_RECONNECT_EXHAUSTED', 'Realtime reconnect attempts exhausted'));
    invoke(options.onReconnectExhausted);
    if (options.continueAfterReconnectExhausted && reconnect !== false && !manualClose) {
      clearReconnectTimer();
      reconnectTimer = setTimeout(runReconnectAttempt, reconnect.maxDelayMs);
    }
  };
  const scheduleReconnect = () => {
    if (manualClose || reconnect === false) return;
    if (reconnectAttempts >= reconnect.maxAttempts) { exhausted(); return; }
    reconnectAttempts += 1;
    const delay = Math.min(reconnect.initialDelayMs * 2 ** (reconnectAttempts - 1), reconnect.maxDelayMs);
    clearReconnectTimer();
    reconnectTimer = setTimeout(runReconnectAttempt, delay);
  };
  const runReconnectAttempt = () => {
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
  const attachHandlers = (nextSocket) => {
    nextSocket.onopen = () => invoke(options.onOpen);
    nextSocket.onmessage = (event) => { reconnectAttempts = 0; try { options.onMessage?.(event); } catch (error) { notifyError(toError(error)); } };
    nextSocket.onerror = (event) => notifyError(new Error(event.message ?? 'Realtime websocket error'));
    nextSocket.onclose = (event) => {
      try { options.onClose?.(event); } catch (error) { notifyError(toError(error)); }
      if (options.shouldReconnect?.(event) !== false) scheduleReconnect();
    };
  };
  attachHandlers(socket);
  return {
    url,
    close(code, reason) { manualClose = true; clearReconnectTimer(); socket.close(code, reason); },
    send(payload) { socket.send(JSON.stringify(payload)); },
  };
}

async function openSocket(url, tokenProvider, createSocket) {
  const token = await tokenProvider();
  if (!token) throw new RealtimeConnectionError('REALTIME_AUTH_TOKEN_MISSING', 'Realtime observer requires an access token');
  return createSocket(url, token);
}
function createDefaultSocket(url, token) {
  if (typeof WebSocket === 'undefined') throw new RealtimeConnectionError('REALTIME_WEBSOCKET_UNAVAILABLE', 'Realtime websocket implementation is unavailable');
  const socket = Reflect.construct(WebSocket, [url, null, { headers: { Authorization: `Bearer ${token}` } }]);
  if (!isRealtimeSocket(socket)) throw new RealtimeConnectionError('REALTIME_WEBSOCKET_INVALID', 'Realtime websocket implementation is invalid');
  return socket;
}
function observerUrl(baseUrl, sessionId) {
  let parsed;
  try { parsed = new URL(baseUrl); } catch { throw new RealtimeConnectionError('REALTIME_BASE_URL_INVALID', 'Realtime observer base URL is invalid'); }
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) throw new RealtimeConnectionError('REALTIME_BASE_URL_UNSUPPORTED', 'Realtime observer base URL protocol is unsupported');
  if (parsed.protocol === 'http:') parsed.protocol = 'ws:';
  if (parsed.protocol === 'https:') parsed.protocol = 'wss:';
  parsed.pathname = `/realtime/v1/observer/${encodeURIComponent(sessionId)}`;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}
function normalizeReconnect(reconnect) {
  if (reconnect === false) return false;
  return { initialDelayMs: positiveInt(reconnect?.initialDelayMs, DEFAULT_RECONNECT.initialDelayMs), maxAttempts: positiveInt(reconnect?.maxAttempts, DEFAULT_RECONNECT.maxAttempts), maxDelayMs: positiveInt(reconnect?.maxDelayMs, DEFAULT_RECONNECT.maxDelayMs) };
}
function positiveInt(value, fallback) { return value === undefined || !Number.isInteger(value) || value <= 0 ? fallback : value; }
function isRealtimeSocket(value) { return typeof value === 'object' && value !== null && hasFunction(value, 'send') && hasFunction(value, 'close'); }
function hasFunction(value, key) { return key in value && typeof Reflect.get(value, key) === 'function'; }
function toError(error) { return error instanceof Error ? error : new Error(String(error)); }
