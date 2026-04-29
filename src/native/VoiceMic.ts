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
  /** True if audio input tap is installed (capture loop is live) */
  tapInstalled: boolean;
  engineRunning: boolean;
  aecMode: VoiceMicAecMode;
}

export interface VoiceAecAttachFailedEvent {
  reason: string;
  modelCode: number;
  deviceCode: string;
}

/**
 * Fired the FIRST time a frame is delivered after each `start()` cycle.
 * Proves the audio path is live (tap installed on iOS, AudioRecord.read>0
 * on Android). FSM uses this as the trigger for `ready → listening`
 * (plan §3.2 row `ready`, §6.3 row 3).
 */
export interface VoiceMicEngineReadyEvent {
  /** ms since stream start; 0 on the very first frame */
  firstFrameAgeMs: number;
  /** Effective sample rate the engine actually delivered */
  sampleRate: number;
}

/**
 * Fired by the native VAD when speech onset is detected (plan §7.7).
 * Hook uses this in ASSISTANT_SPEAKING to arm the cancel-unack 600ms
 * watchdog — if serverContent.interrupted doesn't arrive in time,
 * voice.barge_in.cancel_unacked telemetry is emitted.
 */
export interface VoiceMicVadStartEvent {
  /** Wall-clock ms at VAD onset (CLOCK_MONOTONIC / mach_absolute_time) */
  timestampMs: number;
}

interface NativeVoiceMic {
  start(opts: VoiceMicStartOptions): Promise<void>;
  stop(): Promise<void>;
  mute(muted: boolean): Promise<void>;
  getDiagnostics(): Promise<VoiceMicDiagnostics>;
  setAecFallbackGate(enabled: boolean, threshold: number): Promise<void>;
  // Required by NativeEventEmitter subscription accounting on new RN versions.
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

// Defer the lookup. NativeModules is a lazy Proxy on Android; reading
// `NativeModules.VoiceMicModule` at module-import time can return undefined
// before the bridge's TurboModule registry is populated, freezing the const
// to undefined for the lifetime of the JS instance. Resolve on every call
// so callers see the module the moment it becomes available.
function getNative(): NativeVoiceMic | undefined {
  return NativeModules.VoiceMicModule as NativeVoiceMic | undefined;
}

let cachedEmitter: NativeEventEmitter | null = null;
function getEmitter(): NativeEventEmitter | null {
  if (cachedEmitter) return cachedEmitter;
  const native = getNative();
  if (!native) return null;
  cachedEmitter = new NativeEventEmitter(NativeModules.VoiceMicModule as never);
  return cachedEmitter;
}

export const VoiceMic = {
  async start(opts: VoiceMicStartOptions): Promise<void> {
    const native = getNative();
    if (!native) return;
    await native.start(opts);
  },

  async stop(): Promise<void> {
    const native = getNative();
    if (!native) return;
    try {
      await native.stop();
    } catch {
      /* best-effort teardown */
    }
  },

  async mute(muted: boolean): Promise<void> {
    const native = getNative();
    if (!native) return;
    await native.mute(muted);
  },

  onData(cb: (e: VoiceMicDataEvent) => void): () => void {
    const emitter = getEmitter();
    if (!emitter) return () => {};
    const sub = emitter.addListener('voiceMicData', cb);
    return () => sub.remove();
  },

  onStall(cb: (e: VoiceMicStallEvent) => void): () => void {
    const emitter = getEmitter();
    if (!emitter) return () => {};
    const sub = emitter.addListener('voiceMicStalled', cb);
    return () => sub.remove();
  },

  onAecAttachFailed(cb: (e: VoiceAecAttachFailedEvent) => void): () => void {
    const emitter = getEmitter();
    if (!emitter) return () => {};
    const sub = emitter.addListener('voiceAecAttachFailed', cb);
    return () => sub.remove();
  },

  onEngineReady(cb: (e: VoiceMicEngineReadyEvent) => void): () => void {
    const emitter = getEmitter();
    if (!emitter) return () => {};
    const sub = emitter.addListener('voiceMicEngineReady', cb);
    return () => sub.remove();
  },

  onVadStart(cb: (e: VoiceMicVadStartEvent) => void): () => void {
    const emitter = getEmitter();
    if (!emitter) return () => {};
    const sub = emitter.addListener('voiceMicVadStart', cb);
    return () => sub.remove();
  },

  onVadEnd(cb: (e: { hangoverMs: number }) => void): () => void {
    const emitter = getEmitter();
    if (!emitter) return () => {};
    const sub = emitter.addListener('voiceMicVadEnd', cb);
    return () => sub.remove();
  },

  async setAecFallbackGate(enabled: boolean, threshold: number): Promise<void> {
    const native = getNative();
    if (!native) return;
    await native.setAecFallbackGate(enabled, threshold);
  },

  async getDiagnostics(): Promise<VoiceMicDiagnostics | null> {
    const native = getNative();
    if (!native) return null;
    try {
      return await native.getDiagnostics();
    } catch {
      return null;
    }
  },

  get isAvailable(): boolean {
    const m = getNative();
    // Strict check: typeof null === 'object' would otherwise let a null
    // proxy entry pass `m != null`. Require the start method as proof of
    // an actual TurboModule wrapper.
    return m != null && typeof m.start === 'function';
  },
};
