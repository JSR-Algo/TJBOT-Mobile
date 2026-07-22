/**
 * useGeminiAudioSession — Gemini Live WebSocket session lifecycle.
 *
 * Owns token fetch, ai.live.connect, resumption-handle caching, and the
 * low-level open/close/error/message callbacks. The composer wires the
 * business logic by passing callbacks to connect().
 */
import { useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality } from '@google/genai/web';
import { useVoiceAssistantStore } from '../state/voiceAssistantStore';
import { Config } from '../config';
import { extractInlineAudioParts, type InlineAudioPart } from '../services/ai/liveMessageAudio';
import type { UseVoiceTelemetryReturn } from './useVoiceTelemetry';
import { logGeminiEvent } from '../services/observability/diagnosticLog';
import { resolveGeminiUserError } from '../services/observability/geminiErrorMessages';
import { resolveGeminiApiKey } from '../services/gemini/resolveGeminiApiKey';

const HANDLE_MAX_AGE_MS = 5 * 60 * 1000;

interface GeminiLiveSession {
  close?: () => void;
  sendRealtimeInput?: (input: { audio: { data: string; mimeType: string } }) => void;
  sendClientContent?: (params: {
    turns: Array<{ role: string; parts: Array<{ text: string }> }>;
    turnComplete?: boolean;
  }) => void;
}

interface LiveCloseEvent {
  code?: number | string | null;
  reason?: string | null;
  wasClean?: boolean | null;
  type?: string | null;
}

interface LiveErrorEvent extends LiveCloseEvent {
  message?: string | null;
  status?: number | string | null;
}

interface LiveTextChunk {
  text?: string | null;
}

export interface SessionResumptionUpdate {
  resumable?: boolean | null;
  newHandle?: string | null;
}

interface LiveServerContentMessage {
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { data?: unknown } }> | null } | null;
    interrupted?: boolean | null;
    inputTranscription?: LiveTextChunk | null;
    outputTranscription?: LiveTextChunk | null;
    turnComplete?: boolean | null;
  } | null;
  sessionResumptionUpdate?: SessionResumptionUpdate | null;
  goAway?: { timeLeft?: number | string | null } | null;
}

export interface GeminiSessionCallbacks {
  onConnected: () => void;
  onDisconnected: (detail: {
    code: number | string | null;
    reason: string | null;
    wasClean: boolean | null;
    type: string | null;
  }) => void;
  onError: (detail: {
    message: string | null;
    code: number | string | null;
    reason: string | null;
    type: string | null;
    status: number | string | null;
    errorString: string | null;
  }) => void;
  onAudioParts: (parts: InlineAudioPart[]) => void;
  onInterrupted: () => void;
  onInputTranscript: (text: string) => void;
  onOutputTranscript: (text: string) => void;
  onTurnComplete: () => void;
  onResumptionUpdate: (update: SessionResumptionUpdate) => void;
  onGoAway: (timeLeft: number | string | null) => void;
}

export interface UseGeminiAudioSessionOptions {
  voiceName?: string;
  systemInstruction?: string;
}

export interface UseGeminiAudioSessionReturn {
  sessionRef: React.MutableRefObject<GeminiLiveSession | null>;
  sessionIdRef: React.MutableRefObject<number>;
  sessionRequestStartMsRef: React.MutableRefObject<number | null>;
  sessionWsOpenMsRef: React.MutableRefObject<number | null>;
  firstAudioAtMsRef: React.MutableRefObject<number | null>;
  connect: (callbacks: GeminiSessionCallbacks, isReconnect: boolean) => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  isCurrentSession: () => boolean;
  suppressCloseForCurrentSession: () => void;
  /** Send a text turn to the live session (e.g. the speak-first greeting kickoff). */
  sendTextTurn: (text: string) => boolean;
}

