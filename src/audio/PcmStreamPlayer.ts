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
 *   - endTurn() marks the turn closed. On iOS, native schedules a tail
 *     sentinel buffer and emits `voicePlaybackDrained` when it completes —
 *     see .omc/plans/ios-voice-drain-sentinel-2026-04-22.md. On Android
 *     (no endTurn bridge), the existing polling path drains via
 *     Native.playbackPosition().
 *   - interrupt() tells the native track to flush queued samples for barge-in.
 */
import { NativeEventEmitter, NativeModules, type EmitterSubscription } from 'react-native';
import type { AudioMode } from '../state/voiceAssistantStore';
import { jsErrorBreadcrumb } from '../observability/voice-telemetry';

const SAMPLE_RATE = 24_000;
const BYTES_PER_SAMPLE = 2;

interface NativePcmStreamModule {
  // Android exposes `init`; iOS exposes `initWithRate` because Swift/ObjC
  // reserve the `init` selector. Both shapes are accepted — see
  // `callInit` below.
  init?(rate: number): Promise<void>;
  initWithRate?(rate: number): Promise<void>;
  feed(base64: string): Promise<number>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  clear(): Promise<void>;
  close(): Promise<void>;
  playbackPosition(): Promise<number>;
  // iOS adds endTurn() to trigger a sentinel-buffer drain; Android keeps
  // the polling-based path below via scheduleDrainCheck(). Optional so we
  // can probe for it with `typeof Native.endTurn === 'function'` without
  // breaking Android's native module contract.
  endTurn?(): Promise<void>;
}

interface DrainedEvent {
  turnGeneration: number;
  framesPlayed: number;
  framesScheduled: number;
  reason: string;
}

const Native = NativeModules.PcmStreamModule as NativePcmStreamModule | undefined;

function callInit(native: NativePcmStreamModule, rate: number): Promise<void> {
  if (typeof native.init === 'function') return native.init(rate);
  if (typeof native.initWithRate === 'function') return native.initWithRate(rate);
  return Promise.reject(new Error('PcmStreamModule missing init/initWithRate'));
}

export interface PlaybackStalledPayload {
  bufferedMs: number;
  framesSinceLastAdvance: number;
}

export interface PcmStreamPlayerCallbacks {
  onPlaybackStart?: () => void;
  onPlaybackFinish?: () => void;
  onBufferingChange?: (buffering: boolean) => void;
  /**
   * Fired when the native player stalls twice without an intervening
   * successful drain. Native attempts single-stall recovery internally;
   * a second stall in a row means that recovery failed — the caller should
   * tear down the session and surface to the user. See A4 (post-2026-04-24
   * Wave A hardening).
   */
  onFatalStall?: (payload: PlaybackStalledPayload) => void;
}

export class PcmStreamPlayer {
  private ready = false;
  private readyPromise: Promise<boolean> | null = null;
  private turnOpen = false;
  private firstPlayFired = false;
  private disposed = false;
  private fedFrames = 0;
  private drainTimer: ReturnType<typeof setTimeout> | null = null;
  private drainDeadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAudioLevel = 0;
  private callbacks: PcmStreamPlayerCallbacks;
  // iOS drain subscription. `null` on Android (native event never fires)
  // or when NativeEventEmitter construction fails; either way the polling
  // fallback in endTurn() still works.
  private drainSubscription: EmitterSubscription | null = null;
  // iOS stall subscription. Native attempts single-stall recovery on the
  // first event; the second consecutive event (without an intervening clean
  // drain) indicates recovery failed and the caller should surface an error.
  private stallSubscription: EmitterSubscription | null = null;
  private stallCount = 0;
  // Monotonically increasing per endTurn()/interrupt(). Guards against
  // stale voicePlaybackDrained events after barge-in or a superseded turn.
  // Exposed via the public getter below so JS enqueue-loop sites
  // (useGeminiConversation.ts P0-7 fence) can read it without reaching
  // through private state.
  private _turnGeneration = 0;
  public get turnGeneration(): number {
    return this._turnGeneration;
  }

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
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = (async () => {
      try {
        await callInit(Native, SAMPLE_RATE);
        this.ready = true;
        if (Native && !this.drainSubscription) {
          try {
            // NativeEventEmitter wants a narrow addListener/removeListeners
            // shape; RCTEventEmitter-backed modules provide both. This cast
            // is the accepted RN idiom — not a widening `any`.
            const emitter = new NativeEventEmitter(
              Native as unknown as {
                addListener: (e: string) => void;
                removeListeners: (n: number) => void;
              },
            );
            this.drainSubscription = emitter.addListener(
              'voicePlaybackDrained',
              (evt: DrainedEvent) => {
                this.handleNativeDrained(evt);
              },
            );
            this.stallSubscription = emitter.addListener(
              'voicePlaybackStalled',
              (evt: PlaybackStalledPayload) => {
                this.handleNativeStall(evt);
              },
            );
          } catch (err) {
            // Non-iOS or emitter unavailable — polling fallback still works.
            // eslint-disable-next-line no-console
            console.warn(
              '[PcmStreamPlayer] voicePlaybackDrained subscription failed — using polling fallback',
              err,
            );
          }
        }
        return true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[PcmStreamPlayer] init failed', err);
        return false;
      } finally {
        this.readyPromise = null;
      }
    })();

