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

function makeSeedStore(seed: number[] | null): JitterSeedStore | null {
  if (!seed) return null;
  return {
    read: () => [...seed],
    write: jest.fn(),
  };
}

describe('AudioPlaybackService.seeded-turn1', () => {
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

  async function enqueueWithCadence(
    service: AudioPlaybackService,
    count: number,
    chunkMs: number,
    cadenceMs: number,
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

  test('turn 1 with p95=200ms seed selects cautious and avoids the floor', async () => {
    const modes: string[] = [];
    const service = new AudioPlaybackService(DEFAULT_BUFFER_POLICY, makeSeedStore([200, 200, 200, 200]));
    service.onAudioModeChange((mode) => modes.push(mode));

    // Live cadence matches the seed (IAT ≈ 200ms) so the one-shot
    // pre-first-play re-classification confirms `cautious` (no downshift).
    // Live-and-seed-agree case: contradicting live evidence is tested in the
    // adversarial suite.
    await enqueueWithCadence(service, 10, 60, 200);

    expect(modes).toEqual(['cautious']);
    expect(service.getTurnMetrics().prebufferMs).toBeGreaterThanOrEqual(400);
    service.dispose();
  });

  test('turn 1 with p95=20ms seed selects fast and keeps prebuffer <= 600ms', async () => {
    const modes: string[] = [];
    const service = new AudioPlaybackService(DEFAULT_BUFFER_POLICY, makeSeedStore([20, 20, 20, 20]));
    service.onAudioModeChange((mode) => modes.push(mode));

    await enqueueWithCadence(service, 5, 60, 70);
    expect(createAudioPlayerMock).not.toHaveBeenCalled();

    await enqueueWithCadence(service, 1, 60, 70);

    expect(modes).toEqual(['fast']);
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    expect(service.getTurnMetrics().prebufferMs).toBeLessThanOrEqual(600);
    service.dispose();
  });

  test('turn 1 with no seed stays unknown and matches the iter2 floor behavior', async () => {
    const modes: string[] = [];
    const service = new AudioPlaybackService(DEFAULT_BUFFER_POLICY, makeSeedStore(null));
    service.onAudioModeChange((mode) => modes.push(mode));

    await enqueueWithCadence(service, 5, 60, 70);
    expect(createAudioPlayerMock).not.toHaveBeenCalled();

    await enqueueWithCadence(service, 1, 60, 70);

    expect(modes).toEqual([]);
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    expect(service.getTurnMetrics().prebufferMs).toBeGreaterThanOrEqual(250);
    expect(service.getTurnMetrics().prebufferMs).toBeLessThanOrEqual(600);
    service.dispose();
  });
});
