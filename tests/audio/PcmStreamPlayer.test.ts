/**
 * PcmStreamPlayer — drain-signal unit tests.
 *
 * Covers US-003..US-006 from
 * .omc/plans/ios-voice-drain-sentinel-2026-04-22.md.
 *
 * Mocks `react-native` with a programmable NativeModules.PcmStreamModule
 * and a FakeEmitter so tests can drive the `voicePlaybackDrained` event
 * path synchronously.
 */

// ─── Mocks (must precede imports) ────────────────────────────────────────

type DrainListener = (evt: {
  turnGeneration: number;
  framesPlayed: number;
  framesScheduled: number;
  reason: string;
}) => void;

// Listener store is shared between the jest.mock factory (which runs via
// babel-hoist) and the test scope. Stash on globalThis so both sides see the
// same reference regardless of module-isolation mode.
interface FakeRnState {
  listeners: Record<string, DrainListener[]>;
  emitterCtorShouldThrow: boolean;
  moduleMode: 'ios' | 'android' | 'missing';
  lastEndTurnResolver: (() => void) | null;
  lastEndTurnRejecter: ((err: unknown) => void) | null;
  endTurnRejectOnce: boolean;
  holdInit: boolean;
  initResolver: (() => void) | null;
  lastModule: Record<string, unknown> | undefined;
}
const RN_STATE: FakeRnState = ((
  globalThis as unknown as { __pcmStreamPlayerFakeRnState?: FakeRnState }
).__pcmStreamPlayerFakeRnState ??= {
  listeners: {},
  emitterCtorShouldThrow: false,
  moduleMode: 'ios',
  lastEndTurnResolver: null,
  lastEndTurnRejecter: null,
  endTurnRejectOnce: false,
  holdInit: false,
  initResolver: null,
  lastModule: undefined,
});

function resetRnState(mode: FakeRnState['moduleMode']): void {
  RN_STATE.listeners = {};
  RN_STATE.emitterCtorShouldThrow = false;
  RN_STATE.moduleMode = mode;
  RN_STATE.lastEndTurnResolver = null;
  RN_STATE.lastEndTurnRejecter = null;
  RN_STATE.endTurnRejectOnce = false;
  RN_STATE.holdInit = false;
  RN_STATE.initResolver = null;
  RN_STATE.lastModule = undefined;
}

