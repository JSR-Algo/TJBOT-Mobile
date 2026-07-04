/**
 * useGeminiConversation — thin composer for Gemini Live voice conversation.
 *
 * Delegates to focused, testable hooks:
 *   - useGeminiAudioSession  → WebSocket session lifecycle + token fetch
 *   - useGeminiPlayback      → PCM enqueue / interrupt / drain
 *   - useGeminiTimers        → FSM deadline timers + watchdogs
 *   - useVoiceTelemetry      → telemetry dispatch (raw transcript redaction)
 *
 * This file keeps the orchestration glue: native VoiceSession/VoiceMic setup,
 * simulator fallback, message callback business logic, and user interrupt.
 */
import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { VoiceSession } from '../native/VoiceSession';
import { VoiceMic } from '../native/VoiceMic';
import { useVoiceAssistantStore } from '../state/voiceAssistantStore';
import { detectExpression } from '../utils/expressionDetector';
import { chat as chatWithAI } from '../services/api/ai';
import { startVoiceDebugProbe, stopVoiceDebugProbe } from '../debug/voiceDebugProbe';
import {
  checkInput,
  checkOutput,
  assemblePersona,
  type SafetyContext,
} from '@/services/ai/safety';
import { useGeminiAudioSession, type SessionResumptionUpdate } from './useGeminiAudioSession';
import { useGeminiPlayback } from './useGeminiPlayback';
import { useGeminiTimers } from './useGeminiTimers';
import { useVoiceTelemetry } from './useVoiceTelemetry';
import { resolveGeminiUserError } from '../services/observability/geminiErrorMessages';
import { logGeminiEvent } from '../services/observability/diagnosticLog';

const SIMULATOR_CHAT_TIMEOUT_MS = 1500;
const SIMULATOR_TEST_PROMPT = 'Xin chào! Tớ là bạn mới.';
const SIMULATOR_FALLBACK_REPLY =
  'Simulator không hỗ trợ micro live ổn định. Mình đã chuyển sang chế độ test văn bản để bạn vẫn kiểm tra được màn Gemini.';

interface GeminiConversationOptions {
  voiceName?: string;
  systemInstruction?: string;
}

interface UseGeminiConversationReturn {
  startConversation: () => Promise<void>;
  stopConversation: () => void;
  interruptPlayback: () => void;
}

type AudioStreamHandle = { stop: () => Promise<void> | void };

