/**
 * JitterMonitor — tracks inter-arrival times (IAT) of audio chunks in a ring
 * buffer and reports p95 for adaptive-prebuffer tuning.
 *
 * See `.omc/plans/gemini-live-voice-fluency.md` §2.3 (baseline) and
 * `.omc/plans/gemini-live-voice-fluency-iter2-2026-04-19.md` §2.4 (seed).
 * Mean hides tail spikes; p95 is the quantile that actually predicts
 * underrun risk.
 *
 * Iter 2 addition: an optional {@link JitterSeedStore} can be injected.
 * When present and non-empty, the ring is pre-populated on construction so
 * the first `useGeminiConversation` remount inherits the prior network
 * profile instead of starting cold. A seeded monitor relaxes the p95
 * minimum-sample threshold from 4 → 2.
 */

import type { JitterSeedStore } from './JitterSeedStore';

export class JitterMonitor {
  private readonly windowSize: number;
  private readonly samples: number[] = [];
  private lastArrivalMs: number | null = null;
  private readonly seedStore: JitterSeedStore | null;
  private readonly wasSeeded: boolean;

  constructor(windowSize: number = 16, seedStore: JitterSeedStore | null = null) {
    if (!Number.isInteger(windowSize) || windowSize < 1) {
      throw new Error('JitterMonitor windowSize must be a positive integer');
    }
    this.windowSize = windowSize;
    this.seedStore = seedStore;

    const seed = seedStore?.read() ?? null;
    if (seed && seed.length > 0) {
      // Take the tail of the stored samples (most recent), up to windowSize.
      const start = Math.max(0, seed.length - windowSize);
      for (let i = start; i < seed.length; i++) {
        const v = seed[i];
        if (Number.isFinite(v) && v >= 0) this.samples.push(v);
      }
      this.wasSeeded = this.samples.length > 0;
    } else {
      this.wasSeeded = false;
    }
  }

  /**
   * Record a new chunk arrival. The very first call establishes the baseline;
   * no IAT is emitted until the second arrival.
   */
  recordArrival(nowMs: number): void {
    if (this.lastArrivalMs !== null) {
      const iat = nowMs - this.lastArrivalMs;
      if (iat >= 0) {
        this.samples.push(iat);
        if (this.samples.length > this.windowSize) this.samples.shift();
      }
    }
    this.lastArrivalMs = nowMs;
  }

  /**
   * Return the 95th percentile of recent IAT samples, or null when the
   * sample count is below the minimum needed for a meaningful tail estimate.
   *
   * Cold start requires ≥4 samples (the original contract — keeps first-ever
   * turns honest). A seeded monitor relaxes to ≥2 because the seed itself
   * represents prior observations.
   */
  p95IAT(): number | null {
    const minSamples = this.wasSeeded ? 2 : 4;
    if (this.samples.length < minSamples) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const idx = 0.95 * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const frac = idx - lo;
    return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
  }

  /**
   * P95 over the last `count` samples only. Used by the iter 3 pre-first-play
   * re-classification path: a fresh cautious seed in a 16-slot ring can
   * keep `p95IAT()` pinned high for ~17 live arrivals, so the one-shot
   * downshift must consult a RECENT window instead. Returns null when
   * fewer than 2 samples are available in the requested window.
   */
  recentP95IAT(count: number): number | null {
    const effective = Math.min(count, this.samples.length);
    if (effective < 2) return null;
    const recent = this.samples.slice(-effective);
    const sorted = [...recent].sort((a, b) => a - b);
    const idx = 0.95 * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const frac = idx - lo;
    return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
  }

  /**
   * Publish the current ring to the injected seed store, if any. Safe to
   * call at any time; a no-op when no store is configured.
   */
  publishSeed(): void {
    if (this.seedStore && this.samples.length > 0) {
      this.seedStore.write([...this.samples]);
    }
  }

  reset(): void {
    this.samples.length = 0;
    this.lastArrivalMs = null;
  }

  sampleCount(): number {
    return this.samples.length;
  }
}
