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
  const playerInstances: any[] = [];
  createAudioPlayerMock.mockImplementation(() => {
    const listeners: Array<(status: any) => void> = [];
    const player = {
      play: jest.fn(),
      pause: jest.fn(),
      replace: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn((_event: string, cb: any) => {
        listeners.push(cb);
      }),
      __fire: () => {
        const current = listeners.splice(0, listeners.length);
        for (const l of current) l({ didJustFinish: true });
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

function makeSeedStore(seed: number[] | null): JitterSeedStore | null {
  if (!seed) return null;
  return {
    read: () => [...seed],
    write: jest.fn(),
  };
}

const MODE_TEST_POLICY = {
  ...DEFAULT_BUFFER_POLICY,
  poorNetworkThreshold: 1,
  refillTimeoutMs: 50,
  refillPollMinMs: 5,
  flushDelayMs: 10_000,
};

describe('AudioPlaybackService.mode-switch', () => {
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

  async function feedUntilFirstPlay(
    service: AudioPlaybackService,
    count = 6,
    chunkMs = 60,
    cadenceMs = 70,
  ): Promise<void> {
    for (let i = 0; i < count; i++) {
      service.enqueue(makePcmChunk(chunkMs));
      await flushMicrotasks();
      if (i < count - 1) {
        jest.advanceTimersByTime(cadenceMs);
        await flushMicrotasks();
      }
    }
  }

  async function runPoorTurn(service: AudioPlaybackService, fireCompletion: () => void): Promise<void> {
    await feedUntilFirstPlay(service);
    fireCompletion();
    await flushMicrotasks();
    jest.advanceTimersByTime(MODE_TEST_POLICY.refillTimeoutMs + 5);
    await flushMicrotasks();
    service.endTurn();
    await flushMicrotasks();
  }

  async function runGoodTurn(service: AudioPlaybackService, fireCompletion: () => void): Promise<void> {
    await feedUntilFirstPlay(service);
    service.endTurn();
    await flushMicrotasks();
    fireCompletion();
    await flushMicrotasks();
  }

  test('mid-turn poor-network escalation preserves the fast classification until the next-turn floor changes', async () => {
    const { fireCompletion } = installControllablePlayer();
    const modes: string[] = [];
    const service = new AudioPlaybackService(MODE_TEST_POLICY, makeSeedStore([20, 20, 20, 20]));
    service.onAudioModeChange((mode) => modes.push(mode));

    await feedUntilFirstPlay(service);
    expect(modes).toEqual(['fast']);

    fireCompletion();
    await flushMicrotasks();
    jest.advanceTimersByTime(MODE_TEST_POLICY.refillTimeoutMs + 5);
    await flushMicrotasks();

    expect(service.getTurnMetrics().prebufferMs).toBeGreaterThan(0);
    expect(modes[0]).toBe('fast');
    service.dispose();
  });

  test('two poor turns followed by a good turn keep transitions observable without trapping the session', async () => {
    const { fireCompletion } = installControllablePlayer();
    const modes: string[] = [];
    const service = new AudioPlaybackService(MODE_TEST_POLICY, makeSeedStore([20, 20, 20, 20]));
    service.onAudioModeChange((mode) => modes.push(mode));

    await runPoorTurn(service, fireCompletion);
    await runPoorTurn(service, fireCompletion);
    await runGoodTurn(service, fireCompletion);
    await feedUntilFirstPlay(service);

    expect(modes.filter((mode) => mode === 'fast').length).toBeGreaterThanOrEqual(1);
    expect(service.getTurnMetrics().underrunCount).toBe(0);
    service.dispose();
  });

  test('one poor turn with no seed does not trap the next turn in cautious mode', async () => {
    const { fireCompletion } = installControllablePlayer();
    const modes: string[] = [];
    const service = new AudioPlaybackService(MODE_TEST_POLICY, makeSeedStore(null));
    service.onAudioModeChange((mode) => modes.push(mode));

    await runPoorTurn(service, fireCompletion);
    await feedUntilFirstPlay(service);

    expect(modes).not.toContain('cautious');
    service.dispose();
  });

  test('seed-poor sessions emit one callback per actual transition with no duplicate repeats', async () => {
    const { fireCompletion } = installControllablePlayer();
    const modes: string[] = [];
    const service = new AudioPlaybackService(MODE_TEST_POLICY, makeSeedStore([200, 200, 200, 200]));
    service.onAudioModeChange((mode) => modes.push(mode));

    await runPoorTurn(service, fireCompletion);
    await feedUntilFirstPlay(service, 10, 60, 60);

    expect(modes).toEqual(['cautious', 'full_buffer', 'cautious']);
    service.dispose();
  });

  test('mode-switch path reports a non-zero average segment size after buffered playback', async () => {
    const service = new AudioPlaybackService(MODE_TEST_POLICY, makeSeedStore([200, 200, 200, 200]));

    for (let i = 0; i < 4; i++) {
      service.enqueue(makePcmChunk(160));
      await flushMicrotasks();
      jest.advanceTimersByTime(200);
      await flushMicrotasks();
    }

    service.endTurn();
    await flushMicrotasks();

    expect(service.getTurnMetrics().avgSegmentMs).toBeGreaterThan(0);
    service.dispose();
  });
});
