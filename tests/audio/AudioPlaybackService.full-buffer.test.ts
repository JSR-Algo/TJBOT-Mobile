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

function makePcmChunk(ms = 500): string {
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

function makePoorSeedStore(): JitterSeedStore {
  return {
    read: () => [400, 400, 400, 400],
    write: jest.fn(),
  };
}

const FULL_BUFFER_TEST_POLICY = {
  ...DEFAULT_BUFFER_POLICY,
  flushDelayMs: 10_000,
  refillTimeoutMs: 50,
  refillPollMinMs: 5,
  poorNetworkThreshold: 1,
};

describe('AudioPlaybackService.full-buffer', () => {
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

  async function enqueueChunks(service: AudioPlaybackService, count: number, chunkMs = 500): Promise<void> {
    for (let i = 0; i < count; i++) {
      service.enqueue(makePcmChunk(chunkMs));
      await flushMicrotasks();
    }
  }

  test('flushes on turnComplete before full-buffer coverage is reached', async () => {
    const modes: string[] = [];
    const service = new AudioPlaybackService(FULL_BUFFER_TEST_POLICY, makePoorSeedStore());
    service.onAudioModeChange((mode) => modes.push(mode));

    await enqueueChunks(service, 2);
    expect(createAudioPlayerMock).not.toHaveBeenCalled();

    service.endTurn();
    await flushMicrotasks();

    expect(modes).toEqual(['full_buffer']);
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    service.dispose();
  });

  test('flushes when buffered audio reaches fullBufferMinCoverageMs', async () => {
    const service = new AudioPlaybackService(FULL_BUFFER_TEST_POLICY, makePoorSeedStore());

    await enqueueChunks(service, 4);
    expect(createAudioPlayerMock).not.toHaveBeenCalled();

    await enqueueChunks(service, 1);

    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    service.dispose();
  });

  test('flushes when fullBufferCeilingMs elapses before coverage is reached', async () => {
    const service = new AudioPlaybackService(FULL_BUFFER_TEST_POLICY, makePoorSeedStore());

    await enqueueChunks(service, 1);
    expect(createAudioPlayerMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(FULL_BUFFER_TEST_POLICY.fullBufferCeilingMs + 1);
    await flushMicrotasks();
    service.enqueue(makePcmChunk(10));
    await flushMicrotasks();

    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    service.dispose();
  });

  test('markSentenceBoundary does not early-flush before firstPlayFired in full_buffer mode', async () => {
    const service = new AudioPlaybackService(FULL_BUFFER_TEST_POLICY, makePoorSeedStore());

    await enqueueChunks(service, 2);
    service.markSentenceBoundary();
    await flushMicrotasks();

    expect(createAudioPlayerMock).not.toHaveBeenCalled();
    service.dispose();
  });

  test('interrupt drops all pending buffered audio synchronously in full_buffer mode', async () => {
    const service = new AudioPlaybackService(FULL_BUFFER_TEST_POLICY, makePoorSeedStore());

    await enqueueChunks(service, 2);
    service.interrupt();

    const internals = service as unknown as { chunks: Uint8Array[]; ready: Uint8Array[] };
    expect(internals.chunks.length).toBe(0);
    expect(internals.ready.length).toBe(0);
    service.dispose();
  });

  test('server slower than realtime still underruns after first play', async () => {
    const { fireCompletion } = installControllablePlayer();
    const service = new AudioPlaybackService(FULL_BUFFER_TEST_POLICY, makePoorSeedStore());

    await enqueueChunks(service, 5);
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);

    fireCompletion();
    await flushMicrotasks();
    jest.advanceTimersByTime(FULL_BUFFER_TEST_POLICY.refillTimeoutMs + 5);
    await flushMicrotasks();

    expect(service.getTurnMetrics().underrunCount).toBeGreaterThan(0);
    service.dispose();
  });
});
