import { ENV } from '@/__env__';
import { Config } from '@/config';
import { isRealtimeEvent, type RealtimeEvent } from '@/contracts/realtime-events';
import { getAccessToken } from '@/services/http/tokens';

export type RealtimeHandlers = {
  onEvent?: (event: RealtimeEvent) => void;
  onRawMessage?: (raw: string) => void;
  onOpen?: () => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
};

export type RealtimeConnection = {
  close: () => void;
  sendJson: (payload: Record<string, unknown>) => void;
  readyState: number;
};

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

function httpBaseToWsRoot(httpBase: string): string {
  const trimmed = httpBase.replace(/\/+$/, '');
  const withoutVersion = trimmed.replace(/\/v\d+$/, '');
  return withoutVersion.replace(/^http/, 'ws');
}

export function getRealtimeWsRoot(): string {
  const explicit = ENV.EXPO_PUBLIC_WS_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  return httpBaseToWsRoot(Config.API_BASE_URL);
}

function buildObserverUrl(sessionId: string, token: string): string {
  const root = getRealtimeWsRoot();
  const params = new URLSearchParams({ access_token: token });
  return `${root}/v1/observer/${encodeURIComponent(sessionId)}?${params.toString()}`;
}

/**
 * Opens an observer WebSocket for a lesson / robot session.
 * Contract: migrate-ui-ux `observer-attach.sequence.mmd` — backend route may
 * still be rolling out; client reconnects with exponential backoff.
 */
export async function openRealtime(
  sessionId: string,
  handlers: RealtimeHandlers = {},
): Promise<RealtimeConnection> {
  if (!sessionId.trim()) {
    throw new Error('sessionId is required');
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated — sign in before opening realtime observer');
  }

  let ws: WebSocket | null = null;
  let closedByClient = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const clearReconnect = (): void => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = (): void => {
    if (closedByClient) return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  };

  const handleMessage = (event: WebSocketMessageEvent): void => {
    const raw = typeof event.data === 'string' ? event.data : String(event.data);
    handlers.onRawMessage?.(raw);
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isRealtimeEvent(parsed)) {
        handlers.onEvent?.(parsed);
      }
    } catch {
      /* non-JSON or non-realtime payload — onRawMessage already fired */
    }
  };

  const connect = (): void => {
    clearReconnect();
    const url = buildObserverUrl(sessionId, token);
    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectAttempt = 0;
      handlers.onOpen?.();
    };

    ws.onmessage = handleMessage;

    ws.onerror = () => {
      handlers.onError?.(new Error('Realtime WebSocket error'));
    };

    ws.onclose = (ev) => {
      handlers.onClose?.(ev.code, ev.reason || '');
      if (!closedByClient) scheduleReconnect();
    };
  };

  connect();

  return {
    get readyState() {
      return ws?.readyState ?? WebSocket.CLOSED;
    },
    close() {
      closedByClient = true;
      clearReconnect();
      ws?.close();
      ws = null;
    },
    sendJson(payload: Record<string, unknown>) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error('Realtime socket is not open');
      }
      ws.send(JSON.stringify(payload));
    },
  };
}