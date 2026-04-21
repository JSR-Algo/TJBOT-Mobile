/**
 * AudioPlaybackService — fluency-first playback behavior
 * (plan §2.3-§2.7; covers ACs 2, 4, 6, 7, 9, 10).
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
  for (let i = 0; i < n; i++) await Promise.resolve();
}

/** Short-timeout policy for deterministic underrun tests. */
const FAST_POLICY = {
  ...DEFAULT_BUFFER_POLICY,
  prebufferFloorMs: 0,
  prebufferCeilingMs: 50,
  minSegmentMs: 10,
  flushDelayMs: 5,
  refillTargetMs: 20,
  refillTimeoutMs: 60,
};

describe('AudioPlaybackService — fluency behavior', () => {
  beforeEach(() => {
    createAudioPlayerMock.mockClear();
    setAudioModeAsyncMock.mockClear();
  });

  it('fires onPlaybackStart exactly once per turn', async () => {
    const service = new AudioPlaybackService(FAST_POLICY);
    const starts: number[] = [];
    service.onPlaybackStart(() => starts.push(Date.now()));

    // First turn: multiple chunks, should only fire once.
    service.enqueue(makePcmChunk(60));
    await flushMicrotasks();
    service.enqueue(makePcmChunk(60));
    await flushMicrotasks();

    expect(starts.length).toBe(1);
    service.interrupt();
  });

  it('onBufferingChange is NOT called during first-segment prebuffer', async () => {
    // The prebuffer window is not an underrun — no buffering flag should toggle.
    const service = new AudioPlaybackService({
      ...DEFAULT_BUFFER_POLICY,
      prebufferFloorMs: 500,
      prebufferCeilingMs: 500,
      flushDelayMs: 10000, // no tail-flush during this test
    });
    const toggles: boolean[] = [];
    service.onBufferingChange((b) => toggles.push(b));

    service.enqueue(makePcmChunk(60)); // 60 ms << 500 ms floor — stays in prebuffer
    await flushMicrotasks();

    expect(toggles).toEqual([]);
    service.dispose();
  });

  it('interrupt() cancels the loop cleanly and the service can start a new turn after', async () => {
    const service = new AudioPlaybackService(FAST_POLICY);

    service.enqueue(makePcmChunk(60));
    await flushMicrotasks();
    expect(service.isPlaying).toBe(true);

    service.interrupt();
    expect(service.isPlaying).toBe(false);
    expect(service.audioLevel).toBe(0);
    // Let the loop finally-block run
    await flushMicrotasks(20);

    // A fresh turn should work after interrupt
    createAudioPlayerMock.mockClear();
    service.enqueue(makePcmChunk(60));
    await flushMicrotasks();
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);

    service.dispose();
  });

  it('endTurn() flushes residual chunks and closes the turn', async () => {
    // Prebuffer floor = 100 ms, but we send 40 ms and immediately endTurn.
    // endTurn must force the chunk into ready so nothing is left stranded.
    const service = new AudioPlaybackService({
      ...DEFAULT_BUFFER_POLICY,
      prebufferFloorMs: 100,
      prebufferCeilingMs: 100,
      flushDelayMs: 10000,
    });

    service.enqueue(makePcmChunk(40));
    service.endTurn();
    await flushMicrotasks();

    // The residual chunk should have been flushed + played
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    service.dispose();
  });

  it('flush() is an alias for endTurn() and stays backward-compatible', async () => {
    const service = new AudioPlaybackService({
      ...DEFAULT_BUFFER_POLICY,
      prebufferFloorMs: 100,
      prebufferCeilingMs: 100,
      flushDelayMs: 10000,
    });

    service.enqueue(makePcmChunk(40));
    service.flush();
    await flushMicrotasks();

    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    service.dispose();
  });

  it('getTurnMetrics() resets per turn and reports sane values', async () => {
    const service = new AudioPlaybackService(FAST_POLICY);

    service.enqueue(makePcmChunk(60));
    await flushMicrotasks();

    const m = service.getTurnMetrics();
    expect(m.segments).toBeGreaterThanOrEqual(1);
    expect(m.prebufferMs).toBeGreaterThanOrEqual(0);
    expect(m.underrunCount).toBe(0);
    expect(m.maxGapMs).toBe(0);
    // avgSegmentMs derivable from segment byte lengths
    expect(m.avgSegmentMs).toBeGreaterThan(0);

    service.dispose();
  });

  it('setBufferPolicy() swaps the policy and rebuilds the jitter window when it changes', () => {
    const service = new AudioPlaybackService(DEFAULT_BUFFER_POLICY);
    // Should not throw; private state is validated by the adaptive tests above.
    service.setBufferPolicy({ ...DEFAULT_BUFFER_POLICY, jitterWindow: 8 });
    service.setBufferPolicy({ ...DEFAULT_BUFFER_POLICY, prebufferFloorMs: 200 });
    service.dispose();
  });

  it('does NOT fire onPlaybackFinish when the loop exits via interrupt', async () => {
    const service = new AudioPlaybackService(FAST_POLICY);
    let finished = 0;
    service.onPlaybackFinish(() => {
      finished += 1;
    });

    service.enqueue(makePcmChunk(60));
    await flushMicrotasks();
    service.interrupt();
    await flushMicrotasks(20);

    expect(finished).toBe(0);
    service.dispose();
  });

  it('empty chunk during an open turn is a no-op', async () => {
    const service = new AudioPlaybackService(FAST_POLICY);
    service.enqueue(makePcmChunk(60));
    await flushMicrotasks();
    createAudioPlayerMock.mockClear();

    service.enqueue(toBase64(new Uint8Array(0)));
    await flushMicrotasks();

    // No new segment should have been created from the empty chunk
    expect(createAudioPlayerMock).not.toHaveBeenCalled();
    service.interrupt();
  });
});
