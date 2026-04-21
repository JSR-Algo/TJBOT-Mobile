/**
 * AudioPlaybackService — adaptive, underrun-resilient PCM 24 kHz playback.
 *
 * Strategy (plan §2, supersedes the earlier RM-04/ADR-011 ring-buffer notes):
 *   - Adaptive prebuffer: first segment fires when accumulated audio >=
 *     clampPrebuffer(jitter.p95IAT, policy) — bounded between policy.floor
 *     and policy.ceiling. On a fast network the prebuffer collapses to
 *     floor (≈350ms); on a bumpy network it stretches toward ceiling.
 *   - Mid-turn coalescing: subsequent segments flush when accumulated audio
 *     >= effectiveMinSegmentMs(p95, policy) OR when policy.flushDelayMs
 *     elapses since the last enqueue (tail-flush debounce). Segment target
 *     grows with observed jitter up to policy.maxSegmentMs (iter2 §2.1).
 *   - Underrun-resilient loop: one invocation of _runLoop lives for the
 *     whole turn. On starvation, the loop waits for a refill instead of
 *     exiting. This eliminates the F1 "800 ms mid-turn pause" from the
 *     pre-refactor implementation.
 *   - Escalation: after policy.maxConsecutiveUnderruns consecutive
 *     underruns in a turn, turnEscalated latches for the rest of the turn
 *     and the refill wait uses escalatedRefillTargetMs (iter2 §2.2).
 *   - Phrase-aware flush: the hook calls markSentenceBoundary() when
 *     outputTranscription delivers sentence terminators; the service tries
 *     to land the next segment boundary there (iter2 §2.3).
 *   - Cross-instance jitter seed: JitterMonitor is fed by a JitterSeedStore
 *     so turn 1 of a remounted service starts informed (iter2 §2.4).
 *   - Iter 3 evidence-gated ratchet: poorTurnStreak raises a floor only
 *     after repeated poor turns (or one poor turn plus seeded poor history),
 *     and a good turn decrements the streak instead of trapping the session.
 *   - Iter 3 allows at most one pre-first-play downshift re-classification
 *     when live samples contradict a stale seed. After firstPlayFired there is
 *     no mid-turn downshift; iter 2 escalation invariants still hold.
 *   - full_buffer is a bounded startup strategy only: it may delay the first
 *     underrun by holding playback up to fullBufferCeilingMs / coverage, but
 *     once first play begins the iter 2 underrun loop still owns continuity.
 *   - Interruption stays cheap: an InterruptSignal races every await point
 *     so interrupt() drops audio within one tick.
 *   - No magic numbers at call-sites; all timing comes from the injected
 *     BufferPolicy (constructor-injected or `setBufferPolicy`).
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import {
  BufferPolicy,
  DEFAULT_BUFFER_POLICY,
  POLICY_CAUTIOUS,
  POLICY_FAST,
  POLICY_FULL_BUFFER,
  clampPrebuffer,
  effectiveMinSegmentMs,
  effectiveRefillTargetMs,
} from './BufferPolicy';
import { JitterMonitor } from './JitterMonitor';
import {
  JitterSeedStore,
  defaultJitterSeedStore,
  persistentJitterSeedStore,
} from './JitterSeedStore';
import type { AudioMode } from '../state/voiceAssistantStore';

const INPUT_SAMPLE_RATE = 24000;
const SAMPLE_RATE = 24000; // Use Gemini's native rate; let AudioFlinger resample to 48 kHz.
const BYTES_PER_SAMPLE = 2;

export interface TurnMetrics {
  prebufferMs: number;
  underrunCount: number;
  p95IatMs: number | null;
  segments: number;
  avgSegmentMs: number;
  maxGapMs: number;
  // iter 2 (additive — back-compat preserved)
  escalated: boolean;
  maxConsecutiveUnderruns: number;
}

class InterruptedError extends Error {
  constructor() {
    super('audio playback interrupted');
    this.name = 'InterruptedError';
  }
}

interface InterruptSignal {
  aborted: boolean;
  promise: Promise<never>;
  abort: () => void;
}

function createInterruptSignal(): InterruptSignal {
  const signal = { aborted: false } as InterruptSignal;
  let abortFn: () => void = () => {};
  signal.promise = new Promise<never>((_, reject) => {
    abortFn = () => reject(new InterruptedError());
  });
  signal.promise.catch(() => {});
  signal.abort = () => {
    if (!signal.aborted) {
      signal.aborted = true;
      abortFn();
    }
  };
  return signal;
}

function pcmBytesToMs(bytes: number): number {
  // Input buffers from Gemini are 24 kHz — duration must use the input rate
  // even though we up-sample to 48 kHz before writing the WAV.
  return (bytes / (INPUT_SAMPLE_RATE * BYTES_PER_SAMPLE)) * 1000;
}

// Apply a ~5ms linear fade-in/out on both ends of a PCM16 mono buffer to
// kill the click at every segment boundary.
const FADE_SAMPLES_OUT = 120; // 5ms at 24kHz
function applyFadeInOut(pcm: Uint8Array): Uint8Array {
  const out = new Uint8Array(pcm);
  const totalSamples = Math.floor(out.length / 2);
  if (totalSamples <= 2 * FADE_SAMPLES_OUT) return out;
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  for (let i = 0; i < FADE_SAMPLES_OUT; i++) {
    const gain = i / FADE_SAMPLES_OUT;
    view.setInt16(i * 2, Math.round(view.getInt16(i * 2, true) * gain), true);
    const tail = (totalSamples - 1 - i) * 2;
    view.setInt16(tail, Math.round(view.getInt16(tail, true) * gain), true);
  }
  return out;
}

// Linearly upsample PCM16 mono 24 kHz → 48 kHz. Android's AudioFlinger
// resampler on budget Snapdragon 7-series produces audible artifacts on
// 24 kHz sources; feeding it a 48 kHz buffer skips that path entirely
// (DAC native rate, no resample). Linear interpolation is good enough for
// speech and adds ~40 µs per 1 kB of PCM.
function upsample24to48(pcm24: Uint8Array): Uint8Array {
  const inSamples = Math.floor(pcm24.length / 2);
  if (inSamples < 2) return pcm24;
  const outSamples = inSamples * 2;
  const out = new Uint8Array(outSamples * 2);
  const inView = new DataView(pcm24.buffer, pcm24.byteOffset, pcm24.byteLength);
  const outView = new DataView(out.buffer);
  let prev = inView.getInt16(0, true);
  for (let i = 0; i < inSamples - 1; i++) {
    const curr = inView.getInt16(i * 2, true);
    const next = inView.getInt16((i + 1) * 2, true);
    outView.setInt16(i * 4, curr, true);
    outView.setInt16(i * 4 + 2, (curr + next) >> 1, true);
    prev = curr;
  }
  // Tail sample — duplicate the last input sample.
  const lastIdx = (inSamples - 1) * 4;
  outView.setInt16(lastIdx, prev, true);
  outView.setInt16(lastIdx + 2, prev, true);
  return out;
}

function pcmToWavBase64(pcmBytes: Uint8Array): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  // JS linear upsample 24→48 introduces audible aliasing on speech (mirror
  // frequencies above Nyquist), so we keep the WAV at Gemini's native 24 kHz
  // and let AudioFlinger handle SRC. Only apply the fade to kill boundary
  // clicks.
  const faded = applyFadeInOut(pcmBytes);
  const dataSize = faded.length;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(faded, headerSize);

  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < wavBytes.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, Array.from(wavBytes.subarray(i, i + CHUNK))));
  }
  return `data:audio/wav;base64,${btoa(parts.join(''))}`;
}

export class AudioPlaybackService {
  private policy: BufferPolicy;
  private basePolicy: BufferPolicy;
  private jitter: JitterMonitor;
  private readonly seedStore: JitterSeedStore | null;
  private audioMode: AudioMode = 'unknown';
  private wasSeeded = false;
  private poorTurnStreak = 0;
  private preFirstPlayReclassified = false;
  // iter 3 post-ship fix: count only LIVE recordArrival events so the
  // pre-first-play downshift gate measures actual network evidence instead
  // of the pre-seeded ring (seed samples are in `jitter.sampleCount()` too).
  private liveArrivalCount = 0;

  private chunks: Uint8Array[] = [];
  private totalSize = 0;
  private ready: Uint8Array[] = [];

  private currentPlayer: AudioPlayer | null = null;
  private _isPlaying = false;
  private _audioLevel = 0;

  private disposed = false;
  private turnIsOpen = false;
  private audioModeReady = false;
  private isFirstSegment = true;
  private firstPlayFired = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  private loopPromise: Promise<void> | null = null;
  private signal: InterruptSignal | null = null;
  private refillResolvers: Array<() => void> = [];

  private prebufferStartTs: number | null = null;
  private underrunStartedAt: number | null = null;
  private totalSegmentMs = 0;
  private metrics: TurnMetrics;

  // iter 2 — new mid-turn state
  private consecutiveUnderruns = 0;
  private maxConsecutiveUnderrunsObserved = 0;
  private turnEscalated = false;
  private sentenceBoundaryPending = false;
  private poorNetworkFired = false;

  private _isBuffering = false;
  private onFinishCallback: (() => void) | null = null;
  private onStartCallback: (() => void) | null = null;
  private onBufferingChangeCallback: ((b: boolean) => void) | null = null;
  private onPoorNetworkCallback: ((b: boolean) => void) | null = null;
  private onAudioModeChangeCallback: ((mode: AudioMode) => void) | null = null;

  constructor(
    policy: BufferPolicy = DEFAULT_BUFFER_POLICY,
    seedStore: JitterSeedStore | null = process.env.JEST_WORKER_ID
      ? defaultJitterSeedStore
      : persistentJitterSeedStore,
  ) {
    this.policy = policy;
    this.basePolicy = policy;
    this.seedStore = seedStore;
    this.jitter = new JitterMonitor(
      policy.jitterWindow,
      policy.seedJitterAcrossInstances ? seedStore : null,
    );
    this.wasSeeded = this.jitter.sampleCount() > 0;
    this.metrics = this._freshMetrics();
  }

  // ─── Public API ─────────────────────────────────────────────────────

  get isPlaying(): boolean { return this._isPlaying; }
  get audioLevel(): number { return this._audioLevel; }

  setBufferPolicy(policy: BufferPolicy): void {
    const windowChanged = policy.jitterWindow !== this.policy.jitterWindow;
    const seedChanged = policy.seedJitterAcrossInstances !== this.policy.seedJitterAcrossInstances;
    this.policy = policy;
    this.basePolicy = policy;
    if (windowChanged || seedChanged) {
      this.jitter = new JitterMonitor(
        policy.jitterWindow,
        policy.seedJitterAcrossInstances ? this.seedStore : null,
      );
      this.wasSeeded = this.jitter.sampleCount() > 0;
    }
  }

  onPlaybackFinish(cb: () => void): void { this.onFinishCallback = cb; }
  onPlaybackStart(cb: () => void): void { this.onStartCallback = cb; }
  onBufferingChange(cb: (b: boolean) => void): void {
    this.onBufferingChangeCallback = cb;
  }
  /** iter 2 §2.5 — one-shot callback when consecutive underruns cross poorNetworkThreshold. */
  onPoorNetwork(cb: (b: boolean) => void): void {
    this.onPoorNetworkCallback = cb;
  }
  onAudioModeChange(cb: (mode: AudioMode) => void): void {
    this.onAudioModeChangeCallback = cb;
  }

  getTurnMetrics(): TurnMetrics {
    return {
      ...this.metrics,
      p95IatMs: this.jitter.p95IAT(),
      escalated: this.turnEscalated,
      maxConsecutiveUnderruns: this.maxConsecutiveUnderrunsObserved,
    };
  }

  private _classifyMode(p95IatMs: number | null, hasSeed: boolean): AudioMode {
    if (p95IatMs === null && !hasSeed) return 'unknown';
    if (p95IatMs === null) return 'fast';
    if (p95IatMs < this.policy.p95CautiousThresholdMs) return 'fast';
    if (p95IatMs < this.policy.p95FullBufferThresholdMs) return 'cautious';
    return 'full_buffer';
  }

  private _floorMode(): AudioMode | null {
    const seedIndicatesPoor =
      this.wasSeeded &&
      ((this.jitter.p95IAT() ?? 0) >= this.policy.p95CautiousThresholdMs);
    if (this.poorTurnStreak >= this.policy.ratchetEvidenceTurns + 1) {
      return 'full_buffer';
    }
    if (this.poorTurnStreak >= this.policy.ratchetEvidenceTurns) {
      return 'cautious';
    }
    if (this.poorTurnStreak === 1 && seedIndicatesPoor) {
      return 'cautious';
    }
    return null;
  }

  private _modeRank(mode: AudioMode): number {
    switch (mode) {
      case 'unknown': return 0;
      case 'fast': return 1;
      case 'cautious': return 2;
      case 'full_buffer': return 3;
    }
  }

  private _policyForMode(mode: AudioMode): BufferPolicy {
    switch (mode) {
      case 'cautious':
        return {
          ...this.basePolicy,
          prebufferFloorMs: POLICY_CAUTIOUS.prebufferFloorMs,
          minSegmentMs: POLICY_CAUTIOUS.minSegmentMs,
          refillTargetMs: POLICY_CAUTIOUS.refillTargetMs,
          escalatedRefillTargetMs: POLICY_CAUTIOUS.escalatedRefillTargetMs,
        };
      case 'full_buffer': {
        const cautiousPolicy = this._policyForMode('cautious');
        return {
          ...cautiousPolicy,
          prebufferFloorMs: POLICY_FULL_BUFFER.prebufferFloorMs,
          prebufferCeilingMs: POLICY_FULL_BUFFER.prebufferCeilingMs,
        };
      }
      case 'fast':
      case 'unknown':
      default:
        return this.basePolicy;
    }
  }

  private _switchMode(mode: AudioMode, floorMode: AudioMode | null = this._floorMode()): void {
    const nextMode = floorMode && this._modeRank(mode) < this._modeRank(floorMode)
      ? floorMode
      : mode;
    if (nextMode === this.audioMode) return;
    this.audioMode = nextMode;
    this.setBufferPolicy(this._policyForMode(nextMode));
    if (this.onAudioModeChangeCallback) {
      try { this.onAudioModeChangeCallback(nextMode); } catch { /* user-supplied callback error — isolate from playback loop */ }
    }
    this._notifyRefillWaiters();
  }

  enqueue(base64Pcm24k: string): void {
    if (this.disposed) return;
    const bytes = Uint8Array.from(atob(base64Pcm24k), (c) => c.charCodeAt(0));
    if (bytes.length === 0) return;

    const now = Date.now();
    this.jitter.recordArrival(now);
    this.liveArrivalCount += 1;

    if (!this.turnIsOpen) {
      this.turnIsOpen = true;
      this.metrics = this._freshMetrics();
      this.prebufferStartTs = now;
      this.firstPlayFired = false;
      this.isFirstSegment = true;
      this.totalSegmentMs = 0;
      this.preFirstPlayReclassified = false;
      // iter 3 post-ship: reset per-turn live arrival counter. Seed-vs-live
      // discrimination is a per-turn concern; a fresh turn starts with 0
      // live arrivals so the downshift gate won't fire until 5 arrive.
      // Current enqueue becomes the 1st live arrival once counted below.
      this.liveArrivalCount = 1;
      this._switchMode(this._classifyMode(this.jitter.p95IAT(), this.wasSeeded));
      // iter 2 — a brand-new turn resets the per-turn max observed, so
      // getTurnMetrics() reports this turn's peak, not the previous turn's.
      this.maxConsecutiveUnderrunsObserved = 0;
    }

    // iter 3 post-ship fix: the one-shot downshift gate was triggering on
    // the very first enqueue when a pre-loaded seed already filled 2+ slots
    // in the 16-slot ring, so `jitter.p95IAT()` still reflected seed values
    // and downshifts never fired. Gate on LIVE arrival count (≥5) and use
    // `recentP95IAT(5)` so 5 fast live chunks can overrule a stale cautious
    // seed — exactly the plan §4 Step 3 "pre-first-play re-classification
    // window" intent.
    if (
      !this.firstPlayFired &&
      !this.preFirstPlayReclassified &&
      this.liveArrivalCount >= 5
    ) {
      // `recordArrival` only pushes an IAT starting from the 2nd call, so
      // `liveArrivalCount - 1` IATs in the ring come from live arrivals.
      // Look at that many tail samples so a stale seed cannot drag the
      // recent-window p95 upward.
      const liveIatCount = Math.max(2, this.liveArrivalCount - 1);
      const recentP95 = this.jitter.recentP95IAT(liveIatCount) ?? this.jitter.p95IAT();
      const nextMode = this._classifyMode(recentP95, this.wasSeeded);
      if (this._modeRank(nextMode) < this._modeRank(this.audioMode)) {
        this._switchMode(nextMode);
      }
      this.preFirstPlayReclassified = true;
    }

    this.chunks.push(bytes);
    this.totalSize += bytes.length;
    this._isPlaying = true;
    this._audioLevel = Math.min(1, this._computeRms(bytes) * 4);

    // iter 2 — sentence-boundary fast path on enqueue: if the hook has
    // latched a preferred flush boundary and we have enough buffered
    // audio to honor it, flush now and clear the latch. This handles the
    // common case where punctuation arrived during PCM accumulation.
    const bufferedMsNow = pcmBytesToMs(this.totalSize);
    if (
      this.policy.phraseAwareFlush &&
      this.sentenceBoundaryPending &&
      (this.audioMode !== 'full_buffer' || this.firstPlayFired) &&
      bufferedMsNow >= this.policy.phraseBoundaryFloorMs
    ) {
      this._flushToReady();
      this.sentenceBoundaryPending = false;
      if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
      this._ensureLoop();
      return;
    }

    const bufferedMs = pcmBytesToMs(this.totalSize);
    if (this.isFirstSegment) {
      // Escalated pre-first-segment prebuffer only applies if the turn
      // underruns *before* any audio plays. Once firstPlayFired latches
      // (after first segment), escalation switches to the mid-turn lever
      // (escalatedRefillTargetMs).
      const base = clampPrebuffer(this.jitter.p95IAT(), this.policy);
      const target = this.audioMode === 'full_buffer'
        ? Math.max(base, this.policy.fullBufferMinCoverageMs)
        : this.turnEscalated
          ? Math.max(base, this.policy.escalatedPrebufferMs)
          : base;
      const elapsedSincePrebufferStart = this.prebufferStartTs === null
        ? 0
        : now - this.prebufferStartTs;
      if (
        bufferedMs >= target ||
        (!this.turnIsOpen && bufferedMs > 0) ||
        (this.audioMode === 'full_buffer' && (
          bufferedMs >= this.policy.fullBufferMinCoverageMs ||
          elapsedSincePrebufferStart >= this.policy.fullBufferCeilingMs
        ))
      ) {
        this._flushToReady();
      }
    } else {
      // Mid-turn: adaptive segment sizing grows with observed jitter.
      const segTarget = effectiveMinSegmentMs(this.jitter.p95IAT(), this.policy);
      if (bufferedMs >= segTarget) this._flushToReady();
    }

    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      if (this.chunks.length > 0) this._flushToReady();
    }, this.policy.flushDelayMs);

    this._ensureLoop();
  }

  /**
   * iter 2 §2.3 — Hint that the upcoming flush boundary should align with
   * a natural phrase end (sentence terminator in the output transcript).
   *
   * Two fast paths:
   *   1. If pending chunks already exceed policy.phraseBoundaryFloorMs,
   *      flush now (this call handles the trailing-punctuation case where
   *      punctuation arrives after the last audio chunk of the turn).
   *   2. Otherwise set a latch for the next enqueue() to consume.
   *
   * The underrun guard (refillTimeoutMs) still wins — the latch never
   * holds audio past its deadline.
   */
  markSentenceBoundary(): void {
    if (this.disposed) return;
    if (!this.policy.phraseAwareFlush) return;
    this.sentenceBoundaryPending = true;
    if (this.chunks.length > 0) {
      const bufferedMs = pcmBytesToMs(this.totalSize);
      if (
        (this.audioMode !== 'full_buffer' || this.firstPlayFired) &&
        bufferedMs >= this.policy.phraseBoundaryFloorMs
      ) {
        this._flushToReady();
        this.sentenceBoundaryPending = false;
        if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
        this._ensureLoop();
      }
    }
    // _flushToReady already calls _notifyRefillWaiters; if we did not flush
    // we still need to preserve the invariant on the latch state change.
    this._notifyRefillWaiters();
  }

  /**
   * Close the current turn. Forces a tail flush and allows the playback
   * loop to drain naturally. Preferred over the `flush()` alias for clarity.
   */
  endTurn(): void {
    if (!this.turnIsOpen) return;
    this.turnIsOpen = false;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.chunks.length > 0) this._flushToReady();
    const turnWasPoor = this.metrics.underrunCount >= 1 || this.turnEscalated;
    this.poorTurnStreak = turnWasPoor
      ? this.poorTurnStreak + 1
      : Math.max(0, this.poorTurnStreak - 1);
    // iter 2 reset contract — see plan §Step 3. endTurn zeroes all
    // per-turn state EXCEPT maxConsecutiveUnderrunsObserved, which stays
    // so getTurnMetrics() can report the peak after endTurn returns.
    this.consecutiveUnderruns = 0;
    this.turnEscalated = false;
    this.sentenceBoundaryPending = false;
    this.underrunStartedAt = null;
    if (this.poorNetworkFired) {
      this.poorNetworkFired = false;
      this._firePoorNetworkChange(false);
    }
    this._notifyRefillWaiters();
  }

  /**
   * Backward-compatible alias for {@link endTurn}. Kept so existing callers
   * (and tests that referenced the pre-refactor semantic) continue to work.
   */
  flush(): void {
    this.endTurn();
  }

  interrupt(): void {
    this.chunks = [];
    this.totalSize = 0;
    this.ready = [];
    this.turnIsOpen = false;
    this._isPlaying = false;
    this._audioLevel = 0;
    this.isFirstSegment = true;
    this.audioModeReady = false;
    this.firstPlayFired = false;
    this.preFirstPlayReclassified = false;
    this.liveArrivalCount = 0;
    this.audioMode = 'unknown';
    // Preserve jitter samples across barge-in so the next turn stays adapted
    // to observed network conditions. Only dispose() clears them.
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    if (this._isBuffering) {
      this._isBuffering = false;
      this._fireBufferingChange(false);
    }
    // iter 2 reset contract — see plan §Step 3. interrupt zeroes
    // every per-turn field including maxConsecutiveUnderrunsObserved
    // (a fresh enqueue after interrupt opens a new turn).
    this.consecutiveUnderruns = 0;
    this.maxConsecutiveUnderrunsObserved = 0;
    this.turnEscalated = false;
    this.sentenceBoundaryPending = false;
    this.underrunStartedAt = null;
    if (this.poorNetworkFired) {
      this.poorNetworkFired = false;
      this._firePoorNetworkChange(false);
    }
    if (this.onAudioModeChangeCallback) {
      try { this.onAudioModeChangeCallback('unknown'); } catch { /* user-supplied callback error — isolate from playback loop */ }
    }
    if (this.signal) this.signal.abort();
    this._notifyRefillWaiters();
    if (this.currentPlayer) {
      try { this.currentPlayer.pause(); this.currentPlayer.remove(); } catch { /* user-supplied callback error — isolate from playback loop */ }
      this.currentPlayer = null;
    }
  }

  dispose(): void {
    this.disposed = true;
    // Publish jitter samples to the seed store *before* interrupt clears
    // the monitor's state via reset below.
    try { this.jitter.publishSeed(); } catch { /* user-supplied callback error — isolate from playback loop */ }
    this.interrupt();
    this.poorTurnStreak = 0;
    // Final cleanup: drop jitter history too (interrupt() intentionally preserves it).
    this.jitter.reset();
  }

  // ─── Internals ──────────────────────────────────────────────────────

  private _freshMetrics(): TurnMetrics {
    return {
      prebufferMs: 0,
      underrunCount: 0,
      p95IatMs: null,
      segments: 0,
      avgSegmentMs: 0,
      maxGapMs: 0,
      escalated: false,
      maxConsecutiveUnderruns: 0,
    };
  }

  private _computeRms(pcm: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < pcm.length; i += 2) {
      const sample = (pcm[i] | (pcm[i + 1] << 8)) / 32768;
      sum += sample * sample;
    }
    return Math.sqrt(sum / (pcm.length / 2));
  }

  private _flushToReady(): void {
    if (this.chunks.length === 0) return;
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    const combined = new Uint8Array(this.totalSize);
    let offset = 0;
    for (const c of this.chunks) { combined.set(c, offset); offset += c.length; }
    this.chunks = [];
    this.totalSize = 0;
    if (this.isFirstSegment && this.prebufferStartTs !== null) {
      this.metrics.prebufferMs = Date.now() - this.prebufferStartTs;
    }
    this.isFirstSegment = false;
    this.ready.push(combined);
    this._notifyRefillWaiters();
  }

  /**
   * INVARIANT (iter 2, see plan §Step 3): any code path that changes a
   * field the `_runLoop` wait predicate depends on — `ready.length`,
   * `chunks.length`, `turnIsOpen`, `turnEscalated`, `sentenceBoundaryPending`,
   * `disposed`, or the interrupt signal — MUST call `_notifyRefillWaiters()`
   * after the change. The 20 ms polling spin was removed in iter 2;
   * violating this invariant will deadlock the loop.
   */
  private _notifyRefillWaiters(): void {
    if (this.refillResolvers.length === 0) return;
    const pending = this.refillResolvers;
    this.refillResolvers = [];
    for (const r of pending) {
      try { r(); } catch { /* user-supplied callback error — isolate from playback loop */ }
    }
  }

  private _waitForRefill(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.refillResolvers.push(resolve);
    });
  }

  private _fireBufferingChange(b: boolean): void {
    if (this.onBufferingChangeCallback) {
      try { this.onBufferingChangeCallback(b); } catch { /* user-supplied callback error — isolate from playback loop */ }
    }
  }

  private _firePoorNetworkChange(b: boolean): void {
    if (this.onPoorNetworkCallback) {
      try { this.onPoorNetworkCallback(b); } catch { /* user-supplied callback error — isolate from playback loop */ }
    }
  }

  private _ensureLoop(): void {
    if (this.loopPromise) return;
    this.loopPromise = this._runLoop().finally(() => {
      this.loopPromise = null;
    });
  }

  private async _runLoop(): Promise<void> {
    if (this.disposed) return;
    const signal = createInterruptSignal();
    this.signal = signal;

    if (!this.audioModeReady) {
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        this.audioModeReady = true;
      } catch { /* user-supplied callback error — isolate from playback loop */ }
    }

    try {
      while (!this.disposed && !signal.aborted) {
        if (this.ready.length === 0) {
          if (!this.turnIsOpen) break;

          // Distinguish pre-first-segment prebuffer wait from mid-turn underrun.
          // Only the latter increments underrunCount and fires isBuffering
          // (the prebuffer window is a normal part of turn startup, covered
          // by the hook's WAITING_AI avatar state — plan §2.7).
          const isUnderrun = !this.isFirstSegment;
          if (isUnderrun) {
            this._isBuffering = true;
            this.metrics.underrunCount += 1;
            this.underrunStartedAt = Date.now();
            // iter 2 — escalation + poor-network tracking (plan §2.2, §2.5)
            this.consecutiveUnderruns += 1;
            if (this.consecutiveUnderruns > this.maxConsecutiveUnderrunsObserved) {
              this.maxConsecutiveUnderrunsObserved = this.consecutiveUnderruns;
            }
            if (
              !this.turnEscalated &&
              this.consecutiveUnderruns >= this.policy.maxConsecutiveUnderruns
            ) {
              this.turnEscalated = true;
            }
            if (
              !this.poorNetworkFired &&
              this.consecutiveUnderruns >= this.policy.poorNetworkThreshold
            ) {
              this.poorNetworkFired = true;
              this._switchMode(this.audioMode === 'cautious' ? 'full_buffer' : 'cautious');
              this._firePoorNetworkChange(true);
            }
            this._fireBufferingChange(true);
          }

          const refillTarget = effectiveRefillTargetMs(this.policy, this.turnEscalated);
          // iter 3 post-ship fix: in full_buffer mode during the first-segment
          // wait, use fullBufferCeilingMs (plan §4 Step 3) instead of the
          // short refillTimeoutMs, so the service honors the "bounded
          // startup" contract. Post-first-play (and non-full-buffer modes),
          // refillTimeoutMs still governs the underrun recovery window.
          const firstSegmentFullBuffer =
            this.isFirstSegment && this.audioMode === 'full_buffer';
          const deadlineMs = firstSegmentFullBuffer
            ? this.policy.fullBufferCeilingMs
            : this.policy.refillTimeoutMs;
          const deadline = Date.now() + deadlineMs;

          while (
            !signal.aborted &&
            this.ready.length === 0 &&
            this.turnIsOpen &&
            Date.now() < deadline
          ) {
            // Escalated mid-turn path: keep waiting until we have accumulated
            // refillTarget ms of audio OR something has been flushed to
            // `ready` via the timer / phrase boundary fast path.
            if (
              isUnderrun &&
              this.chunks.length > 0 &&
              pcmBytesToMs(this.totalSize) >= refillTarget
            ) {
              this._flushToReady();
              break;
            }
            const remaining = deadline - Date.now();
            let timer: ReturnType<typeof setTimeout> | null = null;
            const timerPromise = new Promise<void>((resolve) => {
              timer = setTimeout(resolve, Math.max(this.policy.refillPollMinMs, remaining));
            });
            await Promise.race([this._waitForRefill(), timerPromise, signal.promise])
              .catch(() => {});
            if (timer) clearTimeout(timer);
          }

          // Promote any pending chunks (e.g. when endTurn closed the turn
          // with data still accumulating, or the refill loop exited on
          // deadline with chunks buffered).
          if (!signal.aborted && this.chunks.length > 0) this._flushToReady();

          if (isUnderrun) {
            const gapMs = Date.now() - (this.underrunStartedAt ?? Date.now());
            if (gapMs > this.metrics.maxGapMs) this.metrics.maxGapMs = gapMs;
            this.underrunStartedAt = null;
            this._isBuffering = false;
            this._fireBufferingChange(false);
          }

          if (signal.aborted) break;

          if (this.ready.length === 0) {
            if (!this.turnIsOpen) break;
            // Nothing landed within refillTimeoutMs and the turn is still
            // open. Wait on the refill resolver; any state change that
            // matters (enqueue / endTurn / interrupt / markSentenceBoundary)
            // calls _notifyRefillWaiters per the invariant above.
            await Promise.race([this._waitForRefill(), signal.promise]).catch(() => {});
            continue;
          }
        }

        // ─── Play next segment ─────────────────────────────────
        const seg = this.ready.shift();
        if (!seg) continue;
        const segMs = pcmBytesToMs(seg.length);
        this.totalSegmentMs += segMs;
        this.metrics.segments += 1;
        this.metrics.avgSegmentMs = this.totalSegmentMs / this.metrics.segments;

        const source = pcmToWavBase64(seg);
        if (!this.currentPlayer) {
          this.currentPlayer = createAudioPlayer(source);
        } else {
          this.currentPlayer.replace(source);
        }

        const player = this.currentPlayer;
        const playDone = new Promise<void>((resolve) => {
          const listener = (status: { didJustFinish?: boolean }) => {
            if (status.didJustFinish) resolve();
          };
          player.addListener('playbackStatusUpdate', listener);
        });

        player.play();
        if (!this.firstPlayFired) {
          this.firstPlayFired = true;
          if (this.onStartCallback) {
            try { this.onStartCallback(); } catch { /* user-supplied callback error — isolate from playback loop */ }
          }
        }

        try {
          await Promise.race([playDone, signal.promise]);
        } catch (err) {
          if (err instanceof InterruptedError) break;
          // unexpected — abort loop
          break;
        }

        // Successful segment playback resets the consecutive-underrun
        // counter. turnEscalated / poorNetworkFired stay latched for the
        // rest of the turn (plan §2.2 — no mid-turn de-escalation).
        this.consecutiveUnderruns = 0;
      }
    } finally {
      this.metrics.p95IatMs = this.jitter.p95IAT();
      this.metrics.avgSegmentMs =
        this.metrics.segments > 0 ? this.totalSegmentMs / this.metrics.segments : 0;
      // iter 2 — publish terminal turn state into metrics so getTurnMetrics()
      // remains authoritative after _runLoop exits.
      this.metrics.escalated = this.turnEscalated;
      this.metrics.maxConsecutiveUnderruns = this.maxConsecutiveUnderrunsObserved;

      if (this.currentPlayer) {
        try { this.currentPlayer.remove(); } catch { /* user-supplied callback error — isolate from playback loop */ }
        this.currentPlayer = null;
      }

      this._isPlaying = false;
      this._audioLevel = 0;
      this.audioModeReady = false;
      this.isFirstSegment = true;
      this.firstPlayFired = false;
      if (this._isBuffering) {
        this._isBuffering = false;
        this._fireBufferingChange(false);
      }
      // Final reset line of defense — plan §Step 3 reset matrix requires
      // that interrupt racing the loop leaves no partial state behind.
      this.consecutiveUnderruns = 0;
      this.turnEscalated = false;
      this.sentenceBoundaryPending = false;
      this.underrunStartedAt = null;
      if (this.poorNetworkFired) {
        this.poorNetworkFired = false;
        this._firePoorNetworkChange(false);
      }

      const naturalEnd = !signal.aborted;
      this.signal = null;

      if (naturalEnd && this.onFinishCallback) {
        try { this.onFinishCallback(); } catch { /* user-supplied callback error — isolate from playback loop */ }
      }

      setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
        .catch(() => {});
    }
  }
}
