/**
 * PcmStreamPlayer — thin JS wrapper around the native PcmStreamModule.
 *
 * Matches the public API surface that useGeminiConversation expects from
 * AudioPlaybackService so swapping the import is the only hook change
 * needed.
 *
 * Streaming semantics:
 *   - enqueue(base64) pushes PCM straight into the Android AudioTrack. No WAV
 *     header, no MediaPlayer swap — that's what eliminates the clicks on
 *     MIUI + SD 7-series.
 *   - endTurn() marks the turn closed and polls the native playback head
 *     position to fire `onPlaybackFinish` once the buffered tail has drained.
 *   - interrupt() tells the native track to flush queued samples for barge-in.
 */
import { NativeModules } from 'react-native';
import type { AudioMode } from '../state/voiceAssistantStore';

const SAMPLE_RATE = 24_000;
const BYTES_PER_SAMPLE = 2;

interface NativePcmStreamModule {
  init(rate: number): Promise<void>;
  feed(base64: string): Promise<number>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  clear(): Promise<void>;
  close(): Promise<void>;
  playbackPosition(): Promise<number>;
}

const Native = NativeModules.PcmStreamModule as NativePcmStreamModule | undefined;

export interface PcmStreamPlayerCallbacks {
  onPlaybackStart?: () => void;
  onPlaybackFinish?: () => void;
  onBufferingChange?: (buffering: boolean) => void;
}

export class PcmStreamPlayer {
  private ready = false;
  private turnOpen = false;
  private firstPlayFired = false;
  private disposed = false;
  private fedFrames = 0;
  private drainTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAudioLevel = 0;
  private callbacks: PcmStreamPlayerCallbacks;

  constructor(callbacks: PcmStreamPlayerCallbacks = {}) {
    this.callbacks = callbacks;
    if (!Native) {
      // Soft-fail: keep an empty shell so unit tests and the iOS side don't
      // crash. The hook still tries to feed audio but every call no-ops.
      // eslint-disable-next-line no-console
      console.warn('[PcmStreamPlayer] Native PcmStreamModule missing — audio playback disabled');
    }
  }

  get isPlaying(): boolean {
    return this.turnOpen || this.drainTimer !== null;
  }

  get audioLevel(): number {
    return this.lastAudioLevel;
  }

  private async ensureReady(): Promise<boolean> {
    if (!Native) return false;
    if (this.ready) return true;
    try {
      await Native.init(SAMPLE_RATE);
      this.ready = true;
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[PcmStreamPlayer] init failed', err);
      return false;
    }
  }

