import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { AudioPlaybackService } from '../../src/audio/AudioPlaybackService';
import { DEFAULT_BUFFER_POLICY } from '../../src/audio/BufferPolicy';
import type { JitterSeedStore } from '../../src/audio/JitterSeedStore';

const createAudioPlayerMock = createAudioPlayer as unknown as jest.Mock;
const setAudioModeAsyncMock = setAudioModeAsync as unknown as jest.Mock;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(binary, 'binary').toString('base64');
}

function makePcmChunk(ms = 60): string {
  const samples = Math.round((24000 * ms) / 1000);
  const bytes = new Uint8Array(samples * 2);
  for (let i = 0; i < samples; i++) {
    const v = Math.round(Math.sin((i / samples) * Math.PI * 2) * 1000);
    bytes[i * 2] = v & 0xff;
    bytes[i * 2 + 1] = (v >> 8) & 0xff;
  }
  return toBase64(bytes);
}

async function flushMicrotasks(n = 10): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve();
}

function installControllablePlayer(): { fireCompletion: () => void } {
  const playerInstances: Array<{ __fire: () => void }> = [];
  createAudioPlayerMock.mockImplementation(() => {
    const listeners: Array<(status: { didJustFinish?: boolean }) => void> = [];
    const player = {
      play: jest.fn(),
      pause: jest.fn(),
      replace: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn(
        (_event: string, cb: (status: { didJustFinish?: boolean }) => void) => {
          listeners.push(cb);
        },
      ),
      __fire: () => {
        const current = listeners.splice(0, listeners.length);
        for (const listener of current) listener({ didJustFinish: true });
      },
    };
    playerInstances.push(player);
    return player;
  });
  return {
    fireCompletion: () => {
      const player = playerInstances[playerInstances.length - 1];
      if (player) player.__fire();
    },
  };
}

function makeSeedStore(seed: number[] | null, write = jest.fn()): JitterSeedStore | null {
  if (!seed) return null;
  return {
    read: () => [...seed],
    write,
  };
}

const TEST_POLICY = {
  ...DEFAULT_BUFFER_POLICY,
  poorNetworkThreshold: 1,
  refillTimeoutMs: 50,
  refillPollMinMs: 5,
  flushDelayMs: 10_000,
};