    return this.readyPromise;
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
      jsErrorBreadcrumb('pcmStream.feed', err, { fedFrames: this.fedFrames });
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[PcmStreamPlayer] feed failed', err);
      }
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
    this.clearDrainTimer();

    const generation = ++this._turnGeneration;

    // Preferred path: native emits voicePlaybackDrained after tail sentinel
    // completes. See .omc/plans/ios-voice-drain-sentinel-2026-04-22.md.
    if (Native && typeof Native.endTurn === 'function') {
      Native.endTurn().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn(
          '[PcmStreamPlayer] native endTurn failed — using polling fallback',
          err,
        );
        this.scheduleDrainCheck();
      });
      // Safety net: if the native event never arrives within expected
      // duration + 2 s, fire fallback with a warning. Should never trigger
      // under normal operation; presence in logs signals a native regression.
      const expectedMs = (this.fedFrames / SAMPLE_RATE) * 1000;
      const safetyMs = Math.max(1000, Math.min(15_000, expectedMs + 2_000));
      this.drainDeadlineTimer = setTimeout(() => {
        this.drainDeadlineTimer = null;
        if (this._turnGeneration !== generation || this.disposed) return;
        // eslint-disable-next-line no-console
        console.warn('[PcmStreamPlayer] drain fallback fired — native event missed');
        this.fireFinish(generation);
      }, safetyMs);
      return;
    }

    // Android / no-endTurn path: existing polling-based drain.
    this.scheduleDrainCheck();
  }

  private handleNativeDrained(evt: DrainedEvent): void {
    if (this.disposed) return;
    if (evt.turnGeneration !== this._turnGeneration) return; // stale / superseded
    // A clean drain means the native player advanced through the whole turn
    // without giving up — reset the stall counter so the next stall is
    // treated as "first in a row" again.
    this.stallCount = 0;
    this.fireFinish(evt.turnGeneration);
  }

  private handleNativeStall(evt: PlaybackStalledPayload): void {
    if (this.disposed) return;
    this.stallCount += 1;
    // Native handles first-stall recovery internally. We only escalate on
    // the second consecutive stall (no clean drain between them) — at that
    // point native recovery has failed and JS must tear down the session.
    if (this.stallCount >= 2) {
      this.callbacks.onFatalStall?.(evt);
      this.stallCount = 0; // avoid re-firing on every subsequent event
    }
  }

  private fireFinish(generation: number): void {
    if (this._turnGeneration !== generation) return;
    this.clearDrainTimer();
    this.callbacks.onPlaybackFinish?.();
    this.firstPlayFired = false;
    this.fedFrames = 0;
  }

  flush(): void {
    this.endTurn();
  }

  async interrupt(): Promise<void> {
    if (this.disposed) return;
    this.turnOpen = false;
    this._turnGeneration++; // invalidate any pending native drain event
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
    this.drainSubscription?.remove();
    this.drainSubscription = null;
    this.stallSubscription?.remove();
    this.stallSubscription = null;
    this.stallCount = 0;
    if (Native && this.ready) {
      try {
        await Native.close();
      } catch {
        /* ignore */
      }
    }
    this.ready = false;
  }

  /**
   * Soft reset after the underlying native engine was torn down (media
   * services reset; interruption recovery). Differs from dispose() in that
   * the instance remains usable — the next enqueue() triggers ensureReady()
   * which re-inits the native module on the fresh engine. P0-5b.
   *
   * Safe to call on an already-reset instance (idempotent).
   */
  async reset(): Promise<void> {
    if (this.disposed) return;
    this.clearDrainTimer();
    this.drainSubscription?.remove();
    this.drainSubscription = null;
    this.stallSubscription?.remove();
    this.stallSubscription = null;
    this.stallCount = 0;
    this.turnOpen = false;
    this.firstPlayFired = false;
    this.fedFrames = 0;
    this._turnGeneration++;
    this.lastAudioLevel = 0;
    if (Native && this.ready) {
      try {
        await Native.close();
      } catch {
        /* best-effort; the native side may already be torn down by the engine reset */
      }
    }
    this.ready = false;
    this.readyPromise = null;
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

  onFatalStall(fn: (payload: PlaybackStalledPayload) => void): void {
    this.callbacks = { ...this.callbacks, onFatalStall: fn };
  }

  // Legacy shims for the AudioPlaybackService API surface.
  onPoorNetwork(fn: (poor: boolean) => void): void {
    void fn;
    /* streaming mode can't easily distinguish this */
  }

  onAudioModeChange(fn: (mode: AudioMode) => void): void {
    void fn;
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
    if (this.drainDeadlineTimer !== null) {
      clearTimeout(this.drainDeadlineTimer);
      this.drainDeadlineTimer = null;
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
