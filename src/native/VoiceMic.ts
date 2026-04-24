/**
 * VoiceMic — JS shim for the native VoiceMicModule (sys-16, Gemini Live
 * realtime voice).
 *
 * Designed as a drop-in replacement for `react-native-live-audio-stream`'s
 * callback API. When the native module is absent (simulator without our
 * custom binary, or the feature flag keeps RNLAS active), every method is
 * a graceful no-op — callers should guard with `VoiceMic.isAvailable`.
 *
 * Scope rules (per plan §5 MB-NATIVE-VOICE-006.5):
 *   - No direct AudioSession / AudioManager calls from JS. Those are owned
 *     by VoiceSessionModule.
 *   - `aec: 'hw' | 'off'` — iOS only. Android ignores the flag. Default
 *     'hw' → on iOS, enables `AVAudioEngine.inputNode.voiceProcessingEnabled`.
 *   - Event delivery uses NativeEventEmitter, NOT a global singleton
 *     callback (that was RNLAS's anti-pattern).
 */
import { NativeEventEmitter, NativeModules } from 'react-native';

export type VoiceMicAecMode = 'hw' | 'off';

export interface VoiceMicStartOptions {
  sampleRate: number; // 16000 for Gemini Live
  channels: 1 | 2; // 1 for Gemini Live
  bitsPerSample: 8 | 16; // 16 for Gemini Live
  aec?: VoiceMicAecMode; // default 'hw'; auto-downgrades per device allowlist
}

export interface VoiceMicDataEvent {
  /** base64 PCM16LE, ~20 ms chunk */
  data: string;
  /** monotonically increasing, 0-based */
  seq: number;
  /** CLOCK_MONOTONIC ms (Android) / mach_absolute_time ms (iOS) */
  timestampMs: number;
}

export interface VoiceMicStallEvent {
  lastFrameAgeMs: number;
  fatal: boolean;
}

export interface VoiceMicDiagnostics {
  running: boolean;
  sampleRate: number;
  framesDelivered: number;
  lastFrameAgeMs: number | null;
  /** iOS only; always false on Android */
  voiceProcessingEnabled: boolean;
  engineRunning: boolean;
  aecMode: VoiceMicAecMode;
}

interface NativeVoiceMic {
  start(opts: VoiceMicStartOptions): Promise<void>;
  stop(): Promise<void>;
  mute(muted: boolean): Promise<void>;
  getDiagnostics(): Promise<VoiceMicDiagnostics>;
  // Required by NativeEventEmitter subscription accounting on new RN versions.
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const Native = NativeModules.VoiceMicModule as NativeVoiceMic | undefined;
const emitter = Native ? new NativeEventEmitter(NativeModules.VoiceMicModule as never) : null;

export const VoiceMic = {
  async start(opts: VoiceMicStartOptions): Promise<void> {
    if (!Native) return;
    await Native.start(opts);
  },

  async stop(): Promise<void> {
    if (!Native) return;
    try {
      await Native.stop();
    } catch {
      /* best-effort teardown */
    }
  },

  async mute(muted: boolean): Promise<void> {
    if (!Native) return;
    await Native.mute(muted);
  },

  onData(cb: (e: VoiceMicDataEvent) => void): () => void {
    if (!emitter) return () => {};
    const sub = emitter.addListener('voiceMicData', cb);
    return () => sub.remove();
  },

  onStall(cb: (e: VoiceMicStallEvent) => void): () => void {
    if (!emitter) return () => {};
    const sub = emitter.addListener('voiceMicStalled', cb);
    return () => sub.remove();
  },

  async getDiagnostics(): Promise<VoiceMicDiagnostics | null> {
    if (!Native) return null;
    try {
      return await Native.getDiagnostics();
    } catch {
      return null;
    }
  },

  get isAvailable(): boolean {
    return Native != null;
  },
};
