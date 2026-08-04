/** Native voice events remain locally handled without external telemetry. */

type Listener = (event: unknown) => void;

const listenerStore: Record<string, Listener[]> =
  ((globalThis as any).__voiceTelemetryListeners ??= {});

jest.mock('react-native', () => {
  class FakeEmitter {
    addListener(name: string, callback: Listener): { remove: () => void } {
      const store: Record<string, Listener[]> =
        ((globalThis as any).__voiceTelemetryListeners ??= {});
      store[name] = store[name] ?? [];
      store[name].push(callback);
      return {
        remove: () => {
          const index = store[name]?.indexOf(callback) ?? -1;
          if (index >= 0) store[name].splice(index, 1);
        },
      };
    }
  }

  return {
    Platform: {
      OS: 'ios',
      select: <T,>(options: { ios?: T; default?: T }) => options.ios ?? options.default,
    },
    NativeModules: {
      VoiceSessionModule: { addListener: jest.fn(), removeListeners: jest.fn() },
      VoiceMicModule: { addListener: jest.fn(), removeListeners: jest.fn() },
      PcmStreamModule: { addListener: jest.fn(), removeListeners: jest.fn() },
    },
    NativeEventEmitter: FakeEmitter,
  };
});

import {
  resetVoiceTelemetryForTests,
  startVoiceTelemetry,
  stopVoiceTelemetry,
} from '../../src/services/observability/voice-telemetry';

function emit(name: string, payload: unknown): void {
  for (const callback of listenerStore[name] ?? []) callback(payload);
}

function listenerCount(): number {
  return Object.values(listenerStore).reduce((count, listeners) => count + listeners.length, 0);
}

describe('voice telemetry local bridge', () => {
  beforeEach(() => {
    resetVoiceTelemetryForTests();
    for (const name of Object.keys(listenerStore)) delete listenerStore[name];
  });

  afterAll(() => {
    stopVoiceTelemetry();
  });

  it('subscribes once even when started repeatedly', () => {
    startVoiceTelemetry();
    const initialCount = listenerCount();
    startVoiceTelemetry();

    expect(initialCount).toBe(6);
    expect(listenerCount()).toBe(initialCount);
  });

  it.each([
    ['voiceSessionStateChange', { state: 'lost', reason: 'focus_loss', route: 'speaker' }],
    ['voiceRouteChange', { route: 'bluetooth', deviceId: 7, deviceName: 'Headphones' }],
    ['voiceSessionRecovered', { reason: 'media_reset', route: 'speaker' }],
    ['voiceMicStalled', { lastFrameAgeMs: 2200, fatal: false }],
    ['voicePlaybackStalled', { bufferedMs: 800, framesSinceLastAdvance: 24 }],
    ['voicePlaybackDrained', { reason: 'fallback_timeout' }],
  ])('handles %s without transmitting or throwing', (eventName, payload) => {
    startVoiceTelemetry();
    expect(() => emit(eventName, payload)).not.toThrow();
  });

  it('tears down every native subscription', () => {
    startVoiceTelemetry();
    stopVoiceTelemetry();
    expect(listenerCount()).toBe(0);
  });
});
