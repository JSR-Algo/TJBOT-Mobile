/**
 * Xiaozhi / ESP32 device WebSocket client (reference: xiaozhi-esp32/docs/websocket.md).
 * Used when mobile proxies or debugs device live mode — not the Gemini Live parent voice path.
 */

export type XiaozhiHelloMessage = {
  type: 'hello';
  version: number;
  transport: 'websocket';
  features?: { mcp?: boolean; aec?: boolean };
  audio_params: {
    format: 'opus';
    sample_rate: number;
    channels: 1;
    frame_duration: number;
  };
};

export type XiaozhiServerHello = XiaozhiHelloMessage & {
  session_id?: string;
};

export type XiaozhiListenState = 'start' | 'stop' | 'detect';

export type XiaozhiJsonMessage =
  | XiaozhiHelloMessage
  | XiaozhiServerHello
  | { type: 'listen'; state: XiaozhiListenState; mode?: string }
  | { type: 'abort'; reason?: string }
  | { type: 'tts'; state: 'start' | 'stop'; text?: string }
  | { type: 'stt'; text: string }
  | { type: 'mcp'; [key: string]: unknown }
  | { type: string; [key: string]: unknown };

export type XiaozhiConnectParams = {
  url: string;
  deviceId: string;
  clientId: string;
  token?: string;
  protocolVersion?: number;
  onJson?: (msg: XiaozhiJsonMessage) => void;
  onBinary?: (data: ArrayBuffer) => void;
  onOpen?: () => void;
  onClose?: (code: number, reason: string, wasClean: boolean) => void;
  onError?: (error: Error) => void;
};

export type XiaozhiDeviceConnection = {
  sendHello: () => void;
  sendListenStart: () => void;
  sendListenStop: () => void;
  sendAbort: (reason?: string) => void;
  sendBinary: (data: ArrayBuffer | Uint8Array) => void;
  close: () => void;
  readyState: number;
};

function buildDeviceHello(version: number): XiaozhiHelloMessage {
  return {
    type: 'hello',
    version,
    transport: 'websocket',
    features: { mcp: true },
    audio_params: {
      format: 'opus',
      sample_rate: 16000,
      channels: 1,
      frame_duration: 60,
    },
  };
}

export function connectXiaozhiDevice(params: XiaozhiConnectParams): XiaozhiDeviceConnection {
  const version = params.protocolVersion ?? 1;
  const headersSupported = false;
  let url = params.url;
  if (!headersSupported && params.token) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}authorization=${encodeURIComponent(`Bearer ${params.token}`)}`;
  }

  const ws = new WebSocket(url);

  ws.onopen = () => {
    params.onOpen?.();
  };

  ws.onmessage = (event) => {
    if (typeof event.data === 'string') {
      try {
        params.onJson?.(JSON.parse(event.data) as XiaozhiJsonMessage);
      } catch {
        /* ignore */
      }
      return;
    }
    if (event.data instanceof ArrayBuffer) {
      params.onBinary?.(event.data);
    }
  };

  ws.onerror = (event) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const original = (event as any).error ?? (event as any).message ?? 'Xiaozhi device WebSocket error';
    const error = new Error(typeof original === 'string' ? original : 'Xiaozhi device WebSocket error');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any).cause = original instanceof Error ? original : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any).original = original;
    params.onError?.(error);
  };
  ws.onclose = (ev) => params.onClose?.(ev.code, ev.reason || '', ev.wasClean ?? false);

  const sendJson = (payload: XiaozhiJsonMessage): void => {
    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error('Xiaozhi device socket is not open');
    }
    ws.send(JSON.stringify(payload));
  };

  return {
    get readyState() {
      return ws.readyState;
    },
    sendHello() {
      sendJson(buildDeviceHello(version));
    },
    sendListenStart() {
      sendJson({ type: 'listen', state: 'start', mode: 'auto' });
    },
    sendListenStop() {
      sendJson({ type: 'listen', state: 'stop' });
    },
    sendAbort(reason) {
      sendJson({ type: 'abort', reason });
    },
    sendBinary(data) {
      if (ws.readyState !== WebSocket.OPEN) {
        throw new Error('Xiaozhi device socket is not open');
      }
      ws.send(data);
    },
    close() {
      ws.close();
    },
  };
}