export function useGeminiAudioSession(
  options: UseGeminiAudioSessionOptions,
  telemetry: UseVoiceTelemetryReturn,
): UseGeminiAudioSessionReturn {
  const store = useVoiceAssistantStore;
  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const sessionIdRef = useRef(0);
  const sessionResumptionHandleRef = useRef<string | null>(null);
  const sessionResumptionCachedAtMsRef = useRef<number>(0);
  const sessionRequestStartMsRef = useRef<number | null>(null);
  const sessionWsOpenMsRef = useRef<number | null>(null);
  const firstAudioAtMsRef = useRef<number | null>(null);
  const suppressedCloseSessionIdsRef = useRef<Set<number>>(new Set());
  const reconnectRef = useRef<(() => void) | null>(null);

  const isCurrentSession = useCallback(
    (id?: number) => {
      const activeId = id ?? sessionIdRef.current;
      return activeId === sessionIdRef.current;
    },
    [],
  );

  const suppressCloseForCurrentSession = useCallback(() => {
    suppressedCloseSessionIdsRef.current.add(sessionIdRef.current);
  }, []);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      suppressedCloseSessionIdsRef.current.add(sessionIdRef.current);
    }
    try {
      sessionRef.current?.close?.();
    } catch (err) {
      telemetry.jsErrorBreadcrumb('gemini.session.close', err);
    }
    sessionRef.current = null;
  }, [telemetry]);

  const reconnect = useCallback(() => {
    reconnectRef.current?.();
  }, []);

  const sendTextTurn = useCallback(
    (text: string): boolean => {
      const live = sessionRef.current;
      if (!live?.sendClientContent) return false;
      try {
        live.sendClientContent({
          turns: [{ role: 'user', parts: [{ text }] }],
          turnComplete: true,
        });
        return true;
      } catch (err) {
        telemetry.jsErrorBreadcrumb('gemini.sendTextTurn', err);
        return false;
      }
    },
    [telemetry],
  );

  const connect = useCallback(
    async (callbacks: GeminiSessionCallbacks, isReconnect: boolean): Promise<void> => {
      sessionIdRef.current += 1;
      const activeSessionId = sessionIdRef.current;
      const currentSession = () => activeSessionId === sessionIdRef.current;

      sessionRequestStartMsRef.current = Date.now();
      sessionWsOpenMsRef.current = null;
      firstAudioAtMsRef.current = null;

      if (!isReconnect && store.getState().state === 'PREPARING_AUDIO') {
        store.getState().transition('CONNECTING');
      }

      let apiKey: string;
      try {
        const resolved = await resolveGeminiApiKey();
        apiKey = resolved.apiKey;
        telemetry.track('session', 'token_fetch_success', {
          tokenType:
            resolved.source === 'demo_env'
              ? 'demo_env_key'
              : apiKey.startsWith('AIza')
                ? 'api_key'
                : 'ephemeral_token',
          source: resolved.source,
        });
        if (resolved.source === 'demo_env') {
          logGeminiEvent('demo_key_active', 'Using local .env Gemini demo key (Render token skipped).', {
            model: Config.GEMINI_LIVE_MODEL,
          });
        }
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        const responseData =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { status?: number; data?: unknown } }).response
            : undefined;
        const responseText =
          typeof responseData?.data === 'string'
            ? responseData.data
            : JSON.stringify(responseData?.data ?? '');
        const combined = `${errMessage} ${responseText}`;
        logGeminiEvent(
          'token_fetch_failed',
          resolveGeminiUserError(combined, 'Could not fetch Gemini voice token from server.'),
          {
            status: responseData?.status,
            apiBase: Config.API_BASE_URL,
          },
          'error',
        );
        telemetry.track('session', 'token_fetch_failed', {
          message: errMessage,
        });
        store.getState().setError(
          resolveGeminiUserError(
            combined,
            'Could not connect to Robot voice. Check your internet and sign-in, then try again.',
          ),
        );
        store.getState().transition('ERROR_RECOVERABLE');
        return;
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        telemetry.track('provider', 'genai_sdk_connect', { model: Config.GEMINI_LIVE_MODEL });

        const cachedHandle = sessionResumptionHandleRef.current;
        const handleAgeMs = cachedHandle
          ? Date.now() - sessionResumptionCachedAtMsRef.current
          : null;
        const useCachedHandle =
          cachedHandle !== null && handleAgeMs !== null && handleAgeMs < HANDLE_MAX_AGE_MS;
        const resumptionConfig = useCachedHandle ? { handle: cachedHandle as string } : {};
        telemetry.track('session', 'session_resumption_attempt', {
          hasHandle: useCachedHandle,
          handleAgeMs,
        });
        if (cachedHandle && !useCachedHandle) {
          sessionResumptionHandleRef.current = null;
          sessionResumptionCachedAtMsRef.current = 0;
        }

        const session = await ai.live.connect({
          model: Config.GEMINI_LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              languageCode: 'vi-VN',
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: options.voiceName || 'Kore',
                },
              },
            },
            systemInstruction: options.systemInstruction || undefined,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            sessionResumption: resumptionConfig,
          },
          callbacks: {
            onopen: () => {
              if (!currentSession()) return;
              telemetry.track('provider', 'live_connected');
              const now = Date.now();
              sessionWsOpenMsRef.current = now;
              if (sessionRequestStartMsRef.current !== null) {
                telemetry.track('session', 'session_start_latency_ms', {
                  latencyMs: now - sessionRequestStartMsRef.current,
                });
              }
              store.getState().transition('READY');
              callbacks.onConnected();
            },
            onmessage: (message: LiveServerContentMessage) => {
              if (!currentSession()) return;

              const audioParts = extractInlineAudioParts(message.serverContent);
              if (audioParts.length > 0) {
                if (
                  firstAudioAtMsRef.current === null &&
                  sessionWsOpenMsRef.current !== null
                ) {
                  const now = Date.now();
                  firstAudioAtMsRef.current = now;
                  telemetry.track('session', 'first_audio_received_latency_ms', {
                    latencyMs: now - sessionWsOpenMsRef.current,
                  });
                }
                callbacks.onAudioParts(audioParts);
              }

              if (message.serverContent?.interrupted) {
                callbacks.onInterrupted();
              }

              const inputTranscription = message.serverContent?.inputTranscription;
              if (inputTranscription?.text) {
                callbacks.onInputTranscript(inputTranscription.text);
              }

              const outputTranscription = message.serverContent?.outputTranscription;
              if (outputTranscription?.text) {
                callbacks.onOutputTranscript(outputTranscription.text);
              }

              if (message.serverContent?.turnComplete) {
                callbacks.onTurnComplete();
              }

              if (message.sessionResumptionUpdate) {
                callbacks.onResumptionUpdate(message.sessionResumptionUpdate);
              }

              if (message.goAway) {
                telemetry.track('provider', 'live_go_away', {
                  timeLeftMs: message.goAway.timeLeft,
                });
                callbacks.onGoAway(message.goAway.timeLeft ?? null);
              }
            },
            onclose: (event?: LiveCloseEvent) => {
              const detail = {
                code: event?.code ?? null,
                reason: event?.reason ?? null,
                wasClean: event?.wasClean ?? null,
                type: event?.type ?? null,
              };
              telemetry.track('provider', 'live_disconnected', {
                ...detail,
                state: store.getState().state,
                stale: !currentSession(),
              });
              const suppressed = suppressedCloseSessionIdsRef.current.delete(activeSessionId);
              if (!currentSession() || suppressed) {
                return;
              }
              callbacks.onDisconnected(detail);
            },
            onerror: (error: LiveErrorEvent) => {
              if (!currentSession()) return;
              const detail = {
                message: error?.message ?? null,
                code: error?.code ?? null,
                reason: error?.reason ?? null,
                type: error?.type ?? null,
                status: error?.status ?? null,
                errorString: error ? String(error) : null,
              };
              telemetry.track('error', 'live_error', detail as Record<string, unknown>);
              sessionResumptionHandleRef.current = null;
              sessionResumptionCachedAtMsRef.current = 0;
              callbacks.onError(detail);
            },
          },
        });

        sessionRef.current = session;
        telemetry.track('session', 'session_connected');
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        logGeminiEvent(
          'genai_connect_failed',
          resolveGeminiUserError(errMessage, 'Could not open Gemini Live session.'),
          { model: Config.GEMINI_LIVE_MODEL },
          'error',
        );
        telemetry.track('error', 'genai_connect_failed', {
          message: errMessage,
        });
        store.getState().setError(
          resolveGeminiUserError(errMessage, 'Không thể kết nối Gemini Live.'),
        );
        store.getState().transition('ERROR_RECOVERABLE');
      }
    },
    [options.voiceName, options.systemInstruction, store, telemetry],
  );

  return useMemo(
    () => ({
      sessionRef,
      sessionIdRef,
      sessionRequestStartMsRef,
      sessionWsOpenMsRef,
      firstAudioAtMsRef,
      connect,
      disconnect,
      reconnect,
      isCurrentSession,
      suppressCloseForCurrentSession,
      sendTextTurn,
    }),
    [
      connect,
      disconnect,
      reconnect,
      isCurrentSession,
      suppressCloseForCurrentSession,
      sendTextTurn,
    ],
  );
}

