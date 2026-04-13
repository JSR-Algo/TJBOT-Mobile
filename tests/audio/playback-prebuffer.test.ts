/**
 * RM-04 — AudioPlaybackService ring-buffer first-chunk playback.
 *
 * Acceptance criterion (Wave 2 brief, expressive-robot-companion-rewrite §6 RM-04):
 *   "first chunk plays within 250 ms of arrival"
 *
 * The previous implementation buffered 3 s of PCM before the first
 * `createAudioPlayer` call (see `tbot-mobile/src/audio/AudioPlaybackService.ts`
 * gap M3 in `.omc/plans/expressive-robot-companion-rewrite.md` §2.4). This
 * test locks in the new behaviour so a regression is caught at CI time.
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AudioPlaybackService } from '../../src/audio/AudioPlaybackService';

const createAudioPlayerMock = createAudioPlayer as unknown as jest.Mock;
const setAudioModeAsyncMock = setAudioModeAsync as unknown as jest.Mock;

/** Encode a Uint8Array as base64 (Node-side, mirrors what the wire delivers). */
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // jsdom / Node: prefer Buffer if global.btoa is missing
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(binary, 'binary').toString('base64');
}

/** Build a 60 ms PCM frame at 24 kHz mono 16-bit (≈ what one TTS chunk looks like). */
function makePcmChunk(ms = 60): string {
  const samples = Math.round((24000 * ms) / 1000);
  const bytes = new Uint8Array(samples * 2);
  // Fill with a tiny sine-ish pattern so it is not all zero.
  for (let i = 0; i < samples; i++) {
    const v = Math.round(Math.sin((i / samples) * Math.PI * 2) * 1000);
    bytes[i * 2] = v & 0xff;
    bytes[i * 2 + 1] = (v >> 8) & 0xff;
  }
  return toBase64(bytes);
}

/** Yield to microtasks N times so any async _process work completes. */
async function flushMicrotasks(n = 5): Promise<void> {
  for (let i = 0; i < n; i++) {
    await Promise.resolve();
  }
}

describe('AudioPlaybackService — ring-buffer first-chunk playback (RM-04)', () => {
  beforeEach(() => {
    createAudioPlayerMock.mockClear();
    setAudioModeAsyncMock.mockClear();
  });

  it('creates a player for the very first enqueued chunk (no 3 s pre-buffer)', async () => {
    const service = new AudioPlaybackService();

    service.enqueue(makePcmChunk(60));
    // Allow setAudioModeAsync + the first synchronous segment of _process to run.
    await flushMicrotasks();

    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);

    service.dispose();
  });

  it('first-chunk playback path resolves within the 250 ms acceptance budget (wall clock)', async () => {
    const service = new AudioPlaybackService();
    const t0 = Date.now();

    service.enqueue(makePcmChunk(60));
    await flushMicrotasks();

    const elapsed = Date.now() - t0;
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    expect(elapsed).toBeLessThan(250);

    service.dispose();
  });

  it('does NOT accumulate 3 s before the first playback (regression guard for gap M3)', async () => {
    const service = new AudioPlaybackService();

    // One small chunk — far below the old 3 s threshold (≈ 144 000 bytes).
    // With the regression in place, createAudioPlayer would NOT be called here.
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

  it('drops empty chunks without queuing a phantom first-segment flush', async () => {
    const service = new AudioPlaybackService();
    service.enqueue(toBase64(new Uint8Array(0)));
    await flushMicrotasks();
    expect(createAudioPlayerMock).not.toHaveBeenCalled();
    service.dispose();
  });
});