describe('AudioPlaybackService.adversarial-lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    createAudioPlayerMock.mockReset();
    createAudioPlayerMock.mockImplementation(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      replace: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn(),
    }));
    setAudioModeAsyncMock.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('late hydrate equivalent: unseeded start stays unknown and later live samples do not crash the service', async () => {
    const modes: string[] = [];
    const service = new AudioPlaybackService(TEST_POLICY, makeSeedStore(null));
    service.onAudioModeChange((mode) => modes.push(mode));

    service.enqueue(makePcmChunk(60));
    await flushMicrotasks();
    expect(modes).toEqual([]);

    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(200);
      service.enqueue(makePcmChunk(60));
      await flushMicrotasks();
    }

    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    expect(() => service.dispose()).not.toThrow();
  });

  test('stale seed + improved live network → downshift full_buffer → fast within pre-first-play window, then stays fast', async () => {
    const modes: string[] = [];
    const service = new AudioPlaybackService(TEST_POLICY, makeSeedStore([400, 400, 400, 400]));
    service.onAudioModeChange((mode) => modes.push(mode));

    // 1st enqueue classifies from seed → full_buffer
    service.enqueue(makePcmChunk(60));
    await flushMicrotasks();
    expect(modes).toEqual(['full_buffer']);

    // 4 more live chunks 30ms apart → liveArrivalCount reaches 5, recentP95(5)
    // is dominated by 30ms live samples → re-classification gate fires ONCE
    // and downshifts full_buffer → fast before firstPlayFired.
    for (let i = 0; i < 4; i++) {
      jest.advanceTimersByTime(30);
      service.enqueue(makePcmChunk(60));
      await flushMicrotasks();
    }
    expect(modes).toEqual(['full_buffer', 'fast']);

    // Drain enough time + chunks for first play to fire.
    for (let i = 0; i < 40; i++) {
      service.enqueue(makePcmChunk(60));
      await flushMicrotasks();
      jest.advanceTimersByTime(30);
    }
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);

    // After firstPlayFired, further good live evidence must NOT trigger
    // another downshift — mid-turn downshift is explicitly deferred to iter 4.
    for (let i = 0; i < 6; i++) {
      jest.advanceTimersByTime(30);
      service.enqueue(makePcmChunk(60));
      await flushMicrotasks();
    }
    expect(modes).toEqual(['full_buffer', 'fast']);
    service.dispose();
  });

  test('false-positive ratchet does not trap the next turn floor after one poor turn without seed', async () => {
    const { fireCompletion } = installControllablePlayer();
    const modes: string[] = [];
    const service = new AudioPlaybackService(TEST_POLICY, makeSeedStore(null));
    service.onAudioModeChange((mode) => modes.push(mode));

    for (let i = 0; i < 6; i++) {
      service.enqueue(makePcmChunk(60));
      await flushMicrotasks();
      jest.advanceTimersByTime(70);
    }

    fireCompletion();
    await flushMicrotasks();
    jest.advanceTimersByTime(TEST_POLICY.refillTimeoutMs + 5);
    await flushMicrotasks();
    service.endTurn();
    await flushMicrotasks();

    const modesAfterPoorTurn = [...modes];

    for (let i = 0; i < 6; i++) {
      service.enqueue(makePcmChunk(60));
      await flushMicrotasks();
      jest.advanceTimersByTime(70);
    }

    expect(modesAfterPoorTurn).toContain('cautious');
    expect(modes.slice(modesAfterPoorTurn.length)).toEqual(['fast']);
    expect(modes).not.toContain('full_buffer');
    service.dispose();
  });

  test('server under realtime still reports underruns after full-buffer startup delay', async () => {
    const { fireCompletion } = installControllablePlayer();
    const modes: string[] = [];
    const service = new AudioPlaybackService(TEST_POLICY, makeSeedStore([400, 400, 400, 400]));
    service.onAudioModeChange((mode) => modes.push(mode));

    // Simulate slow arrivals: each 500ms chunk takes 600ms of wallclock to
    // arrive (50% realtime-ish), so live IATs stay above p95FullBufferThresholdMs
    // and the pre-first-play downshift never kicks in — classifier agrees
    // with the seed.
    for (let i = 0; i < 5; i++) {
      service.enqueue(makePcmChunk(500));
      await flushMicrotasks();
      jest.advanceTimersByTime(600);
      await flushMicrotasks();
    }

    expect(modes).toEqual(['full_buffer']);
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);

    fireCompletion();
    await flushMicrotasks();

    for (let i = 0; i < 3; i++) {
      jest.advanceTimersByTime(TEST_POLICY.refillTimeoutMs + 10);
      await flushMicrotasks();
      service.enqueue(makePcmChunk(250));
      await flushMicrotasks();
    }

    expect(service.getTurnMetrics().underrunCount).toBeGreaterThan(0);
    service.dispose();
  });

  test('navigate away and back preserves persisted seed but resets ratchet to the new instance', async () => {
    const persistedSamples: number[][] = [];
    const sharedWrite = jest.fn((samples: number[]) => {
      persistedSamples.length = 0;
      persistedSamples.push([...samples]);
    });

    const firstStore: JitterSeedStore = {
      read: () => null,
      write: sharedWrite,
    };

    const firstModes: string[] = [];
    const firstService = new AudioPlaybackService(TEST_POLICY, firstStore);
    firstService.onAudioModeChange((mode) => firstModes.push(mode));

    for (let i = 0; i < 6; i++) {
      jest.advanceTimersByTime(200);
      firstService.enqueue(makePcmChunk(60));
      await flushMicrotasks();
    }

    firstService.dispose();
    expect(sharedWrite).toHaveBeenCalled();
    expect(persistedSamples[0].length).toBeGreaterThan(0);

    const secondModes: string[] = [];
    const secondStore: JitterSeedStore = {
      read: () => [...persistedSamples[0]],
      write: sharedWrite,
    };
    const secondService = new AudioPlaybackService(TEST_POLICY, secondStore);
    secondService.onAudioModeChange((mode) => secondModes.push(mode));

    secondService.enqueue(makePcmChunk(60));
    await flushMicrotasks();

    expect(secondModes).toEqual(['cautious']);
    secondService.dispose();
  });
});
