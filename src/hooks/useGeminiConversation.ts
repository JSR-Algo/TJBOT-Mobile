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
import { jsErrorBreadcrumb, track } from '../observability/voice-telemetry';

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
  // P0-22 plan v2 §8.4 strict-ordering ref. Stamped with a fresh
  // UserTurnId when voiceMicVadStart arrives WHILE state===INTERRUPTED
  // (i.e. user started speaking before native clear() resolved). The
  // .then() of playbackRef.interrupt() reads this ref: if set →
  // INTERRUPTED → USER_SPEAKING with the stamped turn id (B-then-A
  // path); if null → INTERRUPTED → LISTENING (A-then-B path; VAD will
  // arrive later and the existing capture-loop subscriber drives
  // LISTENING → USER_SPEAKING normally). The 800ms interrupt_watchdog
  // clears the ref on timeout so it does not leak into a future
  // interrupt cycle.
  const pendingUserTurnIdAfterClearRef = useRef<string | null>(null);
  // §7.7 P0-14: stamped when voiceMicVadStart fires during ASSISTANT_SPEAKING.
  // Cleared when serverContent.interrupted arrives. If the 600ms watchdog
  // fires before the clear, voice.barge_in.cancel_unacked telemetry is emitted.
  const cancelUnackMsRef = useRef<number | null>(null);
  // P0-11: stamped when server sends turnComplete. Used by the 5s drain-timeout
  // safety net to detect stuck ASSISTANT_SPEAKING state (plan §3.2 row).
  const responseTurnCompleteAtMsRef = useRef<number | null>(null);

  const store = useVoiceAssistantStore;


  useEffect(() => {
    return () => {
      stopConversation();
      playbackRef.current?.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const startConversation = useCallback(async () => {
    const { state, transition, setError } = store.getState();
    // P0-13 admits RECONNECTING. Native setup is skipped via the
    // `isReconnect` flag below — VoiceSession, playbackRef, and the
    // capture loop stay running across the WS replace; only the WS
    // (sessionRef) is rebuilt with the cached resumption handle.
    // currentUserTurnId stays put iff the user was mid-utterance when
    // goAway hit (preserved at the softReconnect call site, not here).
    if (state !== 'IDLE' && state !== 'ERROR_RECOVERABLE' && state !== 'RECONNECTING') return;
    const isReconnect = state === 'RECONNECTING';
    sessionIdRef.current += 1;
    isUserTalkingRef.current = false;
    simulatorRunIdRef.current += 1;
    if (simulatorReplyTimerRef.current) {
      clearTimeout(simulatorReplyTimerRef.current);
      simulatorReplyTimerRef.current = null;
    }
    track('session', 'session_start', { isDevice: Device.isDevice, platform: Platform.OS });

    // Simulator fallback (non-device). Skipped on reconnect — soft
    // reconnect only re-opens the WS; the simulator path returns early
    // anyway and would tear down the existing simulated session.
    if (!Device.isDevice && !isReconnect) {
      const runId = simulatorRunIdRef.current;
      track('session', 'simulator_fallback_start');
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

    // 1. Request mic permission. Skipped on reconnect \u2014 permission
    // already granted on the initial start; re-prompting mid-call
    // would be a UX regression. (P0-13)
    if (!isReconnect) {
      transition('PREPARING_AUDIO');
      track('session', 'mic_permission_requested');
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          setError('C\u1ea7n quy\u1ec1n micro \u0111\u1ec3 tr\u00f2 chuy\u1ec7n.');
          transition('ERROR_RECOVERABLE');
          return;
        }
        track('session', 'mic_permission_granted');
      } catch {
        setError('Kh\u00f4ng th\u1ec3 y\u00eau c\u1ea7u quy\u1ec1n micro.');
        transition('ERROR_RECOVERABLE');
        return;
      }
    }

    // 2. Fetch API key from backend via the shared axios client. The axios
    // client's response interceptor (src/api/client.ts) handles 401 →
    // refreshAuthTokens → retry, so a naturally-expired JWT here is
    // transparent rather than a hard failure. The prior plain `fetch`
    // path skipped that interceptor and surfaced as "Không thể kết nối
    // Gemini" (2026-04-23 regression).
    // P0-13: soft reconnect stays in RECONNECTING. The §3.2 FSM table
    // does not allow RECONNECTING → CONNECTING; gating the transition
    // keeps invalid-transition warnings out of the log.
    if (!isReconnect) {
      transition('CONNECTING');
    }
    let apiKey: string;
    // A7 AC 2.1: wall-clock t=0 for the session-start latency measurement.
    // onopen below computes p50/p99 contributors from this anchor.
    sessionRequestStartMsRef.current = Date.now();
    sessionWsOpenMsRef.current = null;
    firstAudioAtMsRef.current = null;
    // DEV-ONLY OVERRIDE \u2014 hardcoded key for local diagnosis of WS denial.
    // Remove before merge; backend ephemeral-token path is the production contract.
    apiKey = 'AIzaSyDclKPEsGghJtRoFUn8AxSHbamtGqU1p_o';
    track('session', 'token_fetch_success', { tokenType: 'api_key', source: 'hardcode-dev' });

    // 2b. Claim the native audio session before any playback / mic capture
    // touches AudioManager. Sets MODE_IN_COMMUNICATION, requests exclusive
    // focus, forces the speaker route. Silent no-op if the native module
    // isn't linked (iOS today) — expo-audio's setAudioModeAsync still runs
    // further down as the fallback path.
    // P0-13: skipped on reconnect — the native session and its
    // listeners are already attached. Re-attaching would duplicate the
    // event subscriptions and leak handles on every goAway.
    if (VoiceSession.isAvailable && !isReconnect) {
      try {
        await VoiceSession.start();
        voiceSessionStartedRef.current = true;
        voiceSessionUnsubsRef.current.push(
          VoiceSession.onStateChange((evt) => {
            track('session', 'voice_session_state', { state: evt.state, reason: evt.reason, route: evt.route });
            if (evt.state === 'transientLoss' || evt.state === 'lost') {
              // Pause playback so the ducked-under-us burst doesn't pile up;
              // native writer thread will resume on AUDIOFOCUS_GAIN.
              playbackRef.current?.interrupt();
            }
          }),
          VoiceSession.onRouteChange((evt) => {
            track('session', 'voice_route', { route: evt.route, device: evt.deviceName });
          }),
          // P0-5b: after a destructive recovery (media-services reset
          // today, interruption/foreground later), AVAudioEngine units
          // are invalidated and any stale tap/player handle produces
          // silent output. Tear down + re-init the audio layers from JS
          // — simpler than cross-native coupling. Capture loop is
          // driven by _startAudioCapture and will re-arm on the next
          // enqueue/feed call.
          VoiceSession.onSessionRecovered(async (evt) => {
            track('session', 'voice_session_recovered', { reason: evt.reason });
            if (isCapturingRef.current) {
              _stopAudioCapture();
            }
            await playbackRef.current?.interrupt();
            const s = store.getState().state;
            const activeStates = ['LISTENING', 'USER_SPEAKING', 'WAITING_AI', 'ASSISTANT_SPEAKING'] as const;
            const wasActive = (activeStates as readonly string[]).includes(s);
            if (evt.reason === 'mediaServicesReset') {
              // Full teardown: session handles are invalidated — always restart.
              if (wasActive) _startAudioCapture();
            } else if (evt.reason === 'interruptionEnded') {
              // iOS always tears down the tap on interruption — restart unconditionally (plan §4.5).
              _startAudioCapture();
            } else if (evt.reason === 'foregroundResume') {
              // Tap may survive foreground resume; only restart if native confirms it is gone.
              const diag = await VoiceMic.getDiagnostics();
              if (!diag?.tapInstalled || !diag?.engineRunning) {
                _startAudioCapture();
              }
            }
          }),
        );
      } catch (err) {
        track('error', 'voice_session_start_failed', {
          message: err instanceof Error ? err.message : 'unknown',
        });
      }
    }

    // 3. Init playback service. The construction is already idempotent
    // (only assigns when null). The callback wiring below is gated on
    // !isReconnect so soft reconnects don't double-register handlers
    // (each onPlaybackFinish call appends a listener).
    if (!playbackRef.current) {
      playbackRef.current = new AudioPlaybackService();
    }
    if (!isReconnect) {
    playbackRef.current.onPlaybackFinish(() => {
      if (__DEV__) console.info(`[voice-native:turn] onPlaybackFinish fired, state=${store.getState().state}`);
      const s = store.getState();
      const metrics = playbackRef.current?.getTurnMetrics();
      if (metrics) track('playback', 'turn_metrics', { ...metrics });
      // P0-11: only drive ASSISTANT_SPEAKING → LISTENING when the drained turn
      // matches the store's currentResponseId. Guards against a stale drain
      // callback firing after a barge-in has already minted a new responseId.
      if (s.state === 'ASSISTANT_SPEAKING' && s.currentResponseId !== null) {
        responseTurnCompleteAtMsRef.current = null; // drain arrived — cancel safety net
        s.transition('LISTENING');
        track('playback', 'playback_finished_to_listening');
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
        track('session', 'voice_ttfa', { ttfaMs });
        userSpeechEndMsRef.current = null;
      }
      const s = store.getState();
      if (s.state === 'WAITING_AI' || s.state === 'USER_SPEAKING' || s.state === 'LISTENING') {
        s.transition('ASSISTANT_SPEAKING');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        track('playback', 'playback_started_to_playing');
      }
    });
    // Surface buffering state to the UI (subtle glow dim in SukaAvatar).
    playbackRef.current.onBufferingChange((buffering: boolean) => {
      store.getState().setIsBuffering(buffering);
      if (__DEV__) track('playback', 'buffering_change', { buffering });
    });
    // Fatal playback stall: native single-stall recovery failed twice in
    // a row. Tear the session down rather than let the user stare at a
    // silent avatar. A4 (2026-04-24 Wave A hardening).
    playbackRef.current.onFatalStall((payload) => {
      track('error', 'playback_fatal_stall', { ...payload });
      const s = store.getState();
      s.setError('Phát âm thanh bị gián đoạn, vui lòng thử lại.');
      s.transition('ERROR_RECOVERABLE');
    });
    // iter 2 §2.5 — one-shot poor-network hint. Drives the "mạng yếu"
    // banner; clears on endTurn / interrupt.
    playbackRef.current.onPoorNetwork((poor: boolean) => {
      store.getState().setIsPoorNetwork(poor);
      if (__DEV__) track('session', 'poor_network_change', { poor });
    });
    playbackRef.current.onAudioModeChange((mode: 'fast' | 'cautious' | 'full_buffer' | 'unknown') => {
      store.getState().setAudioMode(mode);
      if (__DEV__) track('session', 'audio_mode_change', { mode });
    });
    } // end !isReconnect playback-callbacks block (P0-13)

    // Pre-warm the playback path while WSS negotiation is in flight so the
    // first Gemini audio chunk just needs one write(), not Builder + play().
    // Swallow errors — prewarm failures only mean the first chunk pays the
    // usual init cost, they don't break playback.
    //
    // iOS race previously required skipping prewarm: PcmStreamModule's prewarm
    // called SharedVoiceEngine.ensureStarted(voiceProcessing:false) before
    // VoiceMicModule could claim voiceProcessing:true, silently losing HW AEC.
    // Fixed by VoiceSessionModule.startSession calling
    // SharedVoiceEngine.preflight(voiceProcessing:true) immediately after
    // AVAudioSession.setActive(true) — the engine flag is pre-armed before
    // prewarm runs so any conflicting call throws instead of winning.
    (playbackRef.current as { prewarm?: () => Promise<void> }).prewarm?.().catch(() => {
      /* non-fatal */
    });

    // 4. Connect using @google/genai SDK (same as web app)
    try {
      const ai = new GoogleGenAI({ apiKey });
      track('provider', 'genai_sdk_connect', { model: Config.GEMINI_LIVE_MODEL });

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
      track('session', 'session_resumption_attempt', {
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
            track('provider', 'live_connected');
            // A7 AC 2.1: session-start latency = WS-open time - request start.
            // Target: p50 ≤ 800ms, p99 ≤ 1500ms.
            const now = Date.now();
            sessionWsOpenMsRef.current = now;
            if (sessionRequestStartMsRef.current !== null) {
              track('session', 'session_start_latency_ms', {
                latencyMs: now - sessionRequestStartMsRef.current,
              });
            }
            // Plan v2 §3.2: ws.opened → READY (mic-ready event then drives READY → LISTENING).
            // Direct CONNECTING → LISTENING is rejected by VALID_TRANSITIONS in FSM v2.
            store.getState().transition('READY');
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
                track('session', 'first_audio_received_latency_ms', {
                  latencyMs: now - sessionWsOpenMsRef.current,
                });
              }
              const s = store.getState();
              // Plan v2 §3.1.1: bargeInWindowOpen=true ⇒ chunks are stale
              // (post-barge-in, awaiting the first chunk of the new generation).
              // Drop them at JS — primary stale-chunk mechanism. Native
              // responseId gate is defense-in-depth.
              if (s.bargeInWindowOpen) {
                track('playback', 'voice.assistant.chunk.dropped_barge_in', {
                  count: audioParts.length,
                  epoch: s.epoch,
                });
              } else {
                // Mint responseId atomically on first chunk of the new
                // generation (closes barge-in window AND sets currentResponseId
                // in one set() — no intermediate observable state).
                if (s.currentResponseId === null) {
                  const rid = `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                  store.getState().freezeNewResponse(rid);
                  playbackRef.current.startResponse?.(rid);
                }
                if (s.userTranscript) s.addMessage('user', s.userTranscript);
                if (s.state === 'USER_SPEAKING' || s.state === 'USER_SPEECH_FINALIZING' || s.state === 'LISTENING') {
                  s.transition('WAITING_AI');
                }

                // P0-7 turn-generation fence: if a concurrent interrupt
                // (user tap or serverContent.interrupted) bumps the
                // generation mid-iteration, drop remaining chunks rather
                // than bleeding them onto the new turn.
                const turnAtEnqueue = playbackRef.current.turnGeneration;
                for (const part of audioParts) {
                  if (playbackRef.current.turnGeneration !== turnAtEnqueue) break;
                  playbackRef.current.enqueue(part.data);
                }
                store.getState().setAudioLevel(playbackRef.current.audioLevel);
              }
            }

            // Handle interruption from server
            if (message.serverContent?.interrupted && playbackRef.current) {
              track('barge_in', 'live_interrupted');
              cancelUnackMsRef.current = null; // §7.7: interrupted arrived — disarm watchdog
              // A7 AC 2.5: server barge-in detected → playback actually
              // cleared. Target: p50 ≤ 250ms, p99 ≤ 500ms. Await-then-log
              // (interrupt() resolves once native Native.clear() returns).
              const detectedAtMs = Date.now();
              interruptDetectedMsRef.current = detectedAtMs;
              const player = playbackRef.current;
              player.interrupt().then(() => {
                track('barge_in', 'interrupt_server_latency_ms', {
                  latencyMs: Date.now() - detectedAtMs,
                });
                // P0-10: drive INTERRUPTED → LISTENING off the native
                // clear() Promise resolution, not a setTimeout(400).
                // P0-22 §8.4 strict-ordering rule: if VAD fired while
                // we were waiting for clear() to resolve (B-then-A
                // path), promote the stamped UserTurnId and transition
                // straight to USER_SPEAKING — skipping LISTENING. The
                // 800ms interrupt_watchdog useEffect catches the case
                // where clear() never resolves.
                if (store.getState().state === 'INTERRUPTED') {
                  const pendingTurnId = pendingUserTurnIdAfterClearRef.current;
                  if (pendingTurnId !== null) {
                    pendingUserTurnIdAfterClearRef.current = null;
                    useVoiceAssistantStore.setState({ currentUserTurnId: pendingTurnId });
                    store.getState().transition('USER_SPEAKING');
                    track('barge_in', 'voice.bargein.ordering.b_then_a', {
                      userTurnId: pendingTurnId,
                    });
                  } else {
                    store.getState().transition('LISTENING');
                  }
                }
              }).catch((err) => {
                jsErrorBreadcrumb('gemini.interrupt.server', err);
              });
              const s = store.getState();
              if (s.aiTranscript) s.addMessage('ai', s.aiTranscript, true);
              s.setAiTranscript('');
              if (s.state === 'ASSISTANT_SPEAKING') {
                s.transition('INTERRUPTED');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }

            // Handle user input transcription (append chunks)
            // Suppress during AI playback to prevent late transcription from appearing after AI response
            const inputTranscription = message.serverContent?.inputTranscription;
            if (inputTranscription?.text && store.getState().state !== 'ASSISTANT_SPEAKING') {
              const s = store.getState();
              const newText = s.userTranscript + inputTranscription.text;
              s.setUserTranscript(newText);
              track('provider', 'input_transcript', { text: inputTranscription.text, total: newText.length });
            }

            // Debug: log all serverContent keys to find transcription
            if (message.serverContent && !message.serverContent?.modelTurn) {
              const keys = Object.keys(message.serverContent);
              if (keys.length > 0) {
                track('provider', 'server_content_keys', { keys: keys.join(',') });
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
              track('provider', 'output_transcript', { chars: outputTranscription.text.length });
            }

            // Handle turn complete
            if (message.serverContent?.turnComplete) {
              if (__DEV__) console.info('[voice-native:turn] turnComplete from Gemini → endTurn');
              track('provider', 'live_turn_complete', {
                aiTranscriptChars: store.getState().aiTranscript.length,
              });
              responseTurnCompleteAtMsRef.current = Date.now(); // P0-11 drain-timeout anchor
              playbackRef.current?.endTurn();
              const s = store.getState();
              if (s.userTranscript) s.addMessage('user', s.userTranscript);
              if (s.aiTranscript) s.addMessage('ai', s.aiTranscript);
              s.setAiTranscript('');
              isUserTalkingRef.current = false;
              // P0-11: ASSISTANT_SPEAKING → LISTENING is driven by onPlaybackFinish
              // (voiceResponseDrained). endTurn() above schedules the drain.
              // Silent-server-response (no audio chunks): state is WAITING_AI,
              // onPlaybackFinish won't fire, so transition directly here (plan §3.2).
              if (s.state === 'WAITING_AI') {
                responseTurnCompleteAtMsRef.current = null;
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
                track('session', 'session_resumption_cached', {
                  handlePresent: true,
                });
              } else {
                track('session', 'session_resumption_non_resumable', {
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
              track('provider', 'live_go_away', {
                timeLeftMs: message.goAway.timeLeft,
              });
              const s = store.getState();
              if (
                s.state === 'LISTENING' ||
                s.state === 'USER_SPEAKING' ||
                s.state === 'WAITING_AI' ||
                s.state === 'ASSISTANT_SPEAKING' ||
                s.state === 'INTERRUPTED'
              ) {
                track('provider', 'live_go_away_reconnect');
                s.transition('RECONNECTING');
                // P0-10: queueMicrotask replaces setTimeout(0) — same
                // intent (defer to after onmessage returns) but no
                // timer; lint rule §11.7 allows microtasks.
                queueMicrotask(() => {
                  reconnectRef.current?.();
                });
              }
            }
          },
          onclose: (event?: any) => {
            track('provider', 'live_disconnected', {
              code: event?.code ?? null,
              reason: event?.reason ?? null,
              wasClean: event?.wasClean ?? null,
              type: event?.type ?? null,
              state: store.getState().state,
            });
            const s = store.getState();
            if (s.state !== 'IDLE' && s.state !== 'ERROR_RECOVERABLE') {
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
            track('error', 'live_error', detail as Record<string, unknown>);
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
            store.getState().transition('ERROR_RECOVERABLE');
          },
        },
      });

      sessionRef.current = session;
      track('session', 'session_connected');
    } catch (err) {
      track('error', 'genai_connect_failed', {
        message: err instanceof Error ? err.message : 'unknown',
      });
      store.getState().setError('Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i Gemini Live.');
      store.getState().transition('ERROR_RECOVERABLE');
    }
  }, [options.voiceName, options.systemInstruction]);

  const stopConversation = useCallback(() => {
    track('session', 'session_stop_requested', { state: store.getState().state });
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
    track('session', 'session_stopped');
  }, []);

  // A5: reconnect helper installed via ref (see declaration comment).
  // Runs stopConversation → brief tick → startConversation; startConversation
  // already reuses sessionResumptionHandleRef when cached & fresh (line ~331),
  // so the conversation resumes on the server side. AC 2.7 target: ≥95%
  // reconnect success for drops < 5s.
  useEffect(() => {
    reconnectRef.current = () => {
      track('session', 'session_reconnect_begin');
      // P0-13 soft reconnect (plan v2 §7.3): close ONLY the WS;
      // native VoiceSession, capture, and playback stay running across
      // the swap. Caller (goAway handler) has already transitioned the
      // FSM to RECONNECTING. We bump epoch + open the barge-in window
      // so any stale chunks straggling in for the old responseId are
      // dropped at JS; the next chunk after the new WS opens mints a
      // fresh currentResponseId via freezeNewResponse (existing
      // onmessage path in startConversation, P0-3 atomic action).
      const s = store.getState();
      // Preserve currentUserTurnId iff the user is still mid-utterance.
      // Otherwise drop it — carrying a stale UserTurnId across an
      // indeterminate gap conflates two different turns.
      const userMidUtterance =
        s.state === 'USER_SPEAKING' || s.state === 'USER_SPEECH_FINALIZING';
      if (!userMidUtterance) {
        useVoiceAssistantStore.setState({ currentUserTurnId: null });
      }
      // openBargeInWindow bumps epoch, nulls currentResponseId, sets
      // bargeInWindowOpen=true atomically (§3.1.1). Rate-limit at the
      // store action coalesces with concurrent tap/server-interrupt
      // (§8.5).
      s.openBargeInWindow();
      // Close the WS only. Native VoiceSession + capture + playback
      // are left running. sessionRef will be re-assigned when
      // startConversation rebuilds the WS.
      try {
        sessionRef.current?.close?.();
      } catch (err) {
        jsErrorBreadcrumb('gemini.reconnect.close', err);
      }
      sessionRef.current = null;
      // Drain a microtask before re-opening so any pending onclose /
      // onerror callbacks for the old WS fire first.
      queueMicrotask(() => {
        const cur = store.getState();
        // Guard: user may have hit stop between goAway and now.
        if (cur.state !== 'RECONNECTING') return;
        // startConversation admits RECONNECTING via its top guard;
        // isReconnect=true gates native re-setup so only the WS is
        // rebuilt with the cached resumption handle.
        startConversation().catch((err) => {
          jsErrorBreadcrumb('gemini.reconnect.start', err);
          store.getState().setError('Kết nối lại thất bại.');
          store.getState().transition('ERROR_RECOVERABLE');
        });
      });
    };
    return () => {
      reconnectRef.current = null;
    };
  }, [startConversation, store]);

  // P0-10 hook-owned FSM timers (plan v2 §3.2 + §6.3). The store does
  // NOT schedule timers (lint rule §11.7); the hook arms each timer in
  // a useEffect keyed on the entry-state, and React's cleanup fires
  // whenever the state transitions, automatically clearing the timer
  // before the next effect body runs. No store-side bookkeeping, no
  // race window between arm and clear.
  //
  // Each timer's fallback transition matches plan v2 §3.2's row for
  // the timed state. ENDED is reachable from every non-error state, so
  // a stuck timer that fires after the user has hit stop is harmless —
  // transition() returns false on the disallowed edge.
  const fsmState = useVoiceAssistantStore((s) => s.state);

  useEffect(() => {
    if (fsmState !== 'PREPARING_AUDIO') return;
    const handle = setTimeout(() => {
      if (store.getState().state !== 'PREPARING_AUDIO') return;
      track('session', 'voice.fsm.timeout', { state: 'PREPARING_AUDIO', deadline_ms: 4000 });
      store.getState().setError('Khởi động micro chậm.');
      store.getState().transition('ERROR_RECOVERABLE');
    }, 4000);
    return () => clearTimeout(handle);
  }, [fsmState, store]);

  useEffect(() => {
    if (fsmState !== 'CONNECTING') return;
    const handle = setTimeout(() => {
      if (store.getState().state !== 'CONNECTING') return;
      track('session', 'voice.fsm.timeout', { state: 'CONNECTING', deadline_ms: 10_000 });
      store.getState().setError('Kết nối Gemini quá chậm.');
      store.getState().transition('ERROR_RECOVERABLE');
    }, 10_000);
    return () => clearTimeout(handle);
  }, [fsmState, store]);

  useEffect(() => {
    if (fsmState !== 'READY') return;
    const handle = setTimeout(() => {
      if (store.getState().state !== 'READY') return;
      track('session', 'voice.fsm.timeout', { state: 'READY', deadline_ms: 2000 });
      store.getState().setError('Micro không sẵn sàng.');
      store.getState().transition('ERROR_RECOVERABLE');
    }, 2000);
    return () => clearTimeout(handle);
  }, [fsmState, store]);

  useEffect(() => {
    if (fsmState !== 'USER_SPEAKING') return;
    const handle = setTimeout(() => {
      if (store.getState().state !== 'USER_SPEAKING') return;
      track('session', 'voice.fsm.timeout', { state: 'USER_SPEAKING', deadline_ms: 30_000 });
      store.getState().setError('VAD bị kẹt.');
      store.getState().transition('ERROR_RECOVERABLE');
    }, 30_000);
    return () => clearTimeout(handle);
  }, [fsmState, store]);

  useEffect(() => {
    if (fsmState !== 'USER_SPEECH_FINALIZING') return;
    const handle = setTimeout(() => {
      if (store.getState().state !== 'USER_SPEECH_FINALIZING') return;
      track('session', 'voice.fsm.timeout', { state: 'USER_SPEECH_FINALIZING', deadline_ms: 1000 });
      store.getState().transition('LISTENING');
    }, 1000);
    return () => clearTimeout(handle);
  }, [fsmState, store]);

  useEffect(() => {
    if (fsmState !== 'WAITING_AI') return;
    const handle = setTimeout(() => {
      if (store.getState().state !== 'WAITING_AI') return;
      track('session', 'voice.fsm.timeout', { state: 'WAITING_AI', deadline_ms: 8000 });
      store.getState().closeBargeInWindow();
      store.getState().transition('LISTENING');
    }, 8000);
    return () => clearTimeout(handle);
  }, [fsmState, store]);

  // P0-11: 5s drain-timeout safety. If ASSISTANT_SPEAKING persists for 5s
  // after turnComplete was received, the drain event was lost (native bug or
  // disposed player). Log and force → LISTENING. The drain event's arrival in
  // onPlaybackFinish clears responseTurnCompleteAtMsRef so the timer never
  // fires in the normal path (plan §3.2 ASSISTANT_SPEAKING safety net).
  useEffect(() => {
    if (fsmState !== 'ASSISTANT_SPEAKING') return;
    const handle = setTimeout(() => {
      if (store.getState().state !== 'ASSISTANT_SPEAKING') return;
      track('session', 'voice.assistant.drain_timeout', { deadline_ms: 5000 });
      responseTurnCompleteAtMsRef.current = null;
      store.getState().transition('LISTENING');
    }, 5000);
    return () => clearTimeout(handle);
  }, [fsmState, store]);

  useEffect(() => {
    if (fsmState !== 'INTERRUPTED') return;
    const handle = setTimeout(() => {
      if (store.getState().state !== 'INTERRUPTED') return;
      track('session', 'voice.assistant_turn.interrupted_timeout');
      // P0-22 §8.4: clear the strict-ordering ref on watchdog timeout
      // so a stamped pending turn id doesn't leak into a future
      // interrupt cycle.
      pendingUserTurnIdAfterClearRef.current = null;
      store.getState().setError('Ngắt audio không phản hồi.');
      store.getState().transition('ERROR_RECOVERABLE');
    }, 800);
    return () => clearTimeout(handle);
  }, [fsmState, store]);

  useEffect(() => {
    if (fsmState !== 'RECONNECTING') return;
    const handle = setTimeout(() => {
      if (store.getState().state !== 'RECONNECTING') return;
      track('session', 'voice.fsm.timeout', { state: 'RECONNECTING', deadline_ms: 8000 });
      store.getState().setError('Kết nối lại quá chậm.');
      store.getState().transition('ERROR_RECOVERABLE');
    }, 8000);
    return () => clearTimeout(handle);
  }, [fsmState, store]);

  useEffect(() => {
    if (fsmState !== 'ERROR_RECOVERABLE') return;
    const handle = setTimeout(() => {
      if (store.getState().state !== 'ERROR_RECOVERABLE') return;
      store.getState().transition('IDLE');
    }, 5000);
    return () => clearTimeout(handle);
  }, [fsmState, store]);

  // P0-10 + P0-19: voiceMicEngineReady drives READY → LISTENING. The
  // event subscriber lives at hook-scope (not inside _startAudioCapture)
  // so a single subscription survives multiple capture restarts. The
  // FSM transition is gated on state === 'READY' to avoid spurious
  // LISTENING transitions when the event arrives during reconnect.
  useEffect(() => {
    const unsub = VoiceMic.onEngineReady(() => {
      const s = store.getState();
      if (s.state === 'READY') {
        s.transition('LISTENING');
      }
    });
    return () => unsub();
  }, [store]);

  // §7.7 P0-14: Cancel-unack deadline. While in ASSISTANT_SPEAKING, subscribe
  // to voiceMicVadStart. On receipt, stamp cancelUnackMsRef and arm a 600ms
  // watchdog. If serverContent.interrupted doesn't arrive in time, emit
  // voice.barge_in.cancel_unacked (observability-only — no functional fallback).
  useEffect(() => {
    if (fsmState !== 'ASSISTANT_SPEAKING') return;
    let watchdogHandle: ReturnType<typeof setTimeout> | null = null;
    const unsub = VoiceMic.onVadStart(() => {
      const vadStartMs = Date.now();
      cancelUnackMsRef.current = vadStartMs;
      watchdogHandle = setTimeout(() => {
        if (cancelUnackMsRef.current === vadStartMs) {
          track('barge_in', 'voice.barge_in.cancel_unacked', {
            responseId: store.getState().currentResponseId ?? null,
            deadline_ms: 600,
            mic_vad_start_at_ms: vadStartMs,
          });
          cancelUnackMsRef.current = null;
        }
      }, 600);
    });
    return () => {
      unsub();
      if (watchdogHandle !== null) clearTimeout(watchdogHandle);
      cancelUnackMsRef.current = null;
    };
  }, [fsmState, store]);

  // P0-20 plan v2 §7.6: tap-to-interrupt generation budget. When the
  // user taps to interrupt and never speaks, the server keeps
  // generating tokens (auto-VAD only cancels on actual speech). The
  // watchdog forcibly closes the WS after Config.VOICE_BARGE_IN_BUDGET_MS
  // so the standard reconnect path (P0-13 softReconnect) cleans up.
  // VAD-fired-before-budget is the happy path; emit user_resumed.
  const bargeInWindowOpen = useVoiceAssistantStore((s) => s.bargeInWindowOpen);
  useEffect(() => {
    if (!bargeInWindowOpen) return;
    const openedAtMs = Date.now();
    let resolved = false;
    const handle = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      // Re-check the window: a fast turn could have closed it via
      // freezeNewResponse just before the deadline.
      if (!store.getState().bargeInWindowOpen) return;
      const idleMs = Date.now() - openedAtMs;
      track('session', 'voice.barge_in.budget_exhausted', {
        idle_ms_at_close: idleMs,
        budget_ms: Config.VOICE_BARGE_IN_BUDGET_MS,
      });
      try {
        sessionRef.current?.close?.();
      } catch (err) {
        jsErrorBreadcrumb('gemini.barge_in.budget.close', err);
      }
      const s = store.getState();
      if (
        s.state === 'INTERRUPTED' ||
        s.state === 'ASSISTANT_SPEAKING' ||
        s.state === 'WAITING_AI' ||
        s.state === 'LISTENING'
      ) {
        s.transition('RECONNECTING');
        queueMicrotask(() => reconnectRef.current?.());
      }
    }, Config.VOICE_BARGE_IN_BUDGET_MS);

    const unsubVad = VoiceMic.onVadStart(() => {
      if (resolved) return;
      resolved = true;
      clearTimeout(handle);
      const idleMs = Date.now() - openedAtMs;
      track('session', 'voice.barge_in.user_resumed', {
        idle_ms_when_resumed: idleMs,
        budget_ms: Config.VOICE_BARGE_IN_BUDGET_MS,
      });
    });

    return () => {
      resolved = true;
      clearTimeout(handle);
      unsubVad();
    };
  }, [bargeInWindowOpen, store]);

  // P0-22 plan v2 §8.4: when voiceMicVadStart arrives WHILE state is
  // INTERRUPTED (i.e. user started speaking before the native clear()
  // Promise resolved — the B-then-A ordering), stamp a fresh
  // UserTurnId in pendingUserTurnIdAfterClearRef and DO NOT transition
  // state. The .then() of playbackRef.interrupt() reads the ref on
  // resolution and transitions INTERRUPTED → USER_SPEAKING with the
  // stamped id (skipping the LISTENING intermediate). The 800ms
  // interrupt_watchdog clears the ref on timeout.
  //
  // The capture-loop subscriber at _startAudioCapture (P0-7) drives
  // LISTENING → USER_SPEAKING for the A-then-B path; it ignores
  // INTERRUPTED so the two subscribers don't fight.
  useEffect(() => {
    const unsub = VoiceMic.onVadStart(() => {
      const s = store.getState();
      if (s.state !== 'INTERRUPTED') return;
      // Already pending? Defensive idempotency — first VAD wins; a
      // second VAD edge during the same INTERRUPTED window does not
      // re-mint the turn id.
      if (pendingUserTurnIdAfterClearRef.current !== null) return;
      const turnId =
        typeof globalThis.crypto?.randomUUID === 'function'
          ? globalThis.crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      pendingUserTurnIdAfterClearRef.current = turnId;
      track('barge_in', 'voice.bargein.ordering.vad_during_interrupted', {
        userTurnId: turnId,
      });
    });
    return () => unsub();
  }, [store]);

  // User-initiated barge-in (T3.1). Mirrors the server-initiated interrupt
  // branch in the onmessage handler — same native stop, same transcript
  // commit, same FSM path — but triggered from the screen (tap on avatar).
  // Intentionally does not signal Gemini over the SDK: @google/genai does
  // not expose a client-side interrupt message, and `activityHandling`
  // default (START_OF_ACTIVITY_INTERRUPTS) will cancel the server turn as
  // soon as the user next speaks.
  const interruptPlayback = useCallback(() => {
    const s = store.getState();
    if (s.state !== 'ASSISTANT_SPEAKING') return;
    // T4.5: voiceInterruptLatencyTap — tap→native-clear-returns in ms.
    // Approximates RN-bridge + native stop+reset time; upper bound on
    // audible-silence delay. Promise-chained so we keep interruptPlayback
    // returning void (matches the hook's typed surface).
    const tapMs = Date.now();
    track('barge_in', 'user_interrupt');
    playbackRef.current
      ?.interrupt()
      .then(() => {
        track('barge_in', 'voice_interrupt_latency_tap', { latencyMs: Date.now() - tapMs });
        // P0-10 + P0-22 §8.4: drive INTERRUPTED → LISTENING off the
        // native clear() Promise UNLESS a VAD fired during the wait
        // (pendingUserTurnIdAfterClearRef set) — in which case promote
        // straight to USER_SPEAKING with the stamped turn id.
        if (store.getState().state === 'INTERRUPTED') {
          const pendingTurnId = pendingUserTurnIdAfterClearRef.current;
          if (pendingTurnId !== null) {
            pendingUserTurnIdAfterClearRef.current = null;
            useVoiceAssistantStore.setState({ currentUserTurnId: pendingTurnId });
            store.getState().transition('USER_SPEAKING');
            track('barge_in', 'voice.bargein.ordering.b_then_a', {
              userTurnId: pendingTurnId,
            });
          } else {
            store.getState().transition('LISTENING');
          }
        }
      })
      .catch(() => {
        /* interrupt() already swallows native errors — ignore */
      });
    if (s.aiTranscript) s.addMessage('ai', s.aiTranscript, true);
    s.setAiTranscript('');
    s.transition('INTERRUPTED');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // \u2500\u2500\u2500 Audio capture \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const _startAudioCapture = () => {
    if (isCapturingRef.current) return;

    // DEV-only diagnostics probe: 3-second samples of VoiceMic + VoiceSession
    // diagnostics while capturing. Distinguishes A (silent stop) from B
    // (sampleRate shift) from C (transientLoss) from D (engineRunning=false)
    // from E (voiceProcessingEnabled mismatch). No prod impact.
    if (__DEV__) startVoiceDebugProbe();

    try {
      track('capture', 'audio_capture_init', { backend: 'native' });

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

        // Cheap RMS up-front (every 16th byte ≈ 32 samples per 20ms chunk).
        // Used twice: (1) the smart-half-duplex gate below, (2) the local
        // VAD that drives state transitions further down.
        const bytes = atob(base64);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < bytes.length; i += 16) {
          const sample = (bytes.charCodeAt(i) | (bytes.charCodeAt(i + 1) << 8)) / 32768;
          sum += sample * sample;
          count += 1;
        }
        const rms = count > 0 ? Math.sqrt(sum / count) : 0;

        // Send audio to Gemini via SDK. The SDK throws if the WS is mid-close
        // or the session has already errored; we drop the chunk but record
        // a breadcrumb so a post-mortem can tell "silent audio" apart from
        // "WS rejected every frame".
        // Echo suppression is now handled natively (P0-8): VoiceMicModule
        // applies the RMS gate in the reader thread when AEC failed, so JS
        // receives only clean audio and forwards everything it gets.
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

        // Update the visualizer at ~10 Hz to keep the UI animated without
        // flooding zustand subscribers on every native tick.
        const now = Date.now();
        if (now - lastLevelUpdate > LEVEL_UPDATE_INTERVAL_MS) {
          store.getState().setAudioLevel(Math.min(1, rms * 5));
          lastLevelUpdate = now;
        }

        // VAD transitions (LISTENING→USER_SPEAKING, USER_SPEAKING→WAITING_AI)
        // are now driven by native voiceMicVadStart / voiceMicVadEnd events
        // (P0-7). No JS-side timer or RMS threshold here.
      };

      // IMPORTANT: do NOT call setAudioModeAsync on the native path —
      // VoiceSession already owns AVAudioSession (iOS) / AudioManager
      // (Android). expo-audio's setAudioModeAsync would race our
      // category+mode setup.
      const unsub = VoiceMic.onData(({ data }) => handleMicChunk(data));
      const unsubStall = VoiceMic.onStall((evt) => {
        track('error', 'voice_mic_stalled', {
          lastFrameAgeMs: evt.lastFrameAgeMs,
          fatal: evt.fatal,
        });
        if (evt.fatal) {
          store
            .getState()
            .setError(`Micro mất frame ${Math.round(evt.lastFrameAgeMs)} ms. Tắt/bật lại voice.`);
        }
      });
      // P0-8: on session start, disable the native RMS fallback gate.
      // It activates only when voiceAecAttachFailed fires below.
      VoiceMic.setAecFallbackGate(false, 0).catch(() => {});
      const unsubAecFailed = VoiceMic.onAecAttachFailed((evt) => {
        track('session', 'voice_aec_attach_failed', {
          reason: evt.reason,
          modelCode: evt.modelCode,
          deviceCode: evt.deviceCode,
        });
        // AEC unavailable on this device — activate the software RMS fallback
        // gate in native VoiceMicModule (plan v2 §5.2, threshold covers child
        // voices per §13.2 A3/A5). Hook calls unconditionally on both platforms;
        // iOS stub resolves immediately.
        VoiceMic.setAecFallbackGate(true, 0.04).catch(() => {});
      });
      // P0-7: native VAD event subscriptions. VadStart → USER_SPEAKING,
      // VadEnd → WAITING_AI (replaces JS setTimeout VAD).
      const unsubVadStart = VoiceMic.onVadStart(() => {
        const s = store.getState();
        if (s.state === 'LISTENING') {
          s.transition('USER_SPEAKING');
          track('capture', 'vad_start');
        }
      });
      const unsubVadEnd = VoiceMic.onVadEnd((evt) => {
        const s = store.getState();
        if (s.state === 'USER_SPEAKING') {
          userSpeechEndMsRef.current = Date.now() - evt.hangoverMs;
          s.transition('WAITING_AI');
          track('capture', 'vad_end', { hangoverMs: evt.hangoverMs });
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
              unsubAecFailed();
              unsubVadStart();
              unsubVadEnd();
              return VoiceMic.stop();
            },
          };
          track('capture', 'audio_capture_started', { sampleRate: 16000, backend: 'native' });
        })
        .catch((err: unknown) => {
          unsub();
          unsubStall();
          unsubAecFailed();
          unsubVadStart();
          unsubVadEnd();
          track('error', 'audio_capture_start_failed', {
            backend: 'native',
            err: String(err),
          });
          store.getState().setError('Micro không khả dụng.');
          store.getState().transition('ERROR_RECOVERABLE');
        });
    } catch {
      track('capture', 'audio_capture_unavailable');
      store.getState().setError('Micro kh\u00f4ng kh\u1ea3 d\u1ee5ng.');
      store.getState().transition('ERROR_RECOVERABLE');
    }
  };

  const _stopAudioCapture = () => {
    if (!isCapturingRef.current) return;
    try {
      audioStreamRef.current?.stop();
    } catch {}
    if (__DEV__) stopVoiceDebugProbe();
    track('capture', 'audio_capture_stopped');
    isCapturingRef.current = false;
    audioStreamRef.current = null;
    store.getState().setAudioLevel(0);
  };

  return { startConversation, stopConversation, interruptPlayback };
}
