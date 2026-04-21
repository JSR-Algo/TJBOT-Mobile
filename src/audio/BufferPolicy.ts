/**
 * BufferPolicy — adaptive buffering policy for AudioPlaybackService.
 *
 * All mid-turn timing in the playback pipeline is driven by this policy object;
 * no magic numbers live inside the service. See
 * `.omc/plans/gemini-live-voice-fluency.md` §2.2-§2.3 for rationale.
 */

export interface BufferPolicy {
  /** Minimum prebuffer before first playback starts (ms). Protects fluency on fast networks. */
  prebufferFloorMs: number;
  /** Maximum prebuffer under any jitter conditions (ms). Protects perceived latency on bumpy networks. */
  prebufferCeilingMs: number;
  /** Multiplier applied to observed p95 inter-arrival time to derive target prebuffer. */
  prebufferJitterMult: number;
  /** Smallest segment we flush mid-turn to avoid `player.replace()` churn (ms of audio). Raising this from 200ms to 250ms trades ~50ms more segment latency for fewer handoffs. */
  minSegmentMs: number;
  /** Desired backlog during speaking (ms). Informs refill decisions. */
  targetQueueDepthMs: number;
  /** Tolerable silence before declaring an underrun (ms). */
  underrunGraceMs: number;
  /** After an underrun, accumulate this much audio before resuming (ms). */
  refillTargetMs: number;
  /** If refill still hasn't hit target after this long (ms), soft-drop the turn. */
  refillTimeoutMs: number;
  /** Ring-buffer size for p95 inter-arrival-time estimation. */
  jitterWindow: number;
  /** Tail-flush debounce: flush residual chunks this long after last enqueue (ms). */
  flushDelayMs: number;
  // ─── iter 2 (plan §2.1-§2.5) ────────────────────────────────────────
  /** Multiplier on p95 IAT used to adaptively grow mid-turn segments. Segment target = max(minSegmentMs, p95 * mult). */
  minSegmentJitterMult: number;
  /** Upper cap for adaptive segment sizing (ms). Protects prosody. */
  maxSegmentMs: number;
  /** After this many consecutive mid-turn underruns, escalate refill target for the rest of the turn. */
  maxConsecutiveUnderruns: number;
  /** Escalated first-segment prebuffer target (ms) — only applied if turn underruns before first play. */
  escalatedPrebufferMs: number;
  /** Escalated refill target (ms) — primary mid-turn S2 lever after escalation. */
  escalatedRefillTargetMs: number;
  /** Whether to flush at sentence boundaries hinted by transcription punctuation. */
  phraseAwareFlush: boolean;
  /** Minimum buffered audio (ms) before honoring a sentence-boundary flush request. */
  phraseBoundaryFloorMs: number;
  /** Whether to seed JitterMonitor from a JitterSeedStore across service instances. */
  seedJitterAcrossInstances: boolean;
  /** Floor for refill-loop setTimeout granularity (ms). Replaces the old hard-coded 10ms. */
  refillPollMinMs: number;
  /** Consecutive-underrun threshold that triggers the one-shot `onPoorNetwork(true)` callback. */
  poorNetworkThreshold: number;
  /** Maximum time to hold first play in full-buffer mode before forcing playback. */
  fullBufferCeilingMs: number;
  /** Minimum buffered coverage to accumulate before first play in full-buffer mode. */
  fullBufferMinCoverageMs: number;
  /** Segment multiplier used once the session escalates into cautious/full-buffer behavior. */
  escalatedSegmentMult: number;
  /** Provisional, pending telemetry calibration (R12). */
  p95CautiousThresholdMs: number;
  /** Provisional, pending telemetry calibration (R12). */
  p95FullBufferThresholdMs: number;
  /** TTL for persisted jitter seed samples before they are discarded. */
  seedPersistenceTtlMs: number;
  /** Consecutive poor turns required before raising the ratchet floor. */
  ratchetEvidenceTurns: number;
}

