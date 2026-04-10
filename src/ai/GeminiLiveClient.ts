/**
 * GeminiLiveClient — WebSocket client for Google Gemini Live API.
 *
 * Connects directly to Gemini's bidirectional audio streaming endpoint
 * using ephemeral tokens (no API key in client).
 *
 * Protocol:
 *   1. Connect WSS with access_token
 *   2. Send config (model, voice, system instruction)
 *   3. Stream PCM 16kHz audio chunks (base64)
 *   4. Receive PCM 24kHz audio + transcription events
 */

const GEMINI_WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage';

export interface GeminiLiveConfig {
  /** Ephemeral token from backend */
  token: string;
  /** Model to use (default: models/gemini-3.1-flash-live-preview) */
  model?: string;
  /** Voice name for TTS (default: Puck) */
  voiceName?: string;
  /** System instruction text */
  systemInstruction: string;
  /** Callbacks */
  onAudioChunk: (base64Pcm24k: string) => void;
  onInputTranscript: (text: string) => void;
  onOutputTranscript: (text: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onError: (error: Error) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  debugLabel?: string;
  onTelemetry?: (event: string, details?: Record<string, unknown>) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private config: GeminiLiveConfig | null = null;
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private setupTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalDisconnect = false;
  private setupCompleted = false;
  private sentAudioChunks = 0;
  private receivedAudioChunks = 0;

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  connect(config: GeminiLiveConfig): void {
    this.config = config;
    this.isIntentionalDisconnect = false;
    this.setupCompleted = false;
    this.sentAudioChunks = 0;
    this.receivedAudioChunks = 0;
    this._emitTelemetry('connect_requested', {
      model: config.model ?? 'models/gemini-2.0-flash-live-001',
      transport: config.token.startsWith('AIza') ? 'api_key' : 'ephemeral_token',
    });
    this._openSocket();
  }

  sendAudio(base64Pcm16k: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.sentAudioChunks += 1;
    if (this.sentAudioChunks === 1 || this.sentAudioChunks % 50 === 0) {
      this._emitTelemetry('audio_chunk_sent', {
        chunks: this.sentAudioChunks,
        bytesBase64: base64Pcm16k.length,
      });
    }
    const message = JSON.stringify({
      realtimeInput: {
        audio: {
          data: base64Pcm16k,
          mimeType: 'audio/pcm;rate=16000',
        },
      },
    });
    this.ws.send(message);
  }

  sendAudioStreamEnd(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this._emitTelemetry('audio_stream_end_sent', {
      chunks: this.sentAudioChunks,
    });
    this.ws.send(JSON.stringify({
      realtimeInput: {
        audioStreamEnd: true,
      },
    }));
  }

  sendTextTurn(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !text.trim()) return;
    this._emitTelemetry('text_turn_sent', {
      chars: text.trim().length,
    });
    this.ws.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text: text.trim() }] }],
        turnComplete: true,
      },
    }));
  }

  disconnect(): void {
    this.isIntentionalDisconnect = true;
    this._clearReconnectTimer();
    this._clearSetupTimer();
    this.reconnectAttempt = 0;
    this._emitTelemetry('disconnect_requested');
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private _buildUrl(): string {
    const config = this.config!;
    const isEphemeral = !config.token.startsWith('AIza'); // API keys start with AIza
    if (isEphemeral) {
      return `${GEMINI_WS_BASE}.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(config.token)}`;
    }
    return `${GEMINI_WS_BASE}.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(config.token)}`;
  }

  private _openSocket(): void {
    const url = this._buildUrl();
    this._emitTelemetry('socket_opening', {
      urlType: url.includes('access_token=') ? 'v1alpha_ephemeral' : 'v1beta_api_key',
    });
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this._emitTelemetry('socket_open');
      this._sendSetup();
      this._armSetupTimeout();
    };

    ws.onmessage = (event) => {
      void this._handleMessage(event.data);
    };

    ws.onerror = () => {
      this._emitTelemetry('socket_error');
      // onerror is always followed by onclose
    };

    ws.onclose = (event) => {
      this._clearSetupTimer();
      this.ws = null;
      this._emitTelemetry('socket_close', {
        code: event.code,
        reason: 'reason' in event ? event.reason : undefined,
        intentional: this.isIntentionalDisconnect,
        setupCompleted: this.setupCompleted,
        sentAudioChunks: this.sentAudioChunks,
        receivedAudioChunks: this.receivedAudioChunks,
      });
      this.config?.onDisconnected();
      if (!this.isIntentionalDisconnect && !this.setupCompleted && event.code !== 1000) {
        this.config?.onError(new Error(`Gemini setup failed before ready (close code ${event.code})`));
      }
      if (!this.isIntentionalDisconnect && event.code !== 1000) {
        this._scheduleReconnect();
      }
    };
  }

  private _sendSetup(): void {
    if (!this.ws || !this.config) return;
    const config = this.config;
    const setupMessage = {
      setup: {
        model: config.model || 'models/gemini-2.0-flash-live-001',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: config.voiceName || 'Puck',
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: config.systemInstruction }],
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    };
    this._emitTelemetry('setup_sent', {
      model: setupMessage.setup.model,
      voiceName: config.voiceName || 'Puck',
    });
    this.ws.send(JSON.stringify(setupMessage));
  }

  private async _handleMessage(data: unknown): Promise<void> {
    const raw = await this._normalizeMessageData(data);
    if (!raw) return;

    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const serverContent = msg.serverContent;
    if (msg.setupComplete) {
      this.setupCompleted = true;
      this._clearSetupTimer();
      this._emitTelemetry('setup_complete');
      this.config?.onConnected();
      return;
    }
    if (msg.error) {
      const message = msg.error.message ?? msg.error.status ?? 'Gemini Live error';
      this._emitTelemetry('server_error', {
        message,
        status: msg.error.status,
      });
      this.config?.onError(new Error(message));
      return;
    }
    if (!serverContent) return;

    // Audio response chunks
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.receivedAudioChunks += 1;
          if (this.receivedAudioChunks === 1 || this.receivedAudioChunks % 25 === 0) {
            this._emitTelemetry('audio_chunk_received', {
              chunks: this.receivedAudioChunks,
              bytesBase64: part.inlineData.data.length,
            });
          }
          this.config?.onAudioChunk(part.inlineData.data);
        }
      }
    }

    // Input transcription (user's speech as text)
    if (serverContent.inputTranscription?.text) {
      this._emitTelemetry('input_transcript', {
        chars: serverContent.inputTranscription.text.length,
      });
      this.config?.onInputTranscript(serverContent.inputTranscription.text);
    }

    // Output transcription (AI's speech as text)
    if (serverContent.outputTranscription?.text) {
      this._emitTelemetry('output_transcript', {
        chars: serverContent.outputTranscription.text.length,
      });
      this.config?.onOutputTranscript(serverContent.outputTranscription.text);
    }

    // Interruption (user barged in)
    if (serverContent.interrupted === true) {
      this._emitTelemetry('interrupted');
      this.config?.onInterrupted();
    }

    // Turn complete
    if (serverContent.turnComplete === true) {
      this._emitTelemetry('turn_complete');
      this.config?.onTurnComplete();
    }
  }

  private async _normalizeMessageData(data: unknown): Promise<string | null> {
    if (typeof data === 'string') {
      return data;
    }

    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      return await data.text();
    }

    if (data instanceof ArrayBuffer) {
      return new TextDecoder().decode(data);
    }

    if (ArrayBuffer.isView(data)) {
      return new TextDecoder().decode(
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      );
    }

    return null;
  }

  private _scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this._emitTelemetry('reconnect_exhausted', {
        attempts: this.reconnectAttempt,
      });
      this.config?.onError(new Error('Max reconnect attempts exceeded'));
      return;
    }
    const delay = 500 * Math.pow(2, this.reconnectAttempt);
    this.reconnectAttempt++;
    this._emitTelemetry('reconnect_scheduled', {
      attempt: this.reconnectAttempt,
      delayMs: delay,
    });
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

  private _armSetupTimeout(): void {
    this._clearSetupTimer();
    this.setupTimer = setTimeout(() => {
      this.setupTimer = null;
      if (!this.setupCompleted) {
        this._emitTelemetry('setup_timeout');
        this.config?.onError(new Error('Gemini setup timed out'));
        if (this.ws) {
          this.ws.close(4000, 'Setup timeout');
        }
      }
    }, 10000);
  }

  private _clearSetupTimer(): void {
    if (this.setupTimer !== null) {
      clearTimeout(this.setupTimer);
      this.setupTimer = null;
    }
  }

  private _emitTelemetry(event: string, details?: Record<string, unknown>): void {
    this.config?.onTelemetry?.(event, details);
    if (__DEV__) {
      const label = this.config?.debugLabel ?? 'gemini';
      if (details) {
        console.info(`[GeminiLive:${label}] ${event}`, details);
      } else {
        console.info(`[GeminiLive:${label}] ${event}`);
      }
    }
  }
}
