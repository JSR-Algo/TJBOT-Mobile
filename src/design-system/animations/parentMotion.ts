/**
 * Parent-app motion contract (STEP-7).
 * Timings locked to the approved redesign prototype + DESIGN.md §6.
 */
export const PARENT_MOTION = {
  quickMs: 260,
  baseMs: 480,
  slowMs: 820,
  staggerMs: 90,
  sheenPeriodMs: 7000,
  /** Fraction of the 7s clock spent mid-pass (prototype: 30%). */
  sheenPassFraction: 0.3,
  barGrowthMs: 1100,
  barDelayMs: 80,
  fillMs: 1600,
  onlinePulseMs: 3400,
  revealTranslateY: 26,
} as const;

export type ParentMotionTiming = typeof PARENT_MOTION;

export function staggerDelayMs(
  index: number,
  staggerMs: number = PARENT_MOTION.staggerMs,
): number {
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.round(index) * staggerMs;
}

export function barDelayMs(
  index: number,
  delayMs: number = PARENT_MOTION.barDelayMs,
): number {
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.round(index) * delayMs;
}

/** Clamp a percentage into [0, 100]. Non-finite → 0. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 100) return 100;
  return value;
}

/** Bar pixel height from real count; zero stays a tiny track stub. */
export function barHeightPx(
  count: number,
  maxCount: number,
  trackHeight: number,
  minPx = 8,
): number {
  const safeMax = Math.max(1, Number.isFinite(maxCount) ? maxCount : 1);
  const safeCount = Math.max(0, Number.isFinite(count) ? count : 0);
  if (safeCount <= 0) return minPx;
  const ratio = Math.min(1, safeCount / safeMax);
  return Math.max(minPx, Math.round(ratio * trackHeight));
}

/** Whether continuous/repeating motion is allowed. */
export function shouldRepeatMotion(
  reduceMotion: boolean,
  active = true,
): boolean {
  return active && !reduceMotion;
}

/** Final metric value for display (never exceeds source). */
export function finalMetricValue(source: number): number {
  if (!Number.isFinite(source)) return 0;
  return source < 0 ? 0 : source;
}
