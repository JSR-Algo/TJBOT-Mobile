/**
 * useGeminiConversation — Orchestration hook for Gemini Live voice conversation.
 *
 * Uses @google/genai SDK (same as web app) for reliable WebSocket,
 * transcript streaming, and audio handling.
 */
import { useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import * as Device from 'expo-device';
import { GoogleGenAI, Modality, ActivityHandling } from '@google/genai/web';
// Native streaming PCM (both platforms). iOS uses the native
// PcmStreamModule via AVAudioPlayerNode; playback-finish detection uses
// duration-based timer (not drain polling) to avoid the stuck-on-playing
// bug with .dataPlayedBack completion handlers on iOS.
import { PcmStreamPlayer as AudioPlaybackService } from '../audio/PcmStreamPlayer';
import { VoiceSession } from '../native/VoiceSession';
import { VoiceMic } from '../native/VoiceMic';
import { useVoiceAssistantStore } from '../state/voiceAssistantStore';
import * as Haptics from 'expo-haptics';
import { detectExpression } from '../utils/expressionDetector';
import { Config } from '../config';
import { chat as chatWithAI } from '../api/ai';
import apiClient from '../api/client';
import { extractInlineAudioParts } from '../ai/liveMessageAudio';
import { startVoiceDebugProbe, stopVoiceDebugProbe } from '../debug/voiceDebugProbe';
import { jsErrorBreadcrumb } from '../observability/voice-telemetry';

const AUDIO_ACTIVITY_THRESHOLD = 0.01;
const TOKEN_FETCH_TIMEOUT_MS = 8000;
// T4.2: how long a cached session-resumption handle is considered fresh.
// The Live API's server-side TTL is short (minutes); passing a stale
// handle just makes `ai.live.connect` throw, so we gate on age up-front.
const HANDLE_MAX_AGE_MS = 5 * 60 * 1000;
const SIMULATOR_CHAT_TIMEOUT_MS = 1500;
const SIMULATOR_TEST_PROMPT = 'Xin ch\u00e0o! T\u1edb l\u00e0 b\u1ea1n m\u1edbi.';
const SIMULATOR_FALLBACK_REPLY = 'Simulator kh\u00f4ng h\u1ed7 tr\u1ee3 micro live \u1ed5n \u0111\u1ecbnh. M\u00ecnh \u0111\u00e3 chuy\u1ec3n sang ch\u1ebf \u0111\u1ed9 test v\u0103n b\u1ea3n \u0111\u1ec3 b\u1ea1n v\u1eabn ki\u1ec3m tra \u0111\u01b0\u1ee3c m\u00e0n Gemini.';

interface GeminiConversationOptions {
  voiceName?: string;
  systemInstruction?: string;
}

interface UseGeminiConversationReturn {
  startConversation: () => Promise<void>;
  stopConversation: () => void;
  /**
   * User-initiated barge-in. Stops assistant playback immediately (native
   * `clear()` drops scheduled buffers in <10 ms), marks the in-flight
   * assistant transcript as interrupted, and drives the FSM through
   * PLAYING_AI_AUDIO → INTERRUPTED → LISTENING (400 ms). Safe to call from
   * any state — no-ops when playback is idle.
   */
  interruptPlayback: () => void;
}

export function useGeminiConversation(options: GeminiConversationOptions = {}): UseGeminiConversationReturn {
  const sessionRef = useRef<any>(null);
  const playbackRef = useRef<AudioPlaybackService | null>(null);
  const audioStreamRef = useRef<any>(null);
  const isCapturingRef = useRef(false);
  const simulatorRunIdRef = useRef(0);
  const simulatorReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserTalkingRef = useRef(false);
  const voiceSessionUnsubsRef = useRef<Array<() => void>>([]);
  const voiceSessionStartedRef = useRef(false);
  // T4.5: voiceTtfa — Date.now() stamped when user-speech-end is detected
  // (STREAMING_INPUT → WAITING_AI). Consumed once on first onPlaybackStart
  // to compute time-to-first-audio, then reset to null.
  const userSpeechEndMsRef = useRef<number | null>(null);
  // T4.2: latest resumable session handle advertised by Gemini Live.
  // In-memory only (COPPA/PII — never persisted). Updated on every
  // sessionResumptionUpdate with `resumable=true`; cleared on onerror.
  // Passed back on connect when recent enough (see HANDLE_MAX_AGE_MS).
  const sessionResumptionHandleRef = useRef<string | null>(null);
  // T4.2: wall-clock timestamp of the last cached handle. Used on connect
  // to reject handles older than HANDLE_MAX_AGE_MS — the server's own
  // session TTL is short, and a stale handle just makes connect fail.
  const sessionResumptionCachedAtMsRef = useRef<number>(0);
  // A5: populated by a useEffect after stopConversation/startConversation
  // are both declared. Called from the onmessage `goAway` branch to trigger
  // a stop + restart cycle that reuses the cached resumption handle. Ref
  // indirection avoids the `const`-before-declaration circular reference
  // between startConversation (which contains the goAway handler) and
  // stopConversation (declared after it).
  const reconnectRef = useRef<(() => void) | null>(null);
  // A7 — AC 2.1-2.5 evidence timestamps. Stamped/cleared at the following
  // sites so Wave B device runs can harvest p50/p99 for the verification
  // matrix (docs/qa/realtime-voice-acceptance.md). All in-memory, COPPA-safe.
  //   sessionRequestStartMsRef  — stamped at POST /gemini/token        (AC 2.1)
  //   sessionWsOpenMsRef        — stamped in onopen (Live connected)   (AC 2.1/2.4)
  //   firstAudioAtMsRef         — stamped on first inbound audio chunk (AC 2.4)
  //   interruptDetectedMsRef    — stamped on server barge-in signal    (AC 2.5)
  const sessionRequestStartMsRef = useRef<number | null>(null);
  const sessionWsOpenMsRef = useRef<number | null>(null);
  const firstAudioAtMsRef = useRef<number | null>(null);
  const interruptDetectedMsRef = useRef<number | null>(null);

  const store = useVoiceAssistantStore;

  const shouldUseNativeMic = useCallback(
    () => VoiceMic.isAvailable && (Platform.OS !== 'ios' || Config.VOICE_FORCE_NATIVE_IOS),
    [],
  );

  useEffect(() => {
    return () => {
      stopConversation();
      playbackRef.current?.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logTelemetry = useCallback((event: string, details?: Record<string, unknown>) => {
    if (!__DEV__) return;
    const sid = sessionIdRef.current || 'n/a';
    if (details) {
      console.info(`[GeminiSession:${sid}] ${event}`, details);
    } else {
      console.info(`[GeminiSession:${sid}] ${event}`);
    }
  }, []);

  const startConversation = useCallback(async () => {
    const { state, transition, setError } = store.getState();
    if (state !== 'IDLE' && state !== 'ERROR') return;
    sessionIdRef.current += 1;
    isUserTalkingRef.current = false;
    simulatorRunIdRef.current += 1;
    if (simulatorReplyTimerRef.current) {
      clearTimeout(simulatorReplyTimerRef.current);
      simulatorReplyTimerRef.current = null;
    }
    logTelemetry('session_start', { isDevice: Device.isDevice, platform: Platform.OS });

    // Simulator fallback (non-device)
    if (!Device.isDevice) {
      const runId = simulatorRunIdRef.current;
      logTelemetry('simulator_fallback_start');
      transition('CONNECTING');
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
      s.transition('PLAYING_AI_AUDIO');
      simulatorReplyTimerRef.current = setTimeout(() => {
        if (simulatorRunIdRef.current !== runId) return;
        const current = store.getState();
        current.addMessage('ai', aiText);
        current.stopSession();
        simulatorReplyTimerRef.current = null;
      }, 1200);
      return;
    }

    // 1. Request mic permission
    transition('REQUESTING_MIC_PERMISSION');
    logTelemetry('mic_permission_requested');
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setError('C\u1ea7n quy\u1ec1n micro \u0111\u1ec3 tr\u00f2 chuy\u1ec7n.');
        transition('ERROR');
        return;
      }
      logTelemetry('mic_permission_granted');
    } catch {
      setError('Kh\u00f4ng th\u1ec3 y\u00eau c\u1ea7u quy\u1ec1n micro.');
      transition('ERROR');
      return;
    }

    // 2. Fetch API key from backend via the shared axios client. The axios
    // client's response interceptor (src/api/client.ts) handles 401 →
    // refreshAuthTokens → retry, so a naturally-expired JWT here is
    // transparent rather than a hard failure. The prior plain `fetch`
    // path skipped that interceptor and surfaced as "Không thể kết nối
    // Gemini" (2026-04-23 regression).
    transition('CONNECTING');
    let apiKey: string;
    // A7 AC 2.1: wall-clock t=0 for the session-start latency measurement.
    // onopen below computes p50/p99 contributors from this anchor.
    sessionRequestStartMsRef.current = Date.now();
    sessionWsOpenMsRef.current = null;
    firstAudioAtMsRef.current = null;
    try {
      logTelemetry('token_fetch_start');
      const resp = await apiClient.post<{ token?: string }>(
        '/gemini/token',
        {},
        { timeout: TOKEN_FETCH_TIMEOUT_MS },
      );
      const data = resp.data;
      if (!data?.token || typeof data.token !== 'string') {
        throw new Error('Token response missing token');
      }
      apiKey = data.token;
      logTelemetry('token_fetch_success', {
        tokenType: apiKey.startsWith('AIza') ? 'api_key' : 'ephemeral_token',
      });
    } catch (err) {
      logTelemetry('token_fetch_failed', {
        message: err instanceof Error ? err.message : 'unknown',
      });
      setError('Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i Gemini. Vui l\u00f2ng th\u1eed l\u1ea1i.');
      transition('ERROR');
      return;
    }

    // 2b. Claim the native audio session before any playback / mic capture
    // touches AudioManager. Sets MODE_IN_COMMUNICATION, requests exclusive
    // focus, forces the speaker route. Silent no-op if the native module
    // isn't linked (iOS today) — expo-audio's setAudioModeAsync still runs
    // further down as the fallback path.
    if (VoiceSession.isAvailable) {
      try {
        await VoiceSession.start();
        voiceSessionStartedRef.current = true;
        voiceSessionUnsubsRef.current.push(
          VoiceSession.onStateChange((evt) => {
            logTelemetry('voice_session_state', { state: evt.state, reason: evt.reason, route: evt.route });
            if (evt.state === 'transientLoss' || evt.state === 'lost') {
              // Pause playback so the ducked-under-us burst doesn't pile up;
              // native writer thread will resume on AUDIOFOCUS_GAIN.
              playbackRef.current?.interrupt();
            }
          }),
          VoiceSession.onRouteChange((evt) => {
            logTelemetry('voice_route', { route: evt.route, device: evt.deviceName });
          }),
          // P0-5b: after a destructive recovery (media-services reset
          // today, interruption/foreground later), AVAudioEngine units
          // are invalidated and any stale tap/player handle produces
          // silent output. Tear down + re-init the audio layers from JS
          // — simpler than cross-native coupling. Capture loop is
          // driven by _startAudioCapture and will re-arm on the next
          // enqueue/feed call.
          VoiceSession.onSessionRecovered(async (evt) => {
            logTelemetry('voice_session_recovered', { reason: evt.reason });
            if (isCapturingRef.current) {
              _stopAudioCapture();
            }
            await playbackRef.current?.interrupt();
            // Capture re-arm: wait one tick so the native session settles,
            // then restart capture if the FSM is still in an active state.
            setTimeout(() => {
              const s = store.getState().state;
              if (s === 'LISTENING' || s === 'STREAMING_INPUT' || s === 'WAITING_AI' || s === 'PLAYING_AI_AUDIO') {
                _startAudioCapture();
              }
            }, 50);
          }),
        );
      } catch (err) {
        logTelemetry('voice_session_start_failed', {
          message: err instanceof Error ? err.message : 'unknown',
        });
      }
    }

    // 3. Init playback service
    if (!playbackRef.current) {
      playbackRef.current = new AudioPlaybackService();
    }
    playbackRef.current.onPlaybackFinish(() => {
      if (__DEV__) console.info(`[voice-native:turn] onPlaybackFinish fired, state=${store.getState().state}`);
      const s = store.getState();
      const metrics = playbackRef.current?.getTurnMetrics();
      if (metrics) logTelemetry('turn_metrics', { ...metrics });
      if (s.state === 'PLAYING_AI_AUDIO') {
        s.transition('LISTENING');
        logTelemetry('playback_finished_to_listening');
      }
    });
    // Fire FSM transition on first *played* sample (plan §2.7 item 1):
    // the prebuffer window is represented as WAITING_AI so the avatar shows
    // "thinking" with no silent-mouth gap.
    playbackRef.current.onPlaybackStart(() => {
      if (__DEV__) console.info('[voice-native:turn] onPlaybackStart fired');
      // T4.5: voiceTtfa — time from user-speech-end to first *played* sample.
      // Null-ref means the server responded before our 600 ms silence
      // hangover fired (fast-turn / interrupt) — skip the metric rather
      // than log a bogus value.
      if (userSpeechEndMsRef.current !== null) {
        const ttfaMs = Date.now() - userSpeechEndMsRef.current;
        logTelemetry('voice_ttfa', { ttfaMs });
        userSpeechEndMsRef.current = null;
      }
      const s = store.getState();
      if (s.state === 'WAITING_AI' || s.state === 'STREAMING_INPUT' || s.state === 'LISTENING') {
        s.transition('PLAYING_AI_AUDIO');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        logTelemetry('playback_started_to_playing');
      }
    });
    // Surface buffering state to the UI (subtle glow dim in SukaAvatar).
    playbackRef.current.onBufferingChange((buffering: boolean) => {
      store.getState().setIsBuffering(buffering);
      if (__DEV__) logTelemetry('buffering_change', { buffering });
    });
    // Fatal playback stall: native single-stall recovery failed twice in
    // a row. Tear the session down rather than let the user stare at a
    // silent avatar. A4 (2026-04-24 Wave A hardening).
    playbackRef.current.onFatalStall((payload) => {
      logTelemetry('playback_fatal_stall', { ...payload });
      const s = store.getState();
      s.setError('Phát âm thanh bị gián đoạn, vui lòng thử lại.');
      s.transition('ERROR');
    });
    // iter 2 §2.5 — one-shot poor-network hint. Drives the "mạng yếu"
    // banner; clears on endTurn / interrupt.
    playbackRef.current.onPoorNetwork((poor: boolean) => {
      store.getState().setIsPoorNetwork(poor);
      if (__DEV__) logTelemetry('poor_network_change', { poor });
    });
    playbackRef.current.onAudioModeChange((mode: 'fast' | 'cautious' | 'full_buffer' | 'unknown') => {
      store.getState().setAudioMode(mode);
      if (__DEV__) logTelemetry('audio_mode_change', { mode });
    });

    // Pre-warm the native AudioTrack while we're negotiating the WSS so the
    // first Gemini audio chunk just needs one write(), not Builder + play().
    // Swallow errors — prewarm failures only mean the first chunk pays the
    // usual init cost, they don't break playback.
    // prewarm only exists on PcmStreamPlayer (Android native); expo-audio
    // iOS path lazy-allocates per chunk so no prewarm needed.
    //
    // IMPORTANT: skip prewarm on the iOS native-mic path. SharedVoiceEngine's
    // voiceProcessing flag is sticky for an engine lifetime. If playback
    // prewarm wins the race, PcmStream starts the engine with
    // `voiceProcessing=false`, and the later `VoiceMic.start(aec:'hw')` call
    // is forced down to `aecMode:"off"`. That loses HW AEC, so the mic can
    // re-capture speaker output and Gemini may interrupt playback after only
    // the first audible segment.
    if (!(Platform.OS === 'ios' && shouldUseNativeMic())) {
      (playbackRef.current as { prewarm?: () => Promise<void> }).prewarm?.().catch(() => {
        /* non-fatal */
      });
    }

    // 4. Connect using @google/genai SDK (same as web app)
    try {
      const ai = new GoogleGenAI({ apiKey });
      logTelemetry('genai_sdk_connect', { model: Config.GEMINI_LIVE_MODEL });

      // T4.2: reuse a recent handle if we have one. Older than
      // HANDLE_MAX_AGE_MS → send a fresh session request instead of
      // tripping the server-side TTL and burning a whole retry cycle.
      const cachedHandle = sessionResumptionHandleRef.current;
      const handleAgeMs = cachedHandle
        ? Date.now() - sessionResumptionCachedAtMsRef.current
        : null;
      const useCachedHandle =
        cachedHandle !== null && handleAgeMs !== null && handleAgeMs < HANDLE_MAX_AGE_MS;
      const resumptionConfig = useCachedHandle
        ? { handle: cachedHandle as string }
        : {};
      logTelemetry('session_resumption_attempt', {
        hasHandle: useCachedHandle,
        handleAgeMs,
      });
      if (cachedHandle && !useCachedHandle) {
        // Cached but expired — drop it before the connect so a later
        // sessionResumptionUpdate isn't compared against stale state.
        sessionResumptionHandleRef.current = null;
        sessionResumptionCachedAtMsRef.current = 0;
      }

      const session = await ai.live.connect({
        model: Config.GEMINI_LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            // BCP-47 hint — without this Gemini Live auto-detects and hallucinates vi input.
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
          // P0-3 ROLLED BACK 2026-04-23 after device testing:
          // explicitly sending `realtimeInputConfig.activityHandling`
          // reproduced "Lỗi kết nối Gemini" (app bounces from LISTENING back
          // to IDLE). START_OF_ACTIVITY_INTERRUPTS remains the Live API's
          // default server-side behaviour, so leaving this field out does NOT
          // disable barge-in — it only avoids the SDK-side config-validation
          // rejection. Model default is restored to 3.1 in config.ts; this
          // rollback is about the field, not the model family.
          // realtimeInputConfig: {
          //   activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
          // },
          // A5 + A6: resumption handle is re-applied on every connect. On a
          // fresh session this resolves to `{}` (no handle) and the server
          // mints a new session; on a goAway-triggered reconnect it carries
          // the last resumable handle cached via `sessionResumptionUpdate`.
          sessionResumption: resumptionConfig,
        },
        callbacks: {
          onopen: () => {
            logTelemetry('live_connected');
            // A7 AC 2.1: session-start latency = WS-open time - request start.
            // Target: p50 ≤ 800ms, p99 ≤ 1500ms.
            const now = Date.now();
            sessionWsOpenMsRef.current = now;
            if (sessionRequestStartMsRef.current !== null) {
              logTelemetry('session_start_latency_ms', {
                latencyMs: now - sessionRequestStartMsRef.current,
              });
            }
            store.getState().transition('LISTENING');
            _startAudioCapture();
          },
          onmessage: (message: any) => {
            // Handle audio chunks from AI. FSM transition to PLAYING_AI_AUDIO
            // is deferred to `onPlaybackStart` (fires on first *played*
            // sample, not first received) — avoids the silent-mouth gap
            // during the adaptive prebuffer window. See plan §2.7.
            const audioParts = extractInlineAudioParts(message.serverContent);
            if (audioParts.length > 0 && playbackRef.current) {
              // A7 AC 2.4: first-audio latency measured once per session,
              // from WS-open to the first RECEIVED audio chunk (distinct
              // from voice_ttfa which measures user-speech-end → played).
              // Target: p50 ≤ 600ms, p99 ≤ 1200ms.
              if (firstAudioAtMsRef.current === null && sessionWsOpenMsRef.current !== null) {
                const now = Date.now();
                firstAudioAtMsRef.current = now;
                logTelemetry('first_audio_received_latency_ms', {
                  latencyMs: now - sessionWsOpenMsRef.current,
                });
              }
              const s = store.getState();
              if (s.state === 'STREAMING_INPUT') {
                if (s.userTranscript) s.addMessage('user', s.userTranscript);
                s.transition('WAITING_AI');
              }

              // P0-7 turn-generation fence: if a concurrent interrupt
              // (user tap or serverContent.interrupted) bumps the
              // generation mid-iteration, drop remaining chunks rather
              // than bleeding them onto the new turn. Cheap pointer read
              // per chunk; no bridge hop.
              const turnAtEnqueue = playbackRef.current.turnGeneration;
              for (const base64Audio of audioParts) {
                if (playbackRef.current.turnGeneration !== turnAtEnqueue) break;
                // Feed straight into the native AudioTrack — no buffering, no
                // WAV wrapping. The native module keeps one continuous PCM
                // stream open so chunk boundaries are inaudible.
                playbackRef.current.enqueue(base64Audio);
              }
              store.getState().setAudioLevel(playbackRef.current.audioLevel);
            }

            // Handle interruption from server
            if (message.serverContent?.interrupted && playbackRef.current) {
              logTelemetry('live_interrupted');
              // A7 AC 2.5: server barge-in detected → playback actually
              // cleared. Target: p50 ≤ 250ms, p99 ≤ 500ms. Await-then-log
              // (interrupt() resolves once native Native.clear() returns).
              const detectedAtMs = Date.now();
              interruptDetectedMsRef.current = detectedAtMs;
              const player = playbackRef.current;
              player.interrupt().then(() => {
                logTelemetry('interrupt_server_latency_ms', {
                  latencyMs: Date.now() - detectedAtMs,
                });
              }).catch((err) => {
                jsErrorBreadcrumb('gemini.interrupt.server', err);
              });
              const s = store.getState();
              if (s.aiTranscript) s.addMessage('ai', s.aiTranscript, true);
              s.setAiTranscript('');
              if (s.state === 'PLAYING_AI_AUDIO') {
                s.transition('INTERRUPTED');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeout(() => {
                  if (store.getState().state === 'INTERRUPTED') {
                    store.getState().transition('LISTENING');
                  }
                }, 400);
              }
            }

            // Handle user input transcription (append chunks)
            // Suppress during AI playback to prevent late transcription from appearing after AI response
            const inputTranscription = message.serverContent?.inputTranscription;
            if (inputTranscription?.text && store.getState().state !== 'PLAYING_AI_AUDIO') {
              const s = store.getState();
              const newText = s.userTranscript + inputTranscription.text;
              s.setUserTranscript(newText);
              logTelemetry('input_transcript', { text: inputTranscription.text, total: newText.length });
            }

            // Debug: log all serverContent keys to find transcription
            if (message.serverContent && !message.serverContent?.modelTurn) {
              const keys = Object.keys(message.serverContent);
              if (keys.length > 0) {
                logTelemetry('server_content_keys', { keys: keys.join(',') });
              }
            }

            // Handle AI output transcription (append chunks)
            const outputTranscription = message.serverContent?.outputTranscription;
            if (outputTranscription?.text) {
              // Detect expression from action tags (presentation-only)
              const expr = detectExpression(outputTranscription.text);
              if (expr) {
                store.getState().setExpressionOverride(expr);
                setTimeout(() => {
                  if (store.getState().expressionOverride === expr) {
                    store.getState().setExpressionOverride(null);
                  }
                }, 2500);
              }
              // iter 2 §2.3 — phrase-aware flush hint. When the transcript
              // delivers a sentence terminator, let the playback service
              // try to land the next segment boundary at that phrase end.
              // Safe: the service is a no-op when the policy flag is off
              // and when there is no pending buffered audio to flush.
              if (/[.!?。？！\n]/.test(outputTranscription.text)) {
                playbackRef.current?.markSentenceBoundary();
              }
              const s = store.getState();
              const newText = s.aiTranscript + outputTranscription.text;
              s.setAiTranscript(newText);
              logTelemetry('output_transcript', { chars: outputTranscription.text.length });
            }

            // Handle turn complete
            if (message.serverContent?.turnComplete) {
              if (__DEV__) console.info('[voice-native:turn] turnComplete from Gemini → endTurn');
              logTelemetry('live_turn_complete', {
                aiTranscriptChars: store.getState().aiTranscript.length,
              });
              playbackRef.current?.endTurn();
              const s = store.getState();
              if (s.userTranscript) s.addMessage('user', s.userTranscript);
              if (s.aiTranscript) s.addMessage('ai', s.aiTranscript);
              s.setAiTranscript('');
              isUserTalkingRef.current = false;
              if (!playbackRef.current?.isPlaying) {
                s.transition('LISTENING');
              }
            }

            // T4.2: cache every resumable handle the server offers. Only
            // valid while `resumable=true`; non-resumable updates (model
            // generating, tool-call in flight) are logged for visibility
            // but don't overwrite the last good handle.
            if (message.sessionResumptionUpdate) {
              const update = message.sessionResumptionUpdate;
              if (update.resumable && update.newHandle) {
                sessionResumptionHandleRef.current = update.newHandle;
                sessionResumptionCachedAtMsRef.current = Date.now();
                logTelemetry('session_resumption_cached', {
                  handlePresent: true,
                });
              } else {
                logTelemetry('session_resumption_non_resumable', {
                  resumable: !!update.resumable,
                });
              }
            }

            // goAway is the server's early warning that this socket will
            // close soon. A5: trigger a stop+restart cycle that reuses the
            // cached resumption handle — the server mints a new backing
            // session, we present the same handle, conversation state is
            // preserved. Only reconnect from active states; if we're
            // already ERROR or IDLE the user-facing flow already handled it.
            if (message.goAway) {
              logTelemetry('live_go_away', {
                timeLeftMs: message.goAway.timeLeft,
              });
              const s = store.getState();
              if (
                s.state === 'LISTENING' ||
                s.state === 'STREAMING_INPUT' ||
                s.state === 'WAITING_AI' ||
                s.state === 'PLAYING_AI_AUDIO' ||
                s.state === 'INTERRUPTED'
              ) {
                logTelemetry('live_go_away_reconnect');
                s.transition('RECONNECTING');
                // Defer to next tick so this onmessage callback returns
                // before we tear the session down under it.
                setTimeout(() => {
                  reconnectRef.current?.();
                }, 0);
              }
            }
          },
          onclose: () => {
            logTelemetry('live_disconnected');
            const s = store.getState();
            if (s.state !== 'IDLE' && s.state !== 'ERROR') {
              s.stopSession();
            }
          },
          onerror: (error: any) => {
            // Surface as much as Gemini/SDK gives us — prior "Lỗi kết nối
            // Gemini" debugging sessions had only the fallback string
            // because `error.message` was empty. Log code/reason/type too.
            const detail = {
              message: error?.message ?? null,
              code: error?.code ?? null,
              reason: error?.reason ?? null,
              type: error?.type ?? null,
              status: error?.status ?? null,
              errorString: error ? String(error) : null,
            };
            logTelemetry('live_error', detail);
            if (__DEV__) console.warn('[GeminiSession] live_error detail:', detail);
            sessionResumptionHandleRef.current = null;
            sessionResumptionCachedAtMsRef.current = 0;
            const shownError =
              detail.message ||
              detail.reason ||
              detail.code ||
              detail.errorString ||
              'L\u1ed7i k\u1ebft n\u1ed1i Gemini';
            store.getState().setError(shownError);
            store.getState().transition('ERROR');
          },
        },
      });

      sessionRef.current = session;
      logTelemetry('session_connected');
    } catch (err) {
      logTelemetry('genai_connect_failed', {
        message: err instanceof Error ? err.message : 'unknown',
      });
      store.getState().setError('Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i Gemini Live.');
      store.getState().transition('ERROR');
    }
  }, [logTelemetry, options.voiceName, options.systemInstruction, shouldUseNativeMic]);

  const stopConversation = useCallback(() => {
    logTelemetry('session_stop_requested', { state: store.getState().state });
    simulatorRunIdRef.current += 1;
    if (simulatorReplyTimerRef.current) {
      clearTimeout(simulatorReplyTimerRef.current);
      simulatorReplyTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    _stopAudioCapture();
    playbackRef.current?.interrupt();

    // Dispose + null the player so the next startConversation() gets a
    // fresh instance with fresh native subscriptions. Without this, the
    // drain/stall emitter subscriptions leaked across start→stop→start
    // cycles. Fire-and-forget, consistent with interrupt() above. A4.
    const disposingPlayback = playbackRef.current;
    playbackRef.current = null;
    disposingPlayback?.dispose().catch((err) => {
      jsErrorBreadcrumb('pcmStream.dispose', err);
    });

    // Disconnect SDK session
    try {
      sessionRef.current?.close();
    } catch (err) {
      jsErrorBreadcrumb('gemini.session.close', err);
    }
    sessionRef.current = null;

    // Release the native audio session last — after mic + WS are down so the
    // OS sees a clean ordered teardown (avoids a brief moment where we still
    // hold focus while nothing plays, which MIUI misinterprets as a hang).
    for (const unsub of voiceSessionUnsubsRef.current) {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    }
    voiceSessionUnsubsRef.current = [];
    if (voiceSessionStartedRef.current) {
      voiceSessionStartedRef.current = false;
      VoiceSession.end().catch(() => {
        /* best-effort teardown */
      });
    }

    const s = store.getState();
    if (s.userTranscript) s.addMessage('user', s.userTranscript);
    if (s.aiTranscript) s.addMessage('ai', s.aiTranscript);
    s.setAudioMode('unknown');
    s.stopSession();
    logTelemetry('session_stopped');
  }, [logTelemetry]);

  // A5: reconnect helper installed via ref (see declaration comment).
  // Runs stopConversation → brief tick → startConversation; startConversation
  // already reuses sessionResumptionHandleRef when cached & fresh (line ~331),
  // so the conversation resumes on the server side. AC 2.7 target: ≥95%
  // reconnect success for drops < 5s.
  useEffect(() => {
    reconnectRef.current = () => {
      logTelemetry('session_reconnect_begin');
      stopConversation();
      setTimeout(() => {
        const s = store.getState();
        // Guard: user may have navigated away or manually stopped between
        // the goAway trigger and the restart tick. If we're no longer in
        // IDLE (the state stopConversation leaves us in), do not re-enter.
        if (s.state !== 'IDLE') return;
        startConversation().catch((err) => {
          jsErrorBreadcrumb('gemini.reconnect.start', err);
          store.getState().setError('Kết nối lại thất bại.');
          store.getState().transition('ERROR');
        });
      }, 50);
    };
    return () => {
      reconnectRef.current = null;
    };
  }, [startConversation, stopConversation, logTelemetry, store]);

  // User-initiated barge-in (T3.1). Mirrors the server-initiated interrupt
  // branch in the onmessage handler — same native stop, same transcript
  // commit, same FSM path — but triggered from the screen (tap on avatar).
  // Intentionally does not signal Gemini over the SDK: @google/genai does
  // not expose a client-side interrupt message, and `activityHandling`
  // default (START_OF_ACTIVITY_INTERRUPTS) will cancel the server turn as
  // soon as the user next speaks.
  const interruptPlayback = useCallback(() => {
    const s = store.getState();
    if (s.state !== 'PLAYING_AI_AUDIO') return;
    // T4.5: voiceInterruptLatencyTap — tap→native-clear-returns in ms.
    // Approximates RN-bridge + native stop+reset time; upper bound on
    // audible-silence delay. Promise-chained so we keep interruptPlayback
    // returning void (matches the hook's typed surface).
    const tapMs = Date.now();
    logTelemetry('user_interrupt');
    playbackRef.current
      ?.interrupt()
      .then(() => {
        logTelemetry('voice_interrupt_latency_tap', { latencyMs: Date.now() - tapMs });
      })
      .catch(() => {
        /* interrupt() already swallows native errors — ignore */
      });
    if (s.aiTranscript) s.addMessage('ai', s.aiTranscript, true);
    s.setAiTranscript('');
    s.transition('INTERRUPTED');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      if (store.getState().state === 'INTERRUPTED') {
        store.getState().transition('LISTENING');
      }
    }, 400);
  }, [logTelemetry]);

  // \u2500\u2500\u2500 Audio capture \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const _startAudioCapture = () => {
    if (isCapturingRef.current) return;

    // DEV-only diagnostics probe: 3-second samples of VoiceMic + VoiceSession
    // diagnostics while capturing. Distinguishes A (silent stop) from B
    // (sampleRate shift) from C (transientLoss) from D (engineRunning=false)
    // from E (voiceProcessingEnabled mismatch). No prod impact.
    if (__DEV__) startVoiceDebugProbe();

    try {
      // MB-NATIVE-VOICE-006.5: prefer the native mic module when linked into
      // the target. TEMPORARY: disabled on iOS until we root-cause the
      // on-device issue where `VoiceMicModule.start()` either throws or
      // stops delivering tap frames (2026-04-23). RNLAS still handles
      // iOS mic capture; PcmStreamModule still handles iOS playback.
      //
      // `Config.VOICE_FORCE_NATIVE_IOS` (env: EXPO_PUBLIC_VOICE_FORCE_NATIVE_IOS=true)
      // flips iOS back onto the native path so the on-device repro can emit
      // the `voiceMicStalled` event + `VoiceMic.getDiagnostics()` fields
      // needed to root-cause the disable decision. Default false.
      const useNative = shouldUseNativeMic();
      logTelemetry('audio_capture_init', { backend: useNative ? 'native' : 'rnlas' });

      // Perf: audio chunks arrive at ~50 Hz. Pushing every chunk through a
      // zustand setter floods the JS thread and makes AI audio stutter. We
      // sample RMS cheaply (every 16th byte, still adequate for VAD) and
      // only update the visualiser at 10 Hz.
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

        // Full-duplex: always send audio to Gemini. HW AEC
        // (voiceProcessingIO) removes speaker echo at the mic, and the
        // server's activityHandling: START_OF_ACTIVITY_INTERRUPTS detects
        // barge-in. Muting here defeats both — it was the architectural
        // reason user barge-in was client-side theater (plan §1 issue 3,
        // §5.1.3). P0-4.

        // Send audio to Gemini via SDK. The SDK throws if the WS is mid-close
        // or the session has already errored; we drop the chunk but record
        // a breadcrumb so a post-mortem can tell "silent audio" apart from
        // "WS rejected every frame".
        try {
          sessionRef.current?.sendRealtimeInput({
            audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
          });
        } catch (err) {
          jsErrorBreadcrumb('gemini.sendRealtimeInput', err, {
            state: store.getState().state,
            chunkBytes: base64.length,
          });
        }

        // Cheap RMS: sample every 16th byte (8 samples at 16kHz PCM16 → ~32
        // samples per 20ms chunk is still enough for VAD).
        const bytes = atob(base64);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < bytes.length; i += 16) {
          const sample = (bytes.charCodeAt(i) | (bytes.charCodeAt(i + 1) << 8)) / 32768;
          sum += sample * sample;
          count += 1;
        }
        const rms = count > 0 ? Math.sqrt(sum / count) : 0;

        // Update the visualizer at ~10 Hz to keep the UI animated without
        // flooding zustand subscribers on every native tick.
        const now = Date.now();
        if (now - lastLevelUpdate > LEVEL_UPDATE_INTERVAL_MS) {
          store.getState().setAudioLevel(Math.min(1, rms * 5));
          lastLevelUpdate = now;
        }

        // Track user talking state (unchanged — runs every chunk for fast
        // turn-taking response).
        if (rms > AUDIO_ACTIVITY_THRESHOLD) {
          if (!isUserTalkingRef.current) {
            isUserTalkingRef.current = true;
          }
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          const s = store.getState();
          if (s.state === 'LISTENING') {
            s.transition('STREAMING_INPUT');
          }
        } else {
          if (isUserTalkingRef.current && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              isUserTalkingRef.current = false;
              silenceTimerRef.current = null;
              const s = store.getState();
              if (s.state === 'STREAMING_INPUT') {
                // T4.5: mark end-of-utterance for the TTFA metric. 600 ms
                // silence hangover means the user actually finished speaking
                // 600 ms ago — subtract so TTFA reflects true speech-end.
                userSpeechEndMsRef.current = Date.now() - 600;
                s.transition('WAITING_AI');
              }
            }, 600);
          }
        }
      };

      if (useNative) {
        // IMPORTANT: do NOT call setAudioModeAsync on the native path —
        // VoiceSession already owns AVAudioSession (iOS) / AudioManager
        // (Android). expo-audio's setAudioModeAsync would race our
        // category+mode setup.
        const unsub = VoiceMic.onData(({ data }) => handleMicChunk(data));
        // Watchdog: the native tap stalls silently today when the HAL
        // rejects voiceProcessingIO config. VoiceMicModule fires
        // `voiceMicStalled` after 2s of no frames; without this subscriber
        // the user just sees "mic tự tắt" with no error. Fatal stalls
        // (recovery retry failed) surface as an error banner; non-fatal
        // ones record a breadcrumb so we can correlate with the next chunk.
        const unsubStall = VoiceMic.onStall((evt) => {
          logTelemetry('voice_mic_stalled', {
            lastFrameAgeMs: evt.lastFrameAgeMs,
            fatal: evt.fatal,
          });
          if (evt.fatal) {
            store
              .getState()
              .setError(`Micro mất frame ${Math.round(evt.lastFrameAgeMs)} ms. Tắt/bật lại voice.`);
          }
        });
        VoiceMic.start({
          sampleRate: 16000,
          channels: 1,
          bitsPerSample: 16,
          aec: 'hw',
        })
          .then(() => {
            isCapturingRef.current = true;
            audioStreamRef.current = {
              stop: () => {
                unsub();
                unsubStall();
                return VoiceMic.stop();
              },
            };
            logTelemetry('audio_capture_started', { sampleRate: 16000, backend: 'native' });
          })
          .catch((err: unknown) => {
            unsub();
            unsubStall();
            logTelemetry('audio_capture_start_failed', {
              backend: 'native',
              err: String(err),
            });
            store.getState().setError('Micro không khả dụng.');
            store.getState().transition('ERROR');
          });
      } else {
        // Legacy react-native-live-audio-stream path (Android until 006 ships,
        // iOS when VoiceMicModule is not linked into the build).
        const LiveAudioStream = require('react-native-live-audio-stream').default;
        LiveAudioStream.init({
          sampleRate: 16000,
          channels: 1,
          bitsPerSample: 16,
          // VOICE_RECOGNITION (6). Was VOICE_COMMUNICATION (7) but that forces
          // Android audio session into phone-call profile, so AI playback was
          // being routed to the earpiece + downsampled to 16 kHz — the
          // distortion you hear as "rè". VOICE_RECOGNITION still applies
          // speech-optimised gain/noise processing for the mic but leaves the
          // output path on the media profile (speaker, 48 kHz DAC).
          audioSource: 6,
        });

        LiveAudioStream.on('data', handleMicChunk);

        setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
          .then(() => {
            try {
              LiveAudioStream.start();
              isCapturingRef.current = true;
              audioStreamRef.current = LiveAudioStream;
              logTelemetry('audio_capture_started', { sampleRate: 16000, backend: 'rnlas' });
            } catch (startErr: unknown) {
              const msg = startErr instanceof Error ? startErr.message : String(startErr);
              logTelemetry('audio_capture_start_threw', { backend: 'rnlas', err: msg });
              store.getState().setError(`Không thể bật micro: ${msg}`);
              store.getState().transition('ERROR');
              return;
            }
            // RNLAS's iOS impl sets AVAudioSession to `.voiceChat`,
            // which mutes AVAudioPlayerNode output. `reapplyCategory`
            // flips it back to `.default` WITHOUT setActive(false/true),
            // so RNLAS's AudioQueue keeps capturing. (forceRecover is
            // too heavy here — it deactivates the session and stalls
            // the AudioQueue, verified 2026-04-23.)
            if (VoiceSession.isAvailable) {
              void VoiceSession.reapplyCategory()
                .then((ok) => {
                  logTelemetry('voice_session_reapply_category', { ok });
                })
                .catch((err: unknown) => {
                  logTelemetry('voice_session_reapply_failed', {
                    message: err instanceof Error ? err.message : String(err),
                  });
                });
            }
          })
          .catch((err: unknown) => {
            // P0-fix 2026-04-23: setAudioModeAsync rejection was silent
            // before this catch — LiveAudioStream.start() never ran and
            // isCapturingRef stayed false, so the mic looked like it
            // "auto-turned-off" with no error banner. Now surfaced.
            const msg = err instanceof Error ? err.message : String(err);
            logTelemetry('audio_mode_set_failed', { backend: 'rnlas', err: msg });
            store.getState().setError(`Micro không khả dụng: ${msg}`);
            store.getState().transition('ERROR');
          });
      }
    } catch {
      logTelemetry('audio_capture_unavailable');
      store.getState().setError('Micro kh\u00f4ng kh\u1ea3 d\u1ee5ng.');
      store.getState().transition('ERROR');
    }
  };

  const _stopAudioCapture = () => {
    if (!isCapturingRef.current) return;
    try {
      audioStreamRef.current?.stop();
    } catch {}
    if (__DEV__) stopVoiceDebugProbe();
    logTelemetry('audio_capture_stopped');
    isCapturingRef.current = false;
    audioStreamRef.current = null;
    store.getState().setAudioLevel(0);
  };

  return { startConversation, stopConversation, interruptPlayback };
}