jest.mock('react-native', () => {
  // Keep the factory self-contained; pull shared state off globalThis.
  const state = (
    globalThis as unknown as { __pcmStreamPlayerFakeRnState: FakeRnState }
  ).__pcmStreamPlayerFakeRnState;

  class FakeEmitter {
    constructor() {
      if (state.emitterCtorShouldThrow) {
        throw new Error('FakeEmitter ctor: forced failure');
      }
    }
    addListener(name: string, cb: DrainListener): { remove: () => void } {
      state.listeners[name] = state.listeners[name] ?? [];
      state.listeners[name].push(cb);
      return {
        remove: (): void => {
          const arr = state.listeners[name] ?? [];
          const idx = arr.indexOf(cb);
          if (idx >= 0) arr.splice(idx, 1);
        },
      };
    }
  }

  function buildModule(): Record<string, unknown> | undefined {
    const init = jest.fn(() => {
      if (!state.holdInit) return Promise.resolve();
      return new Promise<void>((resolve) => {
        state.initResolver = () => {
          state.holdInit = false;
          state.initResolver = null;
          resolve();
        };
      });
    });
    const base = {
      initWithRate: init,
      init,
      feed: jest.fn(() => Promise.resolve(0)),
      pause: jest.fn(() => Promise.resolve()),
      resume: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve()),
      close: jest.fn(() => Promise.resolve()),
      // Returns a value greater than any fed-frames count used in tests so
      // the Android polling path resolves to drain-complete on first check.
      playbackPosition: jest.fn(() => Promise.resolve(1_000_000_000)),
      // RCTEventEmitter probe hooks (NativeEventEmitter's expected shape).
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };
    if (state.moduleMode === 'missing') {
      state.lastModule = undefined;
      return undefined;
    }
    if (state.moduleMode === 'ios') {
      const module = {
        ...base,
        endTurn: jest.fn(() => {
          if (state.endTurnRejectOnce) {
            state.endTurnRejectOnce = false;
            return Promise.reject(new Error('simulated endTurn failure'));
          }
          return new Promise<void>((resolve, reject) => {
            state.lastEndTurnResolver = resolve;
            state.lastEndTurnRejecter = reject;
            resolve();
          });
        }),
      };
      state.lastModule = module;
      return module;
    }
    // Android: no endTurn method.
    state.lastModule = base;
    return base;
  }

  return {
    NativeModules: {
      get PcmStreamModule(): Record<string, unknown> | undefined {
        return buildModule();
      },
    },
    NativeEventEmitter: FakeEmitter,
    // Native subscription type is erased at runtime; keep an empty shim.
    Platform: { OS: 'ios' },
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function emitDrained(payload: {
  turnGeneration: number;
  framesPlayed?: number;
  framesScheduled?: number;
  reason?: string;
}): void {
  const full = {
    turnGeneration: payload.turnGeneration,
    framesPlayed: payload.framesPlayed ?? 0,
    framesScheduled: payload.framesScheduled ?? 0,
    reason: payload.reason ?? 'sentinel',
  };
  for (const cb of RN_STATE.listeners['voicePlaybackDrained'] ?? []) {
    cb(full);
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  if (typeof btoa === 'function') return btoa(binary);
  // Node fallback for jest envs without btoa.
  return Buffer.from(binary, 'binary').toString('base64');
}

function makePcmChunk(ms = 60): string {
  const samples = Math.round((24000 * ms) / 1000);
  const bytes = new Uint8Array(samples * 2);
  // A tiny non-zero signal keeps sampleRms() happy but content is irrelevant
  // here — the native module is mocked.
  for (let i = 0; i < samples; i++) {
    bytes[i * 2] = 0x10;
    bytes[i * 2 + 1] = 0x00;
  }
  return toBase64(bytes);
}

async function flushMicrotasks(n = 20): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve();
}

// Load the module under test fresh after each state reset so
// `const Native = NativeModules.PcmStreamModule` picks up the new shape.
type PcmStreamPlayerModule = typeof import('../../src/audio/PcmStreamPlayer');
function loadPlayer(): PcmStreamPlayerModule {
  let mod!: PcmStreamPlayerModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../../src/audio/PcmStreamPlayer') as PcmStreamPlayerModule;
  });
  return mod;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('PcmStreamPlayer — drain signal', () => {
  let warnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.useRealTimers();
  });

  // US-003 case 1: matching-generation drained event fires onPlaybackFinish once
  // and also clears the safety-net timer (no duplicate fallback fire).
  it('iOS: matching-generation voicePlaybackDrained fires onPlaybackFinish exactly once per turn', async () => {
    resetRnState('ios');
    jest.useFakeTimers();
    const { PcmStreamPlayer } = loadPlayer();
    const onFinish = jest.fn();
    const player = new PcmStreamPlayer({ onPlaybackFinish: onFinish });

    await player.enqueue(makePcmChunk(60)); // forces ensureReady + subscribes
    // Microtasks only — no timers to advance yet.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    player.endTurn(); // generation becomes 1, safety-net timer armed
    await Promise.resolve();

    emitDrained({ turnGeneration: 1, framesPlayed: 1440, framesScheduled: 1440 });
    expect(onFinish).toHaveBeenCalledTimes(1);

    // Advance well past the safety-net timeout: if the timer wasn't cleared
    // by fireFinish(), the safety-net would fire a second onPlaybackFinish.
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent init while multiple enqueue calls arrive before ready', async () => {
    resetRnState('ios');
    RN_STATE.holdInit = true;
    const { PcmStreamPlayer } = loadPlayer();
    const onStart = jest.fn();
    const player = new PcmStreamPlayer({ onPlaybackStart: onStart });

    const first = player.enqueue(makePcmChunk(60));
    const second = player.enqueue(makePcmChunk(60));

    expect((RN_STATE.lastModule?.init as jest.Mock | undefined)?.mock.calls).toHaveLength(1);

    RN_STATE.initResolver?.();
    await Promise.all([first, second]);
    await flushMicrotasks();

    expect((RN_STATE.lastModule?.feed as jest.Mock | undefined)?.mock.calls).toHaveLength(2);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  // US-003 case 2: stale-generation drained event is dropped.
  it('iOS: stale-generation voicePlaybackDrained is ignored', async () => {
    resetRnState('ios');
    const { PcmStreamPlayer } = loadPlayer();
    const onFinish = jest.fn();
    const player = new PcmStreamPlayer({ onPlaybackFinish: onFinish });

    await player.enqueue(makePcmChunk(60));
    await flushMicrotasks();

    player.endTurn(); // generation == 1
    await flushMicrotasks();

    // Simulate a late sentinel callback from a superseded prior turn.
    emitDrained({ turnGeneration: 999 });
    expect(onFinish).not.toHaveBeenCalled();

    // And a generation below current — equally stale.
    emitDrained({ turnGeneration: 0 });
    expect(onFinish).not.toHaveBeenCalled();

    // Clear the in-flight safety-net timer so Jest doesn't hold a handle.
    await player.dispose();
  });

  // US-003 case 3: interrupt() bumps generation; subsequent matching event is dropped.
  it('iOS: interrupt() bumps generation so prior-turn drain event is dropped', async () => {
    resetRnState('ios');
    const { PcmStreamPlayer } = loadPlayer();
    const onFinish = jest.fn();
    const player = new PcmStreamPlayer({ onPlaybackFinish: onFinish });

    await player.enqueue(makePcmChunk(60));
    await flushMicrotasks();

    player.endTurn(); // generation == 1
    await flushMicrotasks();
    await player.interrupt(); // generation == 2, any gen-1 event now stale
    await flushMicrotasks();

    emitDrained({ turnGeneration: 1 });
    expect(onFinish).not.toHaveBeenCalled();

    // Clear any residual timers before the test exits.
    await player.dispose();
  });

  // US-004: Android-like module falls back to polling (no endTurn bridge method).
  it('Android: endTurn() falls back to scheduleDrainCheck polling when native lacks endTurn', async () => {
    resetRnState('android');
    jest.useFakeTimers();
    const { PcmStreamPlayer } = loadPlayer();
    const onFinish = jest.fn();
    const player = new PcmStreamPlayer({ onPlaybackFinish: onFinish });

    await player.enqueue(makePcmChunk(60));
    await Promise.resolve(); // let ensureReady resolve
    await Promise.resolve();

    player.endTurn();
    // scheduleDrainCheck() arms a 120 ms timer; advance past it.
    jest.advanceTimersByTime(130);
    // checkDrain() awaits playbackPosition() — drain the microtask queue.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  // US-003 / AC-5: safety-net fallback fires + console.warn when native event goes missing.
  it('iOS: safety-net timer fires console.warn and onPlaybackFinish when drained event never arrives', async () => {
    resetRnState('ios');
    jest.useFakeTimers();
    const { PcmStreamPlayer } = loadPlayer();
    const onFinish = jest.fn();
    const player = new PcmStreamPlayer({ onPlaybackFinish: onFinish });

    await player.enqueue(makePcmChunk(60));
    // ensureReady's await is microtask-queued; flush without advancing timers.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    player.endTurn();
    // safetyMs = max(1000, min(15000, expected + 2000)); for 60 ms of audio
    // expected=60 ms → safety=2060 ms → 3000 ms is well past.
    jest.advanceTimersByTime(3000);
    await Promise.resolve();

    expect(onFinish).toHaveBeenCalledTimes(1);
    const warned = warnSpy.mock.calls.some((args) =>
      typeof args[0] === 'string' && args[0].includes('drain fallback fired'),
    );
    expect(warned).toBe(true);
  });

  // US-004: NativeEventEmitter constructor failure is non-fatal; polling still works.
  it('iOS: NativeEventEmitter ctor throws → subscription stays null, warn logged, polling path survives', async () => {
    resetRnState('ios');
    RN_STATE.emitterCtorShouldThrow = true;
    jest.useFakeTimers();
    const { PcmStreamPlayer } = loadPlayer();
    const onFinish = jest.fn();
    const player = new PcmStreamPlayer({ onPlaybackFinish: onFinish });

    await player.enqueue(makePcmChunk(60));
    // Drain the ensureReady() await chain via microtasks.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const subscribeWarn = warnSpy.mock.calls.some((args) =>
      typeof args[0] === 'string' && args[0].includes('voicePlaybackDrained subscription failed'),
    );
    expect(subscribeWarn).toBe(true);

    // With endTurn() present on iOS mock, the primary path still wires the
    // safety-net timer; even though no listener is registered we eventually
    // resolve via the safety fallback, proving the no-subscription path is
    // not a hang.
    player.endTurn();
    jest.advanceTimersByTime(3000);
    await Promise.resolve();
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  // Post-architect gap: two consecutive endTurn() calls without intervening
  // feed/interrupt. First sentinel's matching-generation event must NOT fire
  // onPlaybackFinish (JS has already bumped to gen=2); second sentinel does.
  it('iOS: consecutive endTurn() supersedes prior generation; only latest fires onPlaybackFinish', async () => {
    resetRnState('ios');
    jest.useFakeTimers();
    const { PcmStreamPlayer } = loadPlayer();
    const onFinish = jest.fn();
    const player = new PcmStreamPlayer({ onPlaybackFinish: onFinish });

    await player.enqueue(makePcmChunk(60));
    await Promise.resolve();

    player.endTurn(); // JS gen: 0 → 1
    player.endTurn(); // JS gen: 1 → 2 (supersedes prior)

    // Simulate native emitting for the first (superseded) sentinel.
    const listeners = RN_STATE.listeners['voicePlaybackDrained'] ?? [];
    listeners.forEach((l) =>
      l({ turnGeneration: 1, framesPlayed: 1440, framesScheduled: 1440, reason: 'sentinel' }),
    );
    expect(onFinish).not.toHaveBeenCalled();

    // Simulate native emitting for the second (current) sentinel.
    listeners.forEach((l) =>
      l({ turnGeneration: 2, framesPlayed: 1440, framesScheduled: 1440, reason: 'sentinel' }),
    );
    expect(onFinish).toHaveBeenCalledTimes(1);

    // Advance past the safety-net to confirm no double-fire.
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  // Post-architect gap: endTurn() before any enqueue() — ensureReady()
  // hasn't run, no NativeEventEmitter subscription exists. With no JS
  // listener, any native emit is dropped; safety-net timer catches and
  // fires onPlaybackFinish + warn at expectedMs+2000ms (=2000ms floor).
  // Verifies graceful no-subscription fallback (not a regression).
  it('iOS: endTurn() before enqueue() falls back to safety-net timer with warn', async () => {
    resetRnState('ios');
    jest.useFakeTimers();
    const { PcmStreamPlayer } = loadPlayer();
    const onFinish = jest.fn();
    const player = new PcmStreamPlayer({ onPlaybackFinish: onFinish });

    // No enqueue — ensureReady() has NOT been called, so no subscription.
    player.endTurn();

    // Safety-net = max(1000, min(15000, 0+2000)) = 2000ms.
    jest.advanceTimersByTime(2100);
    await Promise.resolve();

    expect(onFinish).toHaveBeenCalledTimes(1);
    const fallbackWarn = warnSpy.mock.calls.some(
      (args) => typeof args[0] === 'string' && args[0].includes('drain fallback fired'),
    );
    expect(fallbackWarn).toBe(true);
  });
});
