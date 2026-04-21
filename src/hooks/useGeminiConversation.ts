/**
 * useGeminiConversation — Orchestration hook for Gemini Live voice conversation.
 *
 * Uses @google/genai SDK (same as web app) for reliable WebSocket,
 * transcript streaming, and audio handling.
 */
import { useRef, useCallback, useEffect } from 'react';
import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import * as Device from 'expo-device';
import { GoogleGenAI, Modality } from '@google/genai/web';
import { AudioPlaybackService } from '../audio/AudioPlaybackService';
import { hydrateAudioSeedOnce } from '../audio/JitterSeedStore';
import { useVoiceAssistantStore } from '../state/voiceAssistantStore';
import * as Haptics from 'expo-haptics';
import { detectExpression } from '../utils/expressionDetector';
import { Config } from '../config';
import { chat as chatWithAI } from '../api/ai';
import { getAccessToken } from '../api/tokens';

const AUDIO_ACTIVITY_THRESHOLD = 0.01;

/** Merge an array of base64-encoded PCM16 chunks into one base64 blob. */
function concatBase64Pcm(chunks: string[]): string {
  if (chunks.length === 1) return chunks[0];
  let total = 0;
  const decoded: string[] = new Array(chunks.length);
  for (let i = 0; i < chunks.length; i++) {
    decoded[i] = globalThis.atob(chunks[i]);
    total += decoded[i].length;
  }
  const bytes = new Uint8Array(total);
  let off = 0;
  for (const d of decoded) {
    for (let i = 0; i < d.length; i++) bytes[off + i] = d.charCodeAt(i);
    off += d.length;
  }
  // Encode back to base64 in 32KB slices to avoid argument-limit issues.
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK))));
  }
  return globalThis.btoa(parts.join(''));
}
const TOKEN_FETCH_TIMEOUT_MS = 8000;
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
  // Turn-buffered playback: accumulate every PCM chunk Gemini sends during
  // a turn and hand it to AudioPlaybackService as a single enqueue at
  // turnComplete. One WAV → one createAudioPlayer → zero segment-boundary
  // clicks (the main remaining source of "rè" on MIUI + SD 7-series).
  // Tradeoff: the user hears nothing until the AI finishes its response.
  const turnAudioChunksRef = useRef<string[]>([]);

  const store = useVoiceAssistantStore;

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
    logTelemetry('session_start', { isDevice: Device.isDevice, platform: 'android' });

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

    // 2. Fetch API key from backend
    transition('CONNECTING');
    let apiKey: string;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      logTelemetry('token_fetch_start');
      const authToken = await getAccessToken();
      const baseUrl = (Config.API_BASE_URL || '').replace(/\/v1$/, '');
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT_MS);
      const resp = await fetch(`${baseUrl}/v1/gemini/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`Token fetch failed: ${resp.status}`);
      const data = await resp.json();
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
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }

    try {
      await hydrateAudioSeedOnce();
    } catch {
      if (__DEV__) logTelemetry('audio_seed_hydrate_failed');
    }

    // 3. Init playback service
    if (!playbackRef.current) {
      playbackRef.current = new AudioPlaybackService();
    }
    playbackRef.current.onPlaybackFinish(() => {
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
      const s = store.getState();
      if (s.state === 'WAITING_AI' || s.state === 'STREAMING_INPUT' || s.state === 'LISTENING') {
        s.transition('PLAYING_AI_AUDIO');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        logTelemetry('playback_started_to_playing');
      }
    });
    // Surface buffering state to the UI (subtle glow dim in SukaAvatar).
    playbackRef.current.onBufferingChange((buffering) => {
      store.getState().setIsBuffering(buffering);
      if (__DEV__) logTelemetry('buffering_change', { buffering });
    });
    // iter 2 §2.5 — one-shot poor-network hint. Drives the "mạng yếu"
    // banner; clears on endTurn / interrupt.
    playbackRef.current.onPoorNetwork((poor) => {
      store.getState().setIsPoorNetwork(poor);
      if (__DEV__) logTelemetry('poor_network_change', { poor });
    });
    playbackRef.current.onAudioModeChange((mode) => {
      store.getState().setAudioMode(mode);
      if (__DEV__) logTelemetry('audio_mode_change', { mode });
    });

    // 4. Connect using @google/genai SDK (same as web app)
    try {
      const ai = new GoogleGenAI({ apiKey });
      logTelemetry('genai_sdk_connect', { model: Config.GEMINI_LIVE_MODEL });

      const session = await ai.live.connect({
        model: Config.GEMINI_LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: options.voiceName || 'Kore',
              },
            },
          },
          systemInstruction: options.systemInstruction || undefined,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            logTelemetry('live_connected');
            store.getState().transition('LISTENING');
            _startAudioCapture();
          },
          onmessage: (message: any) => {
            // Handle audio chunks from AI. FSM transition to PLAYING_AI_AUDIO
            // is deferred to `onPlaybackStart` (fires on first *played*
            // sample, not first received) — avoids the silent-mouth gap
            // during the adaptive prebuffer window. See plan §2.7.
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && playbackRef.current) {
              const s = store.getState();
              if (s.state === 'STREAMING_INPUT') {
                if (s.userTranscript) s.addMessage('user', s.userTranscript);
                s.transition('WAITING_AI');
              }
              // Buffer the chunk instead of playing it now — we'll flush the
              // concatenation at turnComplete.
              turnAudioChunksRef.current.push(base64Audio);
            }

            // Handle interruption from server
            if (message.serverContent?.interrupted && playbackRef.current) {
              logTelemetry('live_interrupted');
              turnAudioChunksRef.current = [];
              playbackRef.current.interrupt();
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
              logTelemetry('live_turn_complete', {
                aiTranscriptChars: store.getState().aiTranscript.length,
                chunks: turnAudioChunksRef.current.length,
              });
              // Concatenate every buffered chunk into ONE PCM buffer, encode
              // to base64 once, and enqueue as a single segment. The
              // AudioPlaybackService minSegment policy will then emit just
              // one WAV, so there are no inter-segment boundaries to click on.
              if (playbackRef.current && turnAudioChunksRef.current.length > 0) {
                const merged = concatBase64Pcm(turnAudioChunksRef.current);
                turnAudioChunksRef.current = [];
                playbackRef.current.enqueue(merged);
                store.getState().setAudioLevel(playbackRef.current.audioLevel);
              }
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
          },
          onclose: () => {
            logTelemetry('live_disconnected');
            const s = store.getState();
            if (s.state !== 'IDLE' && s.state !== 'ERROR') {
              s.stopSession();
            }
          },
          onerror: (error: any) => {
            logTelemetry('live_error', { message: error?.message || 'unknown' });
            store.getState().setError(error?.message || 'L\u1ed7i k\u1ebft n\u1ed1i Gemini');
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
  }, [logTelemetry, options.voiceName, options.systemInstruction]);

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

    // Disconnect SDK session
    try {
      sessionRef.current?.close();
    } catch {}
    sessionRef.current = null;

    const s = store.getState();
    if (s.userTranscript) s.addMessage('user', s.userTranscript);
    if (s.aiTranscript) s.addMessage('ai', s.aiTranscript);
    s.setAudioMode('unknown');
    s.stopSession();
    logTelemetry('session_stopped');
  }, [logTelemetry]);

  // \u2500\u2500\u2500 Audio capture \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  const _startAudioCapture = () => {
    if (isCapturingRef.current) return;
    try {
      logTelemetry('audio_capture_init');
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

      // Perf: native stream emits audio chunks at ~50 Hz. Pushing every chunk
      // through a zustand setter floods the JS thread and makes the AI audio
      // stutter. We sample the RMS cheaply (every 16th byte, unchanged
      // accuracy for VAD) and only update the visualizer at 10 Hz.
      let chunkCount = 0;
      let lastLevelUpdate = 0;
      const LEVEL_UPDATE_INTERVAL_MS = 100;

      LiveAudioStream.on('data', (base64: string) => {
        if (!isCapturingRef.current) return;

        // Mute during AI playback to prevent echo.
        const currentState = store.getState().state;
        if (currentState === 'PLAYING_AI_AUDIO' || currentState === 'INTERRUPTED') {
          const now = Date.now();
          if (now - lastLevelUpdate > LEVEL_UPDATE_INTERVAL_MS) {
            store.getState().setAudioLevel(0);
            lastLevelUpdate = now;
          }
          return;
        }

        // Send audio to Gemini via SDK.
        try {
          sessionRef.current?.sendRealtimeInput({
            audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
          });
        } catch {}

        // Cheap RMS: sample every 16th byte (8 samples at 16kHz PCM16 → ~32
        // samples per 20ms chunk is still enough for VAD).
        chunkCount += 1;
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
                s.transition('WAITING_AI');
              }
            }, 600);
          }
        }
      });

      setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
        .then(() => {
          LiveAudioStream.start();
          isCapturingRef.current = true;
          audioStreamRef.current = LiveAudioStream;
          logTelemetry('audio_capture_started', { sampleRate: 16000 });
        });
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
    logTelemetry('audio_capture_stopped');
    isCapturingRef.current = false;
    audioStreamRef.current = null;
    store.getState().setAudioLevel(0);
  };

  return { startConversation, stopConversation };
}
