/**
 * useAudioStreamer — Real-time PCM audio capture and streaming hook.
 *
 * Uses react-native-live-audio-stream for PCM 16kHz mono 16-bit capture
 * (as determined in Phase 0 spike: expo-audio cannot stream mid-recording).
 *
 * Flow:
 *   LiveAudioStream.on('data') → VAD processFrame → if speaking → sendAudioChunk
 *   VAD silence detected → sendAudioEnd
 *
 * Since react-native-live-audio-stream is a native module (not yet installed
 * without npm install), we access it via a lazy require with a fallback stub
 * so the module can be tested and compiled without the native dep present.
 */
import { useRef, useCallback, useEffect } from 'react';
import { useVoiceActivity } from './use-voice-activity';
import type { RealtimeClient } from '../api/realtime.client';

// ─── LiveAudioStream interface ───────────────────────────────────────────────

interface LiveAudioStreamStatic {
  init: (options: LiveAudioStreamOptions) => void;
  start: () => void;
  stop: () => void;
  on: (event: 'data', callback: (data: string) => void) => void;
}

interface LiveAudioStreamOptions {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  audioSource?: number; // Android: 6 = VOICE_RECOGNITION
  bufferSize?: number;
}

/**
 * Lazily resolve react-native-live-audio-stream.
 * Returns null if the native module is not available (e.g. in unit tests).
 */
function getLiveAudioStream(): LiveAudioStreamStatic | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-live-audio-stream') as
      | { default?: LiveAudioStreamStatic }
      | LiveAudioStreamStatic;
    return ('default' in mod && mod.default ? mod.default : mod) as LiveAudioStreamStatic;
  } catch {
    return null;
  }
}

// ─── Hook types ───────────────────────────────────────────────────────────────

export interface AudioStreamerOptions {
  /** RealtimeClient instance to stream audio to */
  client: RealtimeClient;
  /** RMS energy threshold for VAD (default: 0.015) */
  energyThreshold?: number;
  /** ZCR noise rejection threshold (default: 0.4) */
  zcrNoiseMax?: number;
  /** Post-speech silence hold in ms before sendAudioEnd (default: 600) */
  silenceHoldMs?: number;
  /** Called when speech starts */
  onSpeechStart?: () => void;
  /** Called when silence is detected and AUDIO_END is sent */
  onSilence?: () => void;
  /** Called on permission or init error */
  onError?: (err: Error) => void;
}

export interface AudioStreamerResult {
  /** Start capturing and streaming audio */
  startStreaming: () => void;
  /** Stop capturing and streaming audio */
  stopStreaming: () => void;
  /** True while LiveAudioStream is active */
  isStreaming: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAudioStreamer(options: AudioStreamerOptions): AudioStreamerResult {
  const {
    client,
    energyThreshold,
    zcrNoiseMax,
    silenceHoldMs,
    onSpeechStart,
    onSilence,
    onError,
  } = options;

  const isStreamingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const audioEndSentRef = useRef(false);

  const handleSilence = useCallback(() => {
    if (isSpeakingRef.current && !audioEndSentRef.current) {
      audioEndSentRef.current = true;
      client.sendAudioEnd();
      onSilence?.();
    }
  }, [client, onSilence]);

  const handleSpeechStart = useCallback(() => {
    isSpeakingRef.current = true;
    audioEndSentRef.current = false;
    onSpeechStart?.();
  }, [onSpeechStart]);

  const vad = useVoiceActivity({
    energyThreshold,
    zcrNoiseMax,
    silenceHoldMs,
    onSpeechStart: handleSpeechStart,
    onSilence: handleSilence,
  });

  // Capture stable refs to avoid stale closures in LiveAudioStream callback
  const vadProcessFrameRef = useRef(vad.processFrame);
  useEffect(() => {
    vadProcessFrameRef.current = vad.processFrame;
  }, [vad.processFrame]);

  const clientRef = useRef(client);
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  const startStreaming = useCallback(() => {
    if (isStreamingRef.current) return;

    const stream = getLiveAudioStream();
    if (!stream) {
      onError?.(new Error('react-native-live-audio-stream is not available'));
      return;
    }

    try {
      stream.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6, // Android VOICE_RECOGNITION
      });

      stream.on('data', (base64: string) => {
        // Run VAD on each frame
        vadProcessFrameRef.current(base64);

        // Stream frame to backend only while speech is active
        if (isSpeakingRef.current && !audioEndSentRef.current) {
          clientRef.current.sendAudioChunk(base64);
        }
      });

      isStreamingRef.current = true;
      isSpeakingRef.current = false;
      audioEndSentRef.current = false;

      vad.startListening();
      stream.start();

      // Signal backend that audio streaming has started
      clientRef.current.sendAudioStart('');
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  // vad.startListening is stable (useCallback with no deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onError]);

  const stopStreaming = useCallback(() => {
    if (!isStreamingRef.current) return;

    const stream = getLiveAudioStream();
    if (stream) {
      try { stream.stop(); } catch {}
    }

    vad.stopListening();
    isStreamingRef.current = false;
    isSpeakingRef.current = false;
  // vad.stopListening is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isStreamingRef.current) {
        stopStreaming();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    startStreaming,
    stopStreaming,
    isStreaming: isStreamingRef.current,
  };
}