  async enqueue(base64: string): Promise<void> {
    if (this.disposed) return;
    if (!base64 || base64.length < 4) return;

    if (!(await this.ensureReady())) return;

    this.turnOpen = true;

    // Cheap audio-level sample for the visualiser — 16 PCM samples is enough.
    this.lastAudioLevel = sampleRms(base64);

    // Fed frames tracker lets us schedule onPlaybackFinish accurately: we
    // know how many frames we pushed in and the native AudioTrack clock tells
    // us how many have actually played out.
    const approxFrames = Math.floor((base64.length * 3) / 4 / BYTES_PER_SAMPLE);
    this.fedFrames += approxFrames;

    // Fire-and-forget: the native writer thread owns WRITE_BLOCKING and the
    // only useful signal back here was the byte count, which we don't need.
    // Awaiting cost us ~one bridge round-trip per 20 ms chunk (~50 Hz) and
    // serialized enqueue() under a Promise chain whenever JS was busy.
    Native!.feed(base64).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[PcmStreamPlayer] feed failed', err);
    });

    if (!this.firstPlayFired) {
      this.firstPlayFired = true;
      this.callbacks.onPlaybackStart?.();
    }
  }

  /**
   * Pre-warm the native AudioTrack before the first chunk arrives. Saves the
   * 40–80 ms that AudioTrack.Builder + play() would otherwise tack onto the
   * first-audio latency. Safe to call multiple times — ensureReady() is
   * idempotent.
   */
  async prewarm(): Promise<void> {
    if (this.disposed) return;
    await this.ensureReady();
  }

  endTurn(): void {
    this.turnOpen = false;
    if (this.disposed) return;
    this.scheduleDrainCheck();
  }

  flush(): void {
    this.endTurn();
  }

  async interrupt(): Promise<void> {
    if (this.disposed) return;
    this.turnOpen = false;
    this.firstPlayFired = false;
    this.fedFrames = 0;
    this.lastAudioLevel = 0;
    this.clearDrainTimer();
    if (Native && this.ready) {
      try {
        await Native.clear();
      } catch {
        /* best effort */
      }
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.clearDrainTimer();
    if (Native && this.ready) {
      try {
        await Native.close();
      } catch {
        /* ignore */
      }
    }
    this.ready = false;
  }

  onPlaybackStart(fn: () => void): void {
    this.callbacks = { ...this.callbacks, onPlaybackStart: fn };
  }

  onPlaybackFinish(fn: () => void): void {
    this.callbacks = { ...this.callbacks, onPlaybackFinish: fn };
  }

  onBufferingChange(fn: (buffering: boolean) => void): void {
    this.callbacks = { ...this.callbacks, onBufferingChange: fn };
  }

  // Legacy shims for the AudioPlaybackService API surface.
  onPoorNetwork(_fn: (poor: boolean) => void): void {
    /* streaming mode can't easily distinguish this */
  }

  onAudioModeChange(_fn: (mode: AudioMode) => void): void {
    /* audio session is managed by the native module */
  }

  markSentenceBoundary(): void {
    /* no-op for continuous streaming */
  }

  getTurnMetrics(): { fedFrames: number } {
    return { fedFrames: this.fedFrames };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Private helpers

  private scheduleDrainCheck(): void {
    this.clearDrainTimer();
    if (!Native || !this.ready) {
      // Native unavailable — fire finish immediately so the state machine
      // doesn't stall.
      this.callbacks.onPlaybackFinish?.();
      this.firstPlayFired = false;
      return;
    }
    this.drainTimer = setTimeout(() => this.checkDrain(), 120);
  }

  private async checkDrain(): Promise<void> {
    this.drainTimer = null;
    if (this.disposed) return;
    if (!Native || !this.ready) return;
    try {
      const played = await Native.playbackPosition();
      const remainingFrames = Math.max(0, this.fedFrames - played);
      if (remainingFrames <= 0) {
        this.callbacks.onPlaybackFinish?.();
        this.firstPlayFired = false;
        this.fedFrames = 0;
        return;
      }
      const remainingMs = (remainingFrames / SAMPLE_RATE) * 1000;
      // Re-check shortly before the next expected drain. Cap at 250ms to
      // handle the end-of-turn tail cleanly without busy-polling.
      const nextCheckMs = Math.min(250, Math.max(50, remainingMs));
      this.drainTimer = setTimeout(() => this.checkDrain(), nextCheckMs);
    } catch {
      // On any native error, fall back to firing finish immediately.
      this.callbacks.onPlaybackFinish?.();
      this.firstPlayFired = false;
    }
  }

  private clearDrainTimer(): void {
    if (this.drainTimer !== null) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
  }
}

function sampleRms(base64: string): number {
  if (!base64 || base64.length < 16) return 0;
  // Decode just the first 32 bytes to estimate amplitude — good enough for
  // the waveform visualiser and ~10x cheaper than a full decode.
  try {
    const head = globalThis.atob(base64.slice(0, 44));
    let sum = 0;
    let count = 0;
    for (let i = 0; i + 1 < head.length; i += 2) {
      const s = (head.charCodeAt(i) | (head.charCodeAt(i + 1) << 8)) / 32768;
      sum += s * s;
      count += 1;
    }
    return count > 0 ? Math.min(1, Math.sqrt(sum / count) * 5) : 0;
  } catch {
    return 0;
  }
}
