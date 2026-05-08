/**
 * voice-telemetry — breadcrumb forwarding contract.
 *
 * Mocks Sentry + NativeEventEmitter so we can assert that every native
 * event variant reaches Sentry.mockAddBreadcrumb with the right category +
 * level + payload. Covers the schema-drift gate in plan §4 AC-12.
 */

// ─── Mocks (must precede imports) ───────────────────────────────────────

// `tests/setup.ts` globally mocks `@sentry/react-native` with `init` +
// `captureException` only (no `addBreadcrumb`). Rather than fight Jest's
// mock-precedence rules, monkey-patch the setup.ts stub below AFTER the
// module graph loads — see the top-level statement right after the mocks.
// Jest babel-hoist runs the jest.mock factory in a scope that does NOT share
// the test-file top-level closure. Using globalThis as the shared-state bus
// between the mocked NativeEventEmitter and the test's emit() helper.
type Listener = (e: unknown) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __voiceTelemetryTestStore: Record<string, Listener[]> = ((globalThis as any).__voiceTelemetryListeners ??= {});

jest.mock('react-native', () => {
  class FakeEmitter {
    addListener(name: string, cb: (e: unknown) => void): { remove: () => void } {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store: Record<string, Array<(e: unknown) => void>> =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((globalThis as any).__voiceTelemetryListeners ??= {});
      store[name] = store[name] ?? [];
      store[name].push(cb);
      const remove = (): void => {
        const arr = store[name] ?? [];
        const idx = arr.indexOf(cb);
        if (idx >= 0) arr.splice(idx, 1);
      };
      return { remove };
    }
  }
  return {
    Platform: { OS: 'ios', select: <T,>(o: { ios?: T; android?: T; default?: T }) => o.ios ?? o.default },
    NativeModules: {
      VoiceSessionModule: { addListener: jest.fn(), removeListeners: jest.fn() },
      VoiceMicModule: { addListener: jest.fn(), removeListeners: jest.fn() },
      PcmStreamModule: { addListener: jest.fn(), removeListeners: jest.fn() },
    },
    NativeEventEmitter: FakeEmitter,
  };
});

// Override setup.ts's @sentry/react-native mock with one that includes
// addBreadcrumb — we create the jest.fn() INSIDE the factory to satisfy
// Jest babel-hoist's variable-name guard, then reach it via the imported
// namespace in the test scope.
jest.mock('@sentry/react-native', () => {
  const mockBreadcrumb = jest.fn();
  return {
    addBreadcrumb: mockBreadcrumb,
    init: jest.fn(),
    captureException: jest.fn(),
    // Expose the mock fn on the module namespace so tests can spy on it.
    __mockBreadcrumb: mockBreadcrumb,
  };
});

// Alias under the expected name for test code readability.
const listeners = __voiceTelemetryTestStore;

// ─── Imports (AFTER mocks) ──────────────────────────────────────────────

import * as Sentry from '@sentry/react-native';
import { startVoiceTelemetry, stopVoiceTelemetry } from '../../src/observability/voice-telemetry';

// Pull the mock fn created inside the factory out via the exposed
// __mockBreadcrumb property — both test and source see the same module
// namespace, so this is the same function reference.
const mockAddBreadcrumb = (Sentry as unknown as { __mockBreadcrumb: jest.Mock }).__mockBreadcrumb;

function emit(name: string, payload: unknown): void {
  for (const cb of listeners[name] ?? []) cb(payload);
}

function clearListeners(): void {
  for (const k of Object.keys(listeners)) delete listeners[k];
}

describe('voice-telemetry', () => {
  beforeEach(() => {
    mockAddBreadcrumb.mockClear();
    clearListeners();
    stopVoiceTelemetry();
  });

  afterAll(() => {
    stopVoiceTelemetry();
  });

  it('is idempotent — second start does nothing', () => {
    startVoiceTelemetry();
    const afterFirst = Object.values(listeners).reduce((n, arr) => n + arr.length, 0);
    startVoiceTelemetry();
    const afterSecond = Object.values(listeners).reduce((n, arr) => n + arr.length, 0);
    expect(afterSecond).toBe(afterFirst);
  });

  it('forwards voiceSessionStateChange as a breadcrumb under voice.session', () => {
    startVoiceTelemetry();
    emit('voiceSessionStateChange', { state: 'active', reason: 'start', route: 'speaker' });
    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'voice.session',
        message: 'voiceSessionStateChange',
        level: 'info',
      }),
    );
    const call = mockAddBreadcrumb.mock.calls[0][0];
    expect(call.data).toEqual(
      expect.objectContaining({
        event: 'voiceSessionStateChange',
        state: 'active',
        reason: 'start',
        route: 'speaker',
        platform: 'ios',
      }),
    );
  });

  it('elevates lost-state events to level=warning', () => {
    startVoiceTelemetry();
    emit('voiceSessionStateChange', { state: 'lost', reason: 'focus_loss_permanent', route: 'speaker' });
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'warning' }),
    );
  });

  it('forwards voiceRouteChange under voice.route', () => {
    startVoiceTelemetry();
    emit('voiceRouteChange', { route: 'bluetooth', deviceId: 7, deviceName: 'AirPods Pro' });
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'voice.route', message: 'voiceRouteChange' }),
    );
  });

  it('forwards voiceMicStalled under voice.mic', () => {
    startVoiceTelemetry();
    emit('voiceMicStalled', { lastFrameAgeMs: 2200, fatal: false });
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'voice.mic', message: 'voiceMicStalled' }),
    );
  });

  it('forwards voicePlaybackStalled under voice.playback', () => {
    startVoiceTelemetry();
    emit('voicePlaybackStalled', { bufferedMs: 800, framesSinceLastAdvance: 24 });
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'voice.playback', message: 'voicePlaybackStalled' }),
    );
  });

  it('stop() tears down subscriptions so no further breadcrumbs fire', () => {
    startVoiceTelemetry();
    stopVoiceTelemetry();
    // All listener arrays should be empty after teardown.
    for (const arr of Object.values(listeners)) {
      expect(arr.length).toBe(0);
    }
    emit('voiceSessionStateChange', { state: 'active', reason: 'post-stop', route: 'speaker' });
    expect(mockAddBreadcrumb).not.toHaveBeenCalled();
  });

  it('swallows Sentry errors (forwarder stays silent)', () => {
    mockAddBreadcrumb.mockImplementationOnce(() => {
      throw new Error('sentry not initialized');
    });
    startVoiceTelemetry();
    expect(() =>
      emit('voiceSessionStateChange', { state: 'active', reason: 'start', route: 'speaker' }),
    ).not.toThrow();
  });
});
