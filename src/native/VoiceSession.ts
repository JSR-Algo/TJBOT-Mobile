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

interface NativeVoiceSession {
  startSession(): Promise<void>;
  endSession(): Promise<void>;
  setRoute(route: VoiceRoute): Promise<VoiceRoute>;
  getRoute(): Promise<VoiceRoute>;
  forceRecover(): Promise<boolean>;
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

  get isAvailable(): boolean {
    return Native != null;
  },
};
