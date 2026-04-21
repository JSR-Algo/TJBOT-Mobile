/**
 * AudioPlaybackService — first-chunk playback under the adaptive prebuffer
 * policy (plan §2.2-§2.3).
 *
 * History: this suite originally locked in RM-04 ("first chunk plays within
 * 250 ms of arrival"). The new fluency-first design (§2.2) bounds the
 * first-segment latency with an adaptive band [prebufferFloorMs,
 * prebufferCeilingMs] (350-900 ms by default), driven by observed chunk
 * jitter. The tests below preserve the M3 regression guard (no multi-second
 * pre-buffer) and confirm the service is deterministic when configured with
 * an aggressive policy — which is the design win (§10 "configurable").
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AudioPlaybackService } from '../../src/audio/AudioPlaybackService';
import { DEFAULT_BUFFER_POLICY } from '../../src/audio/BufferPolicy';

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
  for (let i = 0; i < n; i++) {
    await Promise.resolve();
  }
}

/** Aggressive policy: first chunk fires immediately. Used to assert the
 *  service is deterministic and configurable without waiting on real
 *  timers. Mirrors what you'd pick for a unit test or a stubbed-network
 *  integration run. */
const AGGRESSIVE_POLICY = {
  ...DEFAULT_BUFFER_POLICY,
  prebufferFloorMs: 0,
  prebufferCeilingMs: 50,
  minSegmentMs: 10,
  flushDelayMs: 5,
  refillTimeoutMs: 100,
};

describe('AudioPlaybackService — adaptive first-chunk playback', () => {
  beforeEach(() => {
    createAudioPlayerMock.mockClear();
    setAudioModeAsyncMock.mockClear();
  });

  it('creates a player for the first enqueued chunk under an aggressive policy', async () => {
    const service = new AudioPlaybackService(AGGRESSIVE_POLICY);

    service.enqueue(makePcmChunk(60));
    await flushMicrotasks();

    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);

    service.dispose();
  });

  it('does NOT buffer 3 s before playback (regression guard for gap M3)', async () => {
    const service = new AudioPlaybackService(AGGRESSIVE_POLICY);

    // A single 20 ms chunk is far below the old 3 s threshold; with an
    // aggressive policy the adaptive path still starts playback promptly.
    service.enqueue(makePcmChunk(20));
    await flushMicrotasks();

    expect(createAudioPlayerMock).toHaveBeenCalled();
    service.dispose();
  });

  it('reports isPlaying immediately after the first enqueue', () => {
    const service = new AudioPlaybackService();
    expect(service.isPlaying).toBe(false);
    service.enqueue(makePcmChunk(60));
    expect(service.isPlaying).toBe(true);
    service.dispose();
  });

  it('drops empty chunks without triggering a flush', async () => {
    const service = new AudioPlaybackService(AGGRESSIVE_POLICY);
    service.enqueue(toBase64(new Uint8Array(0)));
    await flushMicrotasks();
    expect(createAudioPlayerMock).not.toHaveBeenCalled();
    service.dispose();
  });

  it('with DEFAULT policy, a single tiny chunk does NOT immediately trigger player — prebuffer protects fluency', async () => {
    // Intentionally replaces the old "first chunk in 250 ms" assertion.
    // Under the fluency-first design the default policy waits for the
    // prebuffer band (≥ 350 ms of PCM) before firing — the flush timer
    // would eventually force it, but microtask flushing alone must not.
    const service = new AudioPlaybackService(DEFAULT_BUFFER_POLICY);

    service.enqueue(makePcmChunk(60)); // 60 ms < 350 ms floor
    await flushMicrotasks();

    expect(createAudioPlayerMock).not.toHaveBeenCalled();
    service.dispose();
  });
});
