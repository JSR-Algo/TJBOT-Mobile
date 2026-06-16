import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import posthog from 'posthog-react-native';
import { Config } from '@/config';
import { isRealtimeEvent, type RealtimeEvent } from '@/contracts/realtime-events';
import { getAccessToken } from '@/services/http/tokens';

export type RealtimeHandlers = {
  onEvent?: (event: RealtimeEvent) => void;
  onRawMessage?: (raw: string) => void;
  onOpen?: () => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string, wasClean: boolean) => void;
};

export type RealtimeConnection = {
  close: () => void;
  sendJson: (payload: Record<string, unknown>) => void;
  readyState: number;
};

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_JITTER_MS = 500;
const RECONNECT_MAX_ATTEMPTS = 10;

function httpBaseToWsRoot(httpBase: string): string {
  const trimmed = httpBase.replace(/\/+$/, '');
  const withoutVersion = trimmed.replace(/\/v\d+$/, '');
  return withoutVersion.replace(/^http/, 'ws');
}

export function getRealtimeWsRoot(): string {
  const explicit = (process.env.EXPO_PUBLIC_WS_URL as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  return httpBaseToWsRoot(Config.API_BASE_URL);
}

function buildObserverUrl(sessionId: string, token: string): string {
  const root = getRealtimeWsRoot();
  const params = new URLSearchParams({ access_token: token });
  return `${root}/v1/observer/${encodeURIComponent(sessionId)}?${params.toString()}`;
}

function withJitter(delay: number): number {
  const jitter = Math.random() * RECONNECT_JITTER_MS;
  return Math.floor(delay + jitter);
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
  let isOnline = true;
  let hasReportedTerminal = false;

  const clearReconnect = (): void => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const reportNonCleanClose = (code: number, reason: string): void => {
    const context = { wsCloseCode: code, wsCloseReason: reason };
    const warning = new Error(`Realtime WebSocket closed non-clean: ${code}`);
    (warning as any).wsCloseCode = code;
    Sentry.captureException(warning, { extra: context });
    posthog.capture('realtime_ws_non_clean_close', context);
  };

  const scheduleReconnect = (): void => {
    if (closedByClient) return;
    if (!isOnline) return;
    if (reconnectAttempt >= RECONNECT_MAX_ATTEMPTS) {
      if (!hasReportedTerminal) {
        hasReportedTerminal = true;
        const terminalError = new Error('Realtime WebSocket reconnect attempts exhausted');
        (terminalError as any).terminal = true;
        handlers.onError?.(terminalError);
      }
      return;
    }
    const delay = withJitter(
      Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS),
    );
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
      hasReportedTerminal = false;
      handlers.onOpen?.();
    };

    ws.onmessage = handleMessage;

    ws.onerror = (event) => {
      const original = (event as any).error ?? (event as any).message ?? 'Realtime WebSocket error';
      const error = new Error(typeof original === 'string' ? original : 'Realtime WebSocket error');
      (error as any).cause = original instanceof Error ? original : undefined;
      (error as any).original = original;
      handlers.onError?.(error);
    };

    ws.onclose = (ev) => {
      handlers.onClose?.(ev.code, ev.reason || '', ev.wasClean ?? false);
      if (!ev.wasClean) {
        reportNonCleanClose(ev.code, ev.reason || '');
      }
      if (!closedByClient) scheduleReconnect();
    };
  };

  const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    const wasOffline = !isOnline;
    isOnline = state.isConnected ?? true;
    if (!isOnline) {
      // Pause reconnects while offline and drop the current socket so the next
      // online event can start fresh.
      clearReconnect();
      ws?.close();
      return;
    }
    if (wasOffline && !closedByClient) {
      clearReconnect();
      // Reconnect immediately when the device comes back online so the user
      // does not wait through a backed-off retry window.
      connect();
    }
  });

  connect();

  return {
    get readyState() {
      return ws?.readyState ?? WebSocket.CLOSED;
    },
    close() {
      closedByClient = true;
      clearReconnect();
      unsubscribeNetInfo();
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
