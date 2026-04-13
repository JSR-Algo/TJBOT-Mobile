/**
 * RealtimeClient — WebSocket audio streaming client for TBOT.
 *
 * Connects to the backend WebSocket gateway, streams PCM audio chunks,
 * and receives transcript/TTS events.
 *
 * Feature-flagged via USE_REALTIME_WS environment variable.
 */

// ─── Wire contract event types ───────────────────────────────────────────────

export interface TranscriptPartialEvent {
  type: 'TRANSCRIPT_PARTIAL';
  text: string;
  confidence: number;
}

export interface TranscriptFinalEvent {
  type: 'TRANSCRIPT_FINAL';
  text: string;
  confidence: number;
}

export interface NoSpeechEvent {
  type: 'NO_SPEECH';
}

export interface TtsChunkEvent {
  type: 'TTS_CHUNK';
  audio: string; // base64-encoded PCM chunk
}

export interface TurnCompleteEvent {
  type: 'TURN_COMPLETE';
  sessionId: string;
}

export interface ErrorEvent {
  type: 'ERROR';
  code: string;
  message: string;
}

export type RealtimeServerEvent =
  | TranscriptPartialEvent
  | TranscriptFinalEvent
  | NoSpeechEvent
  | TtsChunkEvent
  | TurnCompleteEvent
  | ErrorEvent;

// ─── Client options ───────────────────────────────────────────────────────────

export interface RealtimeClientOptions {
  /** WebSocket gateway URL, e.g. ws://localhost:3000/realtime */
  url: string;
  /** Auth token injected as ?token= query param */
  authToken?: string;
  /** Max reconnect attempts before giving up (default: 5) */
  maxReconnectAttempts?: number;
  /** Base delay ms for exponential backoff (default: 500) */
  reconnectBaseDelayMs?: number;
}

// ─── Event handler types ──────────────────────────────────────────────────────

export interface RealtimeClientHandlers {
  onTranscriptPartial?: (event: TranscriptPartialEvent) => void;
  onTranscriptFinal?: (event: TranscriptFinalEvent) => void;
  onNoSpeech?: (event: NoSpeechEvent) => void;
  onTtsChunk?: (event: TtsChunkEvent) => void;
  onTurnComplete?: (event: TurnCompleteEvent) => void;
  onError?: (event: ErrorEvent | Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

// ─── RealtimeClient class ─────────────────────────────────────────────────────

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private options: Required<RealtimeClientOptions>;
  private handlers: RealtimeClientHandlers = {};

  /** Buffered audio chunks accumulated during reconnection */
  private reconnectBuffer: string[] = [];
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalDisconnect = false;
  private isConnecting = false;

  constructor(options: RealtimeClientOptions) {
    this.options = {
      maxReconnectAttempts: 5,
      reconnectBaseDelayMs: 500,
      authToken: '',
      ...options,
    };
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  setHandlers(handlers: RealtimeClientHandlers): void {
    this.handlers = handlers;
  }

  /**
   * Connect to the WebSocket gateway.
   * Injects auth token as ?token= query param.
   */
  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }
    this.isIntentionalDisconnect = false;
    this._openSocket();
  }

