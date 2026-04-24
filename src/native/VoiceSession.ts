/**
 * JS wrapper for the native VoiceSessionModule (Android) / VoiceSessionModule
 * (iOS, pending). Owns AudioManager.mode / audio-focus / communication-device
 * on Android and AVAudioSession category/mode + interruption on iOS.
 *
 * Contract kept deliberately small — JS only asks for start / end / route /
 * recover, and subscribes to a handful of structured events.
 */
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

export type VoiceRoute = 'speaker' | 'earpiece' | 'bluetooth' | 'wired' | 'none';

export type VoiceSessionState = 'active' | 'transientLoss' | 'lost' | 'inactive';

export interface VoiceSessionStateEvent {
  state: VoiceSessionState;
  reason: string;
  route: VoiceRoute;
}

export interface VoiceRouteEvent {
  route: VoiceRoute;
  deviceId: number;
  deviceName: string;
}

export interface VoiceSessionDiagnostics {
  sessionActive: boolean;
  category: string;
  mode: string;
  sampleRate: number;
  ioBufferDuration: number;
  inputLatency: number;
  outputLatency: number;
  route: VoiceRoute;
  isOtherAudioPlaying: boolean;
  preferredSampleRate: number;
  preferredIOBufferDuration: number;
}

interface NativeVoiceSession {
  startSession(): Promise<void>;
  endSession(): Promise<void>;
  setRoute(route: VoiceRoute): Promise<VoiceRoute>;
  getRoute(): Promise<VoiceRoute>;
  forceRecover(): Promise<boolean>;
  reapplyCategory(): Promise<boolean>;
  getDiagnostics(): Promise<VoiceSessionDiagnostics>;
}

const Native = NativeModules.VoiceSessionModule as NativeVoiceSession | undefined;

const emitter = Native ? new NativeEventEmitter(NativeModules.VoiceSessionModule as never) : null;

function warnMissing(op: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`[VoiceSession] Native module missing on ${Platform.OS} — ${op} is a no-op`);
  }
}

export const VoiceSession = {
  async start(): Promise<void> {
    if (!Native) {
      warnMissing('start');
      return;
    }
    await Native.startSession();
  },

  async end(): Promise<void> {
    if (!Native) return;
    try {
      await Native.endSession();
    } catch {
      /* best effort */
    }
  },

  async setRoute(route: VoiceRoute): Promise<VoiceRoute> {
    if (!Native) {
      warnMissing('setRoute');
      return 'none';
    }
    return Native.setRoute(route);
  },

  async getRoute(): Promise<VoiceRoute> {
    if (!Native) return 'none';
    try {
      return await Native.getRoute();
    } catch {
      return 'none';
    }
  },

  async forceRecover(): Promise<boolean> {
    if (!Native) return false;
    try {
      return await Native.forceRecover();
    } catch {
      return false;
    }
  },

  /**
   * Returns the AVAudioSession state AS ACTIVATED — not the requested values.
   * iOS HAL commonly rejects preferred sample rate / buffer duration when
   * BT SCO is active; this method exposes what the hardware actually gave
   * us so downstream converters and telemetry can work from reality rather
   * than assumption. Plan §7 P0-8.
   *
   * Returns null when the native module is not linked.
   */
  async getDiagnostics(): Promise<VoiceSessionDiagnostics | null> {
    if (!Native?.getDiagnostics) return null;
    try {
      return await Native.getDiagnostics();
    } catch {
      return null;
    }
  },

  /**
   * Re-apply category/mode/options without deactivating the session.
   * Safe to call while another audio library (e.g. RNLAS) is actively
   * capturing — unlike {@link forceRecover}, which tears the session
   * down and would stall that library's AudioQueue.
   */
  async reapplyCategory(): Promise<boolean> {
    if (!Native?.reapplyCategory) return false;
    try {
      return await Native.reapplyCategory();
    } catch {
      return false;
    }
  },

  onStateChange(cb: (e: VoiceSessionStateEvent) => void): () => void {
    if (!emitter) return () => {};
    const sub = emitter.addListener('voiceSessionStateChange', cb);
    return () => sub.remove();
  },

  onRouteChange(cb: (e: VoiceRouteEvent) => void): () => void {
    if (!emitter) return () => {};
    const sub = emitter.addListener('voiceRouteChange', cb);
    return () => sub.remove();
  },

  /**
   * Fires after the native session recovers from a destructive event
   * (media-services reset today; interruption-end and foreground-resume
   * wiring later). Listeners SHOULD tear down + re-init their audio
   * resources — the underlying AVAudioEngine units were invalidated by
   * the system and any stale handles will produce silent output.
   * Plan §3.3 P0-5b.
   */
  onSessionRecovered(cb: (e: { reason: string }) => void): () => void {
    if (!emitter) return () => {};
    const sub = emitter.addListener('voiceSessionRecovered', cb);
    return () => sub.remove();
  },

  get isAvailable(): boolean {
    return Native != null;
  },
};
