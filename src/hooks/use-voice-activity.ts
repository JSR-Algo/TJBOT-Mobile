/**
 * useVoiceActivity u2014 Energy-based Voice Activity Detection (VAD) hook.
 *
 * Processes raw PCM frames (16-bit, mono, 16kHz) using:
 *   - RMS energy threshold for speech detection
 *   - Zero-crossing rate (ZCR) for noise rejection
 *
 * Speech onset is detected within ~120ms (2 x 60ms frames at 16kHz).
 * Silence is detected after configurable post-speech hold-off (default 600ms).
 */
import { useState, useRef, useCallback } from 'react';

// u2500u2500u2500 Constants u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500

/** 16-bit PCM full scale (32767) */
const PCM_FULL_SCALE = 32767;

/** Default RMS energy threshold as fraction of full scale (0.0u20131.0) */
const DEFAULT_ENERGY_THRESHOLD = 0.015;

/**
 * Max zero-crossing rate (ZCR) per frame (0.0u20131.0 of possible crossings).
 * High ZCR with low energy = noise/hiss u2192 reject.
 */
const DEFAULT_ZCR_NOISE_MAX = 0.4;

/** Number of consecutive speech frames required to confirm speech onset */
const SPEECH_ONSET_FRAMES = 2;

/** Default post-speech silence duration in ms before silenceDetected fires */
const DEFAULT_SILENCE_HOLD_MS = 600;

// u2500u2500u2500 Helpers u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500

/**
 * Decode a base64 PCM string into a signed 16-bit sample array.
 * Assumes little-endian 16-bit PCM.
 */
export function decodePcmBase64(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

/**
 * Compute RMS energy of a PCM frame, normalised to [0.0, 1.0].
 */
export function computeRms(samples: Int16Array): number {
  if (samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] / PCM_FULL_SCALE;
    sumSq += s * s;
  }
  return Math.sqrt(sumSq / samples.length);
}

/**
 * Compute zero-crossing rate (ZCR) of a PCM frame.
 * Returns fraction of samples that cross zero (0.0u20131.0).
 */
export function computeZcr(samples: Int16Array): number {
  if (samples.length < 2) return 0;
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) {
      crossings++;
    }
  }
  return crossings / (samples.length - 1);
}

/**
 * Returns true if a PCM frame contains speech based on energy + ZCR.
 */
export function isSpeechFrame(
  samples: Int16Array,
  energyThreshold = DEFAULT_ENERGY_THRESHOLD,
  zcrNoiseMax = DEFAULT_ZCR_NOISE_MAX,
): boolean {
  const rms = computeRms(samples);
  if (rms < energyThreshold) return false;
  const zcr = computeZcr(samples);
  // High ZCR with borderline energy = noise/hiss, not speech
  if (zcr > zcrNoiseMax && rms < energyThreshold * 3) return false;
  return true;
}

// u2500u2500u2500 Hook types u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500

export interface VoiceActivityOptions {
  energyThreshold?: number;
  zcrNoiseMax?: number;
  silenceHoldMs?: number;
  onSpeechStart?: () => void;
  onSilence?: () => void;
}

export interface VoiceActivityResult {
  isSpeaking: boolean;
  speechStarted: boolean;
  silenceDetected: boolean;
  /** Call with each new base64 PCM frame from react-native-live-audio-stream */
  processFrame: (base64: string) => void;
  startListening: () => void;
  stopListening: () => void;
}

// u2500u2500u2500 Hook u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500

export function useVoiceActivity(options: VoiceActivityOptions = {}): VoiceActivityResult {
  const {
    energyThreshold = DEFAULT_ENERGY_THRESHOLD,
    zcrNoiseMax = DEFAULT_ZCR_NOISE_MAX,
    silenceHoldMs = DEFAULT_SILENCE_HOLD_MS,
    onSpeechStart,
    onSilence,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechStarted, setSpeechStarted] = useState(false);
  const [silenceDetected, setSilenceDetected] = useState(false);

  const activeRef = useRef(false);
  const speechFrameCountRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpeechRef = useRef(false);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    activeRef.current = true;
    speechFrameCountRef.current = 0;
    hasSpeechRef.current = false;
    clearSilenceTimer();
    setIsSpeaking(false);
    setSpeechStarted(false);
    setSilenceDetected(false);
  }, [clearSilenceTimer]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    clearSilenceTimer();
    setIsSpeaking(false);
  }, [clearSilenceTimer]);

  const processFrame = useCallback(
    (base64: string) => {
      if (!activeRef.current) return;

      const samples = decodePcmBase64(base64);
      const speechInFrame = isSpeechFrame(samples, energyThreshold, zcrNoiseMax);

      if (speechInFrame) {
        speechFrameCountRef.current += 1;
        clearSilenceTimer();

        if (speechFrameCountRef.current >= SPEECH_ONSET_FRAMES && !hasSpeechRef.current) {
          // Speech onset confirmed
          hasSpeechRef.current = true;
          setIsSpeaking(true);
          setSpeechStarted(true);
          setSilenceDetected(false);
          onSpeechStart?.();
        }
      } else {
        // Non-speech frame: reset onset counter
        speechFrameCountRef.current = 0;

        if (hasSpeechRef.current && silenceTimerRef.current === null) {
          // Start silence hold-off timer
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            setIsSpeaking(false);
            setSilenceDetected(true);
            onSilence?.();
          }, silenceHoldMs);
        }
      }
    },
    [energyThreshold, zcrNoiseMax, silenceHoldMs, onSpeechStart, onSilence, clearSilenceTimer],
  );

  return {
    isSpeaking,
    speechStarted,
    silenceDetected,
    processFrame,
    startListening,
    stopListening,
  };
}