  /**
   * Send a base64-encoded PCM audio chunk.
   * If the socket is not open (e.g. reconnecting), buffers the chunk for resend.
   */
  sendAudioStart(sessionId: string): void {
    const msg = JSON.stringify({ type: 'AUDIO_START', sessionId });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.reconnectBuffer.push(msg);
    }
  }

  sendAudioChunk(base64: string): void {
    const msg = JSON.stringify({ type: 'AUDIO_CHUNK', audio: base64 });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      // Buffer for resend after reconnection
      this.reconnectBuffer.push(msg);
    }
  }

  /**
   * Signal end of audio stream so the server can finalize STT.
   */
  sendAudioEnd(): void {
    const msg = JSON.stringify({ type: 'AUDIO_END' });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.reconnectBuffer.push(msg);
    }
  }

  /**
   * Tap-to-interrupt — emit a canonical `INTERRUPT` event so the backend
   * orchestrator aborts the in-flight STT/LLM/TTS pipeline (RB-01..06) and
   * the session/turn FSM transitions into INTERRUPTED → LISTENING.
   *
   * Mirrors the contract from `tbot-infra/contracts/realtime-events.{d.ts,js}`
   * — a Wave 1 deliverable. Field names match `InterruptEvent` exactly:
   * `{ type, session_id, timestamp_ms, payload: { reason, source } }`.
   *
   * `reason` defaults to `USER_TAP` because RM-05 wires the tap-anywhere
   * gesture during SPEAKING. `source` is hard-coded to `mobile` because this
   * client only ever runs on the parent app.
   *
   * If the socket is mid-reconnect the message is buffered alongside the
   * AUDIO_* family — interrupts MUST never be silently dropped.
   */
  sendInterrupt(opts: {
    sessionId?: string;
    reason?: 'USER_TAP' | 'USER_VOICE' | 'SERVER_ABORT' | 'SYSTEM_ERROR';
    turnId?: string;
  } = {}): void {
    const envelope = {
      type: 'INTERRUPT' as const,
      session_id: opts.sessionId ?? '',
      ...(opts.turnId ? { turn_id: opts.turnId } : {}),
      timestamp_ms: Date.now(),
      payload: {
        reason: opts.reason ?? ('USER_TAP' as const),
        source: 'mobile' as const,
      },
    };
    const msg = JSON.stringify(envelope);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.reconnectBuffer.push(msg);
    }
  }

  /**
   * Gracefully close the WebSocket and stop reconnection attempts.
   */
  disconnect(): void {
    this.isIntentionalDisconnect = true;
    this._clearReconnectTimer();
    this.reconnectBuffer = [];
    this.reconnectAttempt = 0;
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect callback
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnecting = false;
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private _buildUrl(): string {
    const base = this.options.url;
    const token = this.options.authToken;
    if (!token) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}token=${encodeURIComponent(token)}`;
  }

  private _openSocket(): void {
    this.isConnecting = true;
    const url = this._buildUrl();
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.isConnecting = false;
      this.reconnectAttempt = 0;
      this._flushReconnectBuffer();
      this.handlers.onConnected?.();
    };

    ws.onmessage = (event) => {
      this._handleMessage(event.data as string);
    };

    ws.onerror = () => {
      // onerror is always followed by onclose; log silently
    };

    ws.onclose = (event) => {
      this.isConnecting = false;
      this.ws = null;
      this.handlers.onDisconnected?.();

      if (!this.isIntentionalDisconnect && event.code !== 1000) {
        this._scheduleReconnect();
      }
    };
  }

  private _handleMessage(data: string): void {
    let event: RealtimeServerEvent;
    try {
      event = JSON.parse(data) as RealtimeServerEvent;
    } catch {
      return;
    }

    switch (event.type) {
      case 'TRANSCRIPT_PARTIAL':
        this.handlers.onTranscriptPartial?.(event);
        break;
      case 'TRANSCRIPT_FINAL':
        this.handlers.onTranscriptFinal?.(event);
        break;
      case 'NO_SPEECH':
        this.handlers.onNoSpeech?.(event);
        break;
      case 'TTS_CHUNK':
        this.handlers.onTtsChunk?.(event);
        break;
      case 'TURN_COMPLETE':
        this.handlers.onTurnComplete?.(event);
        break;
      case 'ERROR':
        this.handlers.onError?.(event);
        break;
    }
  }

  private _flushReconnectBuffer(): void {
    if (this.reconnectBuffer.length === 0) return;
    const buffered = this.reconnectBuffer.slice();
    this.reconnectBuffer = [];
    for (const msg of buffered) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(msg);
      }
    }
  }

  private _scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.options.maxReconnectAttempts) {
      const err = new Error(
        `RealtimeClient: max reconnect attempts (${this.options.maxReconnectAttempts}) exceeded`,
      );
      this.handlers.onError?.(err);
      return;
    }

    const delay =
      this.options.reconnectBaseDelayMs * Math.pow(2, this.reconnectAttempt);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isIntentionalDisconnect) {
        this._openSocket();
      }
    }, delay);
  }

  private _clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