// Tuned 2026-04 after audio-lag audit: the old ceilings (900ms default, 3000ms
// escalated) made Gemini Live feel like "wait 3s then dump" on Vietnam's
// 200-300ms RTT link. Empirically the native stream delivers first audio
// chunk within 400-600ms, so a 500ms prebuffer gives the player one chunk of
// headroom while keeping perceived latency under 1s.
export const DEFAULT_BUFFER_POLICY: BufferPolicy = {
  prebufferFloorMs: 250,
  prebufferCeilingMs: 500,
  prebufferJitterMult: 2.0,
  // Big segments (~1500ms) = 1 createAudioPlayer swap per ~1.5s instead of
  // every 400ms. Each boundary is a potential click even with the 5ms fade,
  // so fewer boundaries = less perceptible "rè". The tradeoff is longer
  // time-to-first-audio inside a turn (bounded by prebuffer); that's still
  // acceptable for a conversational assistant.
  minSegmentMs: 1500,
  maxSegmentMs: 2500,
  targetQueueDepthMs: 600,
  underrunGraceMs: 120,
  refillTargetMs: 500,
  refillTimeoutMs: 1500,
  jitterWindow: 16,
  flushDelayMs: 200,
  // iter 2
  minSegmentJitterMult: 2.0,
  maxConsecutiveUnderruns: 2,
  escalatedPrebufferMs: 500,
  escalatedRefillTargetMs: 400,
  phraseAwareFlush: true,
  phraseBoundaryFloorMs: 100,
  seedJitterAcrossInstances: true,
  refillPollMinMs: 25,
  poorNetworkThreshold: 3,
  fullBufferCeilingMs: 1500,
  fullBufferMinCoverageMs: 1200,
  escalatedSegmentMult: 2.5,
  p95CautiousThresholdMs: 200,
  p95FullBufferThresholdMs: 400,
  seedPersistenceTtlMs: 24 * 60 * 60 * 1000,
  ratchetEvidenceTurns: 2,
};

export const POLICY_FAST: BufferPolicy = {
  ...DEFAULT_BUFFER_POLICY,
};

export const POLICY_CAUTIOUS: BufferPolicy = {
  ...DEFAULT_BUFFER_POLICY,
  prebufferFloorMs: 400,
  minSegmentMs: 400,
  refillTargetMs: 300,
  escalatedRefillTargetMs: 500,
};

export const POLICY_FULL_BUFFER: BufferPolicy = {
  ...POLICY_CAUTIOUS,
  prebufferFloorMs: 1000,
  prebufferCeilingMs: 1500,
};

/**
 * Derive the adaptive prebuffer target from observed chunk inter-arrival p95.
 * Returns `prebufferFloorMs` if we have too few samples to estimate jitter or
 * if p95 is non-finite.
 */
export function clampPrebuffer(
  p95IatMs: number | null,
  policy: BufferPolicy,
): number {
  if (p95IatMs === null || !Number.isFinite(p95IatMs)) {
    return policy.prebufferFloorMs;
  }
  const raw = p95IatMs * policy.prebufferJitterMult;
  return Math.max(
    policy.prebufferFloorMs,
    Math.min(policy.prebufferCeilingMs, raw),
  );
}

/**
 * Derive the adaptive mid-turn segment target. Fewer `player.replace()`
 * handoffs on bumpy networks: wait at least 2× the tail chunk IAT before
 * flushing a segment. Capped at {@link BufferPolicy.maxSegmentMs} to protect
 * prosody and keep `endTurn()` tail latency sane.
 *
 * Returns {@link BufferPolicy.minSegmentMs} when p95 is unavailable.
 */
export function effectiveMinSegmentMs(
  p95IatMs: number | null,
  policy: BufferPolicy,
): number {
  if (p95IatMs === null || !Number.isFinite(p95IatMs)) {
    return policy.minSegmentMs;
  }
  const raw = p95IatMs * policy.minSegmentJitterMult;
  return Math.min(
    policy.maxSegmentMs,
    Math.max(policy.minSegmentMs, raw),
  );
}

/**
 * Refill-wait target: when the turn is escalated (after consecutive
 * underruns), accumulate a larger backlog before resuming playback. This is
 * the primary lever for S2 (long mid-sentence pauses on degraded networks).
 */
export function effectiveRefillTargetMs(
  policy: BufferPolicy,
  escalated: boolean,
): number {
  return escalated
    ? Math.max(policy.refillTargetMs, policy.escalatedRefillTargetMs)
    : policy.refillTargetMs;
}
