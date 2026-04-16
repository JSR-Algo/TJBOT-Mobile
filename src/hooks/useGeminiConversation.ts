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
import { useVoiceAssistantStore } from '../state/voiceAssistantStore';
import * as Haptics from 'expo-haptics';
import { Config } from '../config';
import { chat as chatWithAI } from '../api/ai';
import { getAccessToken } from '../api/tokens';

const AUDIO_ACTIVITY_THRESHOLD = 0.01;
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

    // 3. Init playback service
    if (!playbackRef.current) {
      playbackRef.current = new AudioPlaybackService();
    }
    playbackRef.current.onPlaybackFinish(() => {
      const s = store.getState();
      if (s.state === 'PLAYING_AI_AUDIO') {
        s.transition('LISTENING');
        logTelemetry('playback_finished_to_listening');
      }
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
            // Handle audio chunks from AI
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && playbackRef.current) {
              const s = store.getState();
              if (s.state !== 'PLAYING_AI_AUDIO') {
                if ((s.state === 'STREAMING_INPUT' || s.state === 'WAITING_AI') && s.userTranscript) {
                  s.addMessage('user', s.userTranscript);
                }
                s.transition('PLAYING_AI_AUDIO');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              playbackRef.current.enqueue(base64Audio);
              s.setAudioLevel(playbackRef.current.audioLevel);
            }

            // Handle interruption from server
            if (message.serverContent?.interrupted && playbackRef.current) {
              logTelemetry('live_interrupted');
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
              const s = store.getState();
              const newText = s.aiTranscript + outputTranscription.text;
              s.setAiTranscript(newText);
              logTelemetry('output_transcript', { chars: outputTranscription.text.length });
            }

            // Handle turn complete
            if (message.serverContent?.turnComplete) {
              logTelemetry('live_turn_complete', {
                aiTranscriptChars: store.getState().aiTranscript.length,
              });
              // Flush remaining audio for smooth playback
              playbackRef.current?.flush();
              const s = store.getState();
              // Archive user transcript BEFORE AI to maintain correct order
              if (s.userTranscript) s.addMessage('user', s.userTranscript);
              if (s.aiTranscript) s.addMessage('ai', s.aiTranscript);
              s.setAiTranscript('');
              isUserTalkingRef.current = false;
              // Don't transition to LISTENING yet - wait for audio to finish
              // The playback service will handle that via onPlaybackFinish
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
        audioSource: 7, // VOICE_COMMUNICATION - enables hardware echo cancellation
      });

      LiveAudioStream.on('data', (base64: string) => {
        if (!isCapturingRef.current) return;

        // Mute during AI playback to prevent echo
        const currentState = store.getState().state;
        if (currentState === 'PLAYING_AI_AUDIO' || currentState === 'INTERRUPTED') {
          store.getState().setAudioLevel(0);
          return;
        }

        // Send audio to Gemini via SDK
        try {
          sessionRef.current?.sendRealtimeInput({
            audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
          });
        } catch {}

        // Update audio level for visualizer
        const bytes = atob(base64);
        let sum = 0;
        for (let i = 0; i < bytes.length; i += 2) {
          const sample = (bytes.charCodeAt(i) | (bytes.charCodeAt(i + 1) << 8)) / 32768;
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / (bytes.length / 2));
        store.getState().setAudioLevel(Math.min(1, rms * 5));

        // Track user talking state
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