export function useGeminiConversation(
  options: GeminiConversationOptions = {},
): UseGeminiConversationReturn {
  const store = useVoiceAssistantStore;
  const fsmState = useVoiceAssistantStore((s) => s.state);
  const telemetry = useVoiceTelemetry();
  const playback = useGeminiPlayback();
  const safetyContext: SafetyContext = useMemo(
    () => ({
      childAgeBracket: '4-6',
      childProfileId: 'default',
      sessionId: 'session-default',
      theme: {
        version: '1.0.0',
        allowedTopics: ['animals', 'colors', 'family', 'school', 'food'],
        vocab: ['hello', 'cat', 'dog', 'blue', 'apple'],
        openers: ['Hi friend!', 'Ready to learn?'],
      },
      telemetry: {
        emit: (event, payload) => telemetry.track('session', event, payload),
      },
    }),
    [telemetry],
  );

  const session = useGeminiAudioSession(
    {
      ...options,
      systemInstruction: options.systemInstruction || assemblePersona(safetyContext),
    },
    telemetry,
  );

  const audioStreamRef = useRef<AudioStreamHandle | null>(null);
  const isCapturingRef = useRef(false);
  const stopAudioCaptureRef = useRef<(() => void) | null>(null);
  const audioCaptureCleanupRef = useRef<(() => void) | null>(null);
  const audioCaptureGenerationRef = useRef(0);
  const simulatorRunIdRef = useRef(0);
  const simulatorReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserTalkingRef = useRef(false);
  const voiceSessionUnsubsRef = useRef<Array<() => void>>([]);
  const voiceSessionStartedRef = useRef(false);
  const userSpeechEndMsRef = useRef<number | null>(null);
  const engineReadyRef = useRef(false);
  const reconnectRef = useRef<(() => void) | null>(null);
  const sessionResumptionHandleRef = useRef<string | null>(null);
  const sessionResumptionCachedAtMsRef = useRef<number>(0);
  const startAudioCaptureRef = useRef<(() => void) | null>(null);
  const startConversationRef = useRef<(() => Promise<void>) | null>(null);

  const sessionApi = useMemo(
    () => ({
      close: () => {
        session.suppressCloseForCurrentSession();
        session.disconnect();
      },
      reconnect: () => session.reconnect(),
      suppressCloseForCurrentSession: () => session.suppressCloseForCurrentSession(),
      sessionIdRef: session.sessionIdRef,
    }),
    [session],
  );

  const timers = useGeminiTimers(telemetry, sessionApi);

  stopAudioCaptureRef.current = _stopAudioCapture;

  // ── Reconnect helper (A5 / P0-13) ──────────────────────────────────────────
  useEffect(() => {
    reconnectRef.current = () => {
      telemetry.track('session', 'session_reconnect_begin');
      const s = store.getState();
      const userMidUtterance =
        s.state === 'USER_SPEAKING' || s.state === 'USER_SPEECH_FINALIZING';
      if (!userMidUtterance) {
        useVoiceAssistantStore.setState({ currentUserTurnId: null });
      }
      s.openBargeInWindow();
      sessionApi.close();
      queueMicrotask(() => {
        if (store.getState().state !== 'RECONNECTING') return;
        const start = startConversationRef.current;
        if (!start) return;
        start().catch((err) => {
          telemetry.jsErrorBreadcrumb('gemini.reconnect.start', err);
          store.getState().setError('Kết nối lại thất bại.');
          store.getState().transition('ERROR_RECOVERABLE');
        });
      });
    };
    return () => {
      reconnectRef.current = null;
    };
  }, [store, telemetry, sessionApi]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopConversation();
      playback.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Engine-ready replay (P0-10 race fix) ───────────────────────────────────
  useEffect(() => {
    const unsub = VoiceMic.onEngineReady(() => {
      engineReadyRef.current = true;
      const s = store.getState();
      if (s.state === 'READY') {
        s.transition('LISTENING');
      }
    });
    return () => unsub();
  }, [store]);

  useEffect(() => {
    if (fsmState === 'READY' && engineReadyRef.current) {
      engineReadyRef.current = false;
      store.getState().transition('LISTENING');
    }
  }, [fsmState, store]);

  useEffect(() => {
    if (fsmState === 'PREPARING_AUDIO' || fsmState === 'IDLE') {
      engineReadyRef.current = false;
    } else if (fsmState === 'RECONNECTING') {
      engineReadyRef.current = true;
    }
  }, [fsmState]);

  // ── Audio capture ──────────────────────────────────────────────────────────
  function _startAudioCapture(): void {
    if (isCapturingRef.current || audioCaptureCleanupRef.current !== null) return;
    const captureGeneration = audioCaptureGenerationRef.current + 1;
    audioCaptureGenerationRef.current = captureGeneration;

    if (__DEV__) startVoiceDebugProbe();

    try {
      telemetry.track('capture', 'audio_capture_init', { backend: 'native' });

      let lastLevelUpdate = 0;
      const LEVEL_UPDATE_INTERVAL_MS = 100;
      let __chunkDebugCount = 0;

      const handleMicChunk = (base64: string) => {
        __chunkDebugCount += 1;
        if (__DEV__ && (__chunkDebugCount === 1 || __chunkDebugCount % 50 === 0)) {
          console.info(
            `[voice-native:mic-debug] chunk #${__chunkDebugCount} base64Len=${base64.length} state=${store.getState().state} captureActive=${isCapturingRef.current}`,
          );
        }
        if (!isCapturingRef.current) return;

        const bytes = atob(base64);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < bytes.length; i += 16) {
          const sample = (bytes.charCodeAt(i) | (bytes.charCodeAt(i + 1) << 8)) / 32768;
          sum += sample * sample;
          count += 1;
        }
        const rms = count > 0 ? Math.sqrt(sum / count) : 0;

        try {
          const inputCheck = checkInput(base64, safetyContext);
          if (inputCheck.verdict === 'block') return;
          session.sessionRef.current?.sendRealtimeInput?.({
            audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
          });
        } catch (err) {
          telemetry.jsErrorBreadcrumb('gemini.sendRealtimeInput', err, {
            state: store.getState().state,
            chunkBytes: base64.length,
          });
        }

        const now = Date.now();
        if (now - lastLevelUpdate > LEVEL_UPDATE_INTERVAL_MS) {
          store.getState().setAudioLevel(Math.min(1, rms * 5));
          lastLevelUpdate = now;
        }
      };

      const unsub = VoiceMic.onData(({ data }) => handleMicChunk(data));
      const unsubStall = VoiceMic.onStall((evt) => {
        telemetry.track('error', 'voice_mic_stalled', {
          lastFrameAgeMs: evt.lastFrameAgeMs,
          fatal: evt.fatal,
        });
        if (evt.fatal) {
          store
            .getState()
            .setError(`Micro mất frame ${Math.round(evt.lastFrameAgeMs)} ms. Tắt/bật lại voice.`);
        }
      });
      VoiceMic.setAecFallbackGate(false, 0).catch((err) => {
        telemetry.jsErrorBreadcrumb('voiceMic.setAecFallbackGate', err);
      });
      const unsubAecFailed = VoiceMic.onAecAttachFailed((evt) => {
        telemetry.track('session', 'voice.aec.attach_failed', { reason: evt.reason });
        telemetry.jsErrorBreadcrumb('voice.aec.attach_failed', evt.reason);
        VoiceMic.setAecFallbackGate(true, 0.04).catch((err) => {
          telemetry.jsErrorBreadcrumb('voiceMic.setAecFallbackGate', err);
        });
      });
      const unsubVadStart = VoiceMic.onVadStart(() => {
        const s = store.getState();
        if (s.state === 'LISTENING') {
          s.transition('USER_SPEAKING');
          telemetry.track('capture', 'vad_start');
        }
      });
      const unsubVadEnd = VoiceMic.onVadEnd((evt) => {
        const s = store.getState();
        if (s.state === 'USER_SPEAKING') {
          userSpeechEndMsRef.current = Date.now() - evt.hangoverMs;
          s.transition('WAITING_AI');
          telemetry.track('capture', 'vad_end', { hangoverMs: evt.hangoverMs });
        }
      });
      const cleanupNativeCapture = () => {
        unsub();
        unsubStall();
        unsubAecFailed();
        unsubVadStart();
        unsubVadEnd();
        audioCaptureCleanupRef.current = null;
      };
      audioCaptureCleanupRef.current = cleanupNativeCapture;

      VoiceMic.start({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        aec: 'hw',
      })
        .then(() => {
          if (audioCaptureGenerationRef.current !== captureGeneration) {
            unsubStall();
            cleanupNativeCapture();
            VoiceMic.stop().catch((err) => {
              telemetry.jsErrorBreadcrumb('voiceMic.stopAfterStaleStart', err);
            });
            return;
          }
          isCapturingRef.current = true;
          audioStreamRef.current = {
            stop: () => {
              cleanupNativeCapture();
              return VoiceMic.stop();
            },
          };
          telemetry.track('capture', 'audio_capture_started', { sampleRate: 16000, backend: 'native' });
        })
        .catch((err: unknown) => {
          cleanupNativeCapture();
          telemetry.jsErrorBreadcrumb('voiceMic.start', err);
          telemetry.track('error', 'audio_capture_start_failed', {
            backend: 'native',
            err: String(err),
          });
          store.getState().setError('Micro không khả dụng.');
          store.getState().transition('ERROR_RECOVERABLE');
        });
    } catch {
      telemetry.track('capture', 'audio_capture_unavailable');
      store.getState().setError('Microphone is not available. Close other apps using the mic and try again.');
      store.getState().transition('ERROR_RECOVERABLE');
    }
  }

  function _stopAudioCapture(): void {
    audioCaptureGenerationRef.current += 1;
    if (!isCapturingRef.current && audioCaptureCleanupRef.current === null) return;
    try {
      if (audioCaptureCleanupRef.current) {
        audioCaptureCleanupRef.current();
      }
    } catch (err) {
      telemetry.jsErrorBreadcrumb('voiceMic.cleanup', err);
    }
    VoiceMic.stop().catch((err) => {
      telemetry.jsErrorBreadcrumb('voiceMic.stop', err);
    });
    if (__DEV__) stopVoiceDebugProbe();
    telemetry.track('capture', 'audio_capture_stopped');
    isCapturingRef.current = false;
    audioStreamRef.current = null;
    store.getState().setAudioLevel(0);
  }
  startAudioCaptureRef.current = _startAudioCapture;

  // ── Interrupt playback (T3.1 / P0-10 / P0-22) ──────────────────────────────
  const interruptPlayback = useCallback(() => {
    const s = store.getState();
    if (s.state !== 'ASSISTANT_SPEAKING') return;
    const tapMs = Date.now();
    telemetry.track('barge_in', 'user_interrupt');
    playback
      .interrupt()
      .then(() => {
        telemetry.track('barge_in', 'voice_interrupt_latency_tap', {
          latencyMs: Date.now() - tapMs,
        });
        if (store.getState().state === 'INTERRUPTED') {
          const pendingTurnId = timers.pendingUserTurnIdAfterClearRef.current;
          const interruptMs = timers.interruptedAtMsRef.current;
          const interruptSrc = timers.interruptSourceRef.current;
          if (pendingTurnId !== null) {
            timers.pendingUserTurnIdAfterClearRef.current = null;
            useVoiceAssistantStore.setState({ currentUserTurnId: pendingTurnId });
            store.getState().transition('USER_SPEAKING');
            if (interruptMs !== null) {
              timers.interruptedAtMsRef.current = null;
              telemetry.track('barge_in', 'voice.barge_in.interrupt_to_listen_ms', {
                ms: Date.now() - interruptMs,
                destination_state: 'USER_SPEAKING',
                source: interruptSrc,
              });
            }
            telemetry.track('barge_in', 'voice.bargein.ordering.b_then_a', {
              userTurnId: pendingTurnId,
            });
          } else {
            store.getState().transition('LISTENING');
            if (interruptMs !== null) {
              timers.interruptedAtMsRef.current = null;
              telemetry.track('barge_in', 'voice.barge_in.interrupt_to_listen_ms', {
                ms: Date.now() - interruptMs,
                destination_state: 'LISTENING',
                source: interruptSrc,
              });
            }
          }
        }
      })
      .catch(() => {
        /* interrupt() already swallows native errors */
      });
    if (s.aiTranscript) s.addMessage('ai', s.aiTranscript, true);
    s.setAiTranscript('');
    timers.interruptedAtMsRef.current = Date.now();
    timers.interruptSourceRef.current = 'tap';
    s.transition('INTERRUPTED');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [store, telemetry, playback, timers]);

  // ── Session message callbacks ──────────────────────────────────────────────
  const sessionCallbacks = useMemo(
    () => ({
      onConnected: () => {
        const promoteReadyToListening = () => {
          const s = store.getState();
          if (s.state !== 'READY') return;
          if (engineReadyRef.current) {
            engineReadyRef.current = false;
            s.transition('LISTENING');
            return;
          }
          if (!isCapturingRef.current) return;
          void VoiceMic.getDiagnostics().then((diag) => {
            const cur = store.getState();
            if (cur.state !== 'READY') return;
            if (
              diag?.tapInstalled &&
              diag?.engineRunning &&
              (diag.framesDelivered ?? 0) > 0
            ) {
              cur.transition('LISTENING');
            }
          });
        };

        if (!isCapturingRef.current) {
          startAudioCaptureRef.current?.();
        }
        promoteReadyToListening();
      },
      onDisconnected: (detail: {
        code: number | string | null;
        reason: string | null;
        wasClean: boolean | null;
        type: string | null;
      }) => {
        const s = store.getState();
        if (s.state !== 'IDLE' && s.state !== 'ERROR_RECOVERABLE') {
          stopAudioCaptureRef.current?.();
          playback.interrupt();
          s.setError(detail.reason || `Gemini Live ngắt kết nối (${detail.code ?? 'unknown'}).`);
          s.transition('ERROR_RECOVERABLE');
        }
      },
      onError: (detail: {
        message: string | null;
        code: number | string | null;
        reason: string | null;
        type: string | null;
        status: number | string | null;
        errorString: string | null;
      }) => {
        stopAudioCaptureRef.current?.();
        playback.interrupt();
        const rawError =
          detail.message ||
          detail.reason ||
          detail.errorString ||
          (detail.code != null ? String(detail.code) : null);
        const shownError = resolveGeminiUserError(rawError, 'Lỗi kết nối Gemini');
        logGeminiEvent('live_error', shownError, detail as Record<string, unknown>, 'error');
        store.getState().setError(shownError);
        store.getState().transition('ERROR_RECOVERABLE');
      },
      onAudioParts: (audioParts: { data: string; index: number }[]) => {
        const s = store.getState();
        if (s.bargeInWindowOpen) {
          telemetry.track('playback', 'voice.assistant.chunk.dropped_barge_in', {
            count: audioParts.length,
            epoch: s.epoch,
          });
          return;
        }
        if (s.currentResponseId === null) {
          const rid = `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          store.getState().freezeNewResponse(rid);
          playback.startResponse(rid);
        }
        if (s.userTranscript) s.addMessage('user', s.userTranscript);
        if (s.state === 'USER_SPEAKING' || s.state === 'USER_SPEECH_FINALIZING' || s.state === 'LISTENING') {
          s.transition('WAITING_AI');
        }
        const player = playback.playbackRef.current;
        if (!player) return;
        const turnAtEnqueue = player.turnGeneration;
        for (const part of audioParts) {
          if (player.turnGeneration !== turnAtEnqueue) break;
          playback.enqueue(part.data);
        }
        store.getState().setAudioLevel(player.audioLevel);
      },
      onInterrupted: () => {
        telemetry.track('barge_in', 'live_interrupted');
        timers.cancelUnackMsRef.current = null;
        const detectedAtMs = Date.now();
        timers.interruptDetectedMsRef.current ??= detectedAtMs;
        playback
          .interrupt()
          .then(() => {
            telemetry.track('barge_in', 'interrupt_server_latency_ms', {
              latencyMs: Date.now() - detectedAtMs,
            });
            if (store.getState().state === 'INTERRUPTED') {
              const pendingTurnId = timers.pendingUserTurnIdAfterClearRef.current;
              const interruptMs = timers.interruptedAtMsRef.current;
              const interruptSrc = timers.interruptSourceRef.current;
              if (pendingTurnId !== null) {
                timers.pendingUserTurnIdAfterClearRef.current = null;
                useVoiceAssistantStore.setState({ currentUserTurnId: pendingTurnId });
                store.getState().transition('USER_SPEAKING');
                if (interruptMs !== null) {
                  timers.interruptedAtMsRef.current = null;
                  telemetry.track('barge_in', 'voice.barge_in.interrupt_to_listen_ms', {
                    ms: Date.now() - interruptMs,
                    destination_state: 'USER_SPEAKING',
                    source: interruptSrc,
                  });
                }
                telemetry.track('barge_in', 'voice.bargein.ordering.b_then_a', {
                  userTurnId: pendingTurnId,
                });
              } else {
                store.getState().transition('LISTENING');
                if (interruptMs !== null) {
                  timers.interruptedAtMsRef.current = null;
                  telemetry.track('barge_in', 'voice.barge_in.interrupt_to_listen_ms', {
                    ms: Date.now() - interruptMs,
                    destination_state: 'LISTENING',
                    source: interruptSrc,
                  });
                }
              }
            }
          })
          .catch((err) => {
            telemetry.jsErrorBreadcrumb('gemini.interrupt.server', err);
          });
        const s = store.getState();
        if (s.aiTranscript) s.addMessage('ai', s.aiTranscript, true);
        s.setAiTranscript('');
        if (s.state === 'ASSISTANT_SPEAKING') {
          timers.interruptedAtMsRef.current = Date.now();
          timers.interruptSourceRef.current = 'server_interrupted';
          s.transition('INTERRUPTED');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onInputTranscript: (text: string) => {
        if (store.getState().state === 'ASSISTANT_SPEAKING') return;
        const s = store.getState();
        const newText = s.userTranscript + text;
        s.setUserTranscript(newText);
        telemetry.trackInputTranscript(text.length);
      },
      onOutputTranscript: (text: string) => {
        // Handle AI output transcription chunk (outputTranscription) through the safety shim.
        const outputCheck = checkOutput(text, safetyContext);
        if (outputCheck.verdict === 'block') return;

        const expr = detectExpression(text);
        if (expr) {
          store.getState().setExpressionOverride(expr);
          setTimeout(() => {
            if (store.getState().expressionOverride === expr) {
              store.getState().setExpressionOverride(null);
            }
          }, 2500);
        }
        if (/[.!?。？！\n]/.test(text)) {
          playback.markSentenceBoundary();
        }
        const s = store.getState();
        const newText = s.aiTranscript + text;
        s.setAiTranscript(newText);
        telemetry.trackOutputTranscript(text.length);
      },
      onTurnComplete: () => {
        telemetry.track('provider', 'live_turn_complete', {
          aiTranscriptChars: store.getState().aiTranscript.length,
        });
        timers.responseTurnCompleteAtMsRef.current = Date.now();
        playback.endTurn();
        const s = store.getState();
        if (s.userTranscript) s.addMessage('user', s.userTranscript);
        if (s.aiTranscript) s.addMessage('ai', s.aiTranscript);
        s.setAiTranscript('');
        isUserTalkingRef.current = false;
        if (s.state === 'WAITING_AI') {
          timers.responseTurnCompleteAtMsRef.current = null;
          s.transition('LISTENING');
        }
      },
      onResumptionUpdate: (update: SessionResumptionUpdate) => {
        if (update.resumable && update.newHandle) {
          sessionResumptionHandleRef.current = update.newHandle;
          sessionResumptionCachedAtMsRef.current = Date.now();
          telemetry.track('session', 'session_resumption_cached', { handlePresent: true });
        } else {
          telemetry.track('session', 'session_resumption_non_resumable', {
            resumable: !!update.resumable,
          });
        }
      },
      onGoAway: () => {
        telemetry.track('provider', 'live_go_away_reconnect');
        const s = store.getState();
        if (
          s.state === 'LISTENING' ||
          s.state === 'USER_SPEAKING' ||
          s.state === 'WAITING_AI' ||
          s.state === 'ASSISTANT_SPEAKING' ||
          s.state === 'INTERRUPTED'
        ) {
          s.transition('RECONNECTING');
          queueMicrotask(() => reconnectRef.current?.());
        }
      },
    }),
    [store, telemetry, playback, timers, safetyContext],
  );

  // ── Playback callbacks ─────────────────────────────────────────────────────
  const wirePlaybackCallbacks = useCallback(() => {
    const player = playback.ensureCreated();
    player.onPlaybackFinish(() => {
      if (__DEV__) console.info(`[voice-native:turn] onPlaybackFinish fired, state=${store.getState().state}`);
      const metrics = playback.playbackRef.current?.getTurnMetrics();
      if (metrics) telemetry.track('playback', 'turn_metrics', { ...metrics });
      const s = store.getState();
      if (s.state === 'ASSISTANT_SPEAKING' && s.currentResponseId !== null) {
        timers.responseTurnCompleteAtMsRef.current = null;
        s.transition('LISTENING');
        telemetry.track('playback', 'playback_finished_to_listening');
      }
    });
    player.onPlaybackStart(() => {
      if (__DEV__) console.info('[voice-native:turn] onPlaybackStart fired');
      if (userSpeechEndMsRef.current !== null) {
        const ttfaMs = Date.now() - userSpeechEndMsRef.current;
        telemetry.track('session', 'voice_ttfa', { ttfaMs });
        userSpeechEndMsRef.current = null;
      }
      const s = store.getState();
      if (s.state === 'WAITING_AI' || s.state === 'USER_SPEAKING' || s.state === 'LISTENING') {
        s.transition('ASSISTANT_SPEAKING');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        telemetry.track('playback', 'playback_started_to_playing');
      }
    });
    player.onBufferingChange((buffering: boolean) => {
      store.getState().setIsBuffering(buffering);
      if (__DEV__) telemetry.track('playback', 'buffering_change', { buffering });
    });
    player.onFatalStall((payload) => {
      telemetry.track('error', 'playback_fatal_stall', { ...payload });
      const s = store.getState();
      s.setError('Phát âm thanh bị gián đoạn, vui lòng thử lại.');
      s.transition('ERROR_RECOVERABLE');
    });
    player.onPoorNetwork((poor: boolean) => {
      store.getState().setIsPoorNetwork(poor);
      if (__DEV__) telemetry.track('session', 'poor_network_change', { poor });
    });
    player.onAudioModeChange((mode: 'fast' | 'cautious' | 'full_buffer' | 'unknown') => {
      store.getState().setAudioMode(mode);
      if (__DEV__) telemetry.track('session', 'audio_mode_change', { mode });
    });
  }, [store, telemetry, playback, timers]);

  // ── Start conversation ─────────────────────────────────────────────────────
  const startConversation = useCallback(async () => {
    const { state, transition, setError } = store.getState();
    if (state !== 'IDLE' && state !== 'ERROR_RECOVERABLE' && state !== 'RECONNECTING') return;
    const isReconnect = state === 'RECONNECTING';
    simulatorRunIdRef.current += 1;
    isUserTalkingRef.current = false;
    if (simulatorReplyTimerRef.current) {
      clearTimeout(simulatorReplyTimerRef.current);
      simulatorReplyTimerRef.current = null;
    }
    telemetry.track('session', 'session_start', { isDevice: Device.isDevice, platform: Platform.OS });

    // Simulator fallback (non-device, non-reconnect)
    if (!Device.isDevice && !isReconnect) {
      const runId = simulatorRunIdRef.current;
      telemetry.track('session', 'simulator_fallback_start');
      transition('CONNECTING');
      transition('READY');
      transition('LISTENING');
      store.getState().setError(null);
      store.getState().setUserTranscript(`${SIMULATOR_TEST_PROMPT} (simulator mode)`);
      store.getState().addMessage('user', `${SIMULATOR_TEST_PROMPT} (simulator mode)`);
      transition('WAITING_AI');
      let aiText = SIMULATOR_FALLBACK_REPLY;
      try {
        const result = await Promise.race([
          chatWithAI(SIMULATOR_TEST_PROMPT),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Simulator chat timeout')), SIMULATOR_CHAT_TIMEOUT_MS);
          }),
        ]);
        if (typeof result?.response === 'string' && result.response.trim()) {
          aiText = result.response.trim();
        }
      } catch {
        aiText = SIMULATOR_FALLBACK_REPLY;
      }
      if (simulatorRunIdRef.current !== runId) return;
      const s = store.getState();
      s.setAiTranscript(aiText);
      s.transition('ASSISTANT_SPEAKING');
      simulatorReplyTimerRef.current = setTimeout(() => {
        if (simulatorRunIdRef.current !== runId) return;
        const current = store.getState();
        current.addMessage('ai', aiText);
        current.stopSession();
        simulatorReplyTimerRef.current = null;
      }, 1200);
      return;
    }

    // Device path
    if (!isReconnect) {
      transition('PREPARING_AUDIO');
      telemetry.track('session', 'mic_permission_requested');
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          setError('Cần quyền micro để trò chuyện.');
          transition('ERROR_RECOVERABLE');
          return;
        }
        telemetry.track('session', 'mic_permission_granted');
      } catch {
        setError('Không thể yêu cầu quyền micro.');
        transition('ERROR_RECOVERABLE');
        return;
      }
    }

    if (VoiceSession.isAvailable && !isReconnect) {
      try {
        await VoiceSession.start();
        voiceSessionStartedRef.current = true;
        voiceSessionUnsubsRef.current.push(
          VoiceSession.onStateChange((evt) => {
            telemetry.track('session', 'voice_session_state', {
              state: evt.state,
              reason: evt.reason,
              route: evt.route,
            });
            if (evt.state === 'transientLoss' || evt.state === 'lost') {
              playback.interrupt();
            }
          }),
          VoiceSession.onRouteChange((evt) => {
            telemetry.track('session', 'voice_route', { route: evt.route, device: evt.deviceName });
          }),
          VoiceSession.onSessionRecovered(async (evt) => {
            telemetry.track('session', 'voice_session_recovered', { reason: evt.reason });
            if (isCapturingRef.current) {
              stopAudioCaptureRef.current?.();
            }
            await playback.interrupt();
            const currentState = store.getState().state;
            const activeStates = ['LISTENING', 'USER_SPEAKING', 'WAITING_AI', 'ASSISTANT_SPEAKING'] as const;
            const wasActive = (activeStates as readonly string[]).includes(currentState);
            if (evt.reason === 'mediaServicesReset') {
              if (wasActive) startAudioCaptureRef.current?.();
            } else if (evt.reason === 'interruptionEnded') {
              startAudioCaptureRef.current?.();
            } else if (evt.reason === 'foregroundResume') {
              const diag = await VoiceMic.getDiagnostics();
              if (!diag?.tapInstalled || !diag?.engineRunning) {
                startAudioCaptureRef.current?.();
              }
            }
          }),
        );
      } catch (err) {
        telemetry.track('error', 'voice_session_start_failed', {
          message: err instanceof Error ? err.message : 'unknown',
        });
      }
    }

    if (!isReconnect) {
      wirePlaybackCallbacks();
    }
    playback.ensureCreated();
    (playback.playbackRef.current as { prewarm?: () => Promise<void> } | null)?.prewarm?.().catch(() => {
      /* non-fatal */
    });

    // Leave PREPARING_AUDIO before token fetch / WebSocket connect so the
    // 8s PREPARING_AUDIO FSM timer does not fire while the network is slow.
    if (!isReconnect) {
      transition('CONNECTING');
    }

    // Warm the native mic while Gemini connects so iPad engineReady does not
    // miss the READY deadline.
    if (!isReconnect && VoiceMic.isAvailable) {
      startAudioCaptureRef.current?.();
    }

    await session.connect(sessionCallbacks, isReconnect);
  }, [store, telemetry, playback, session, sessionCallbacks, wirePlaybackCallbacks]);
  startConversationRef.current = startConversation;

  // ── Stop conversation ──────────────────────────────────────────────────────
  const stopConversation = useCallback(() => {
    telemetry.track('session', 'session_stop_requested', { state: store.getState().state });
    simulatorRunIdRef.current += 1;
    if (simulatorReplyTimerRef.current) {
      clearTimeout(simulatorReplyTimerRef.current);
      simulatorReplyTimerRef.current = null;
    }

    stopAudioCaptureRef.current?.();
    playback.interrupt();
    playback.dispose();
    session.disconnect();

    for (const unsub of voiceSessionUnsubsRef.current) {
      try {
        unsub();
      } catch (err) {
        telemetry.jsErrorBreadcrumb('voiceSession.unsubscribe', err);
      }
    }
    voiceSessionUnsubsRef.current = [];
    if (voiceSessionStartedRef.current) {
      voiceSessionStartedRef.current = false;
      VoiceSession.end().catch((err) => {
        telemetry.jsErrorBreadcrumb('voiceSession.end', err);
      });
    }

    const s = store.getState();
    if (s.userTranscript) s.addMessage('user', s.userTranscript);
    if (s.aiTranscript) s.addMessage('ai', s.aiTranscript);
    s.setAudioMode('unknown');
    s.stopSession();
    telemetry.track('session', 'session_stopped');
  }, [store, telemetry, playback, session]);

  return { startConversation, stopConversation, interruptPlayback };
}
