import {
  PARENT_MOTION,
  barDelayMs,
  barHeightPx,
  clampPercent,
  finalMetricValue,
  shouldRepeatMotion,
  staggerDelayMs,
} from '@/design-system/animations/parentMotion';

describe('PARENT_MOTION contract', () => {
  it('locks the approved prototype timings', () => {
    expect(PARENT_MOTION.quickMs).toBe(260);
    expect(PARENT_MOTION.baseMs).toBe(480);
    expect(PARENT_MOTION.slowMs).toBe(820);
    expect(PARENT_MOTION.staggerMs).toBe(90);
    expect(PARENT_MOTION.sheenPeriodMs).toBe(7000);
    expect(PARENT_MOTION.barGrowthMs).toBe(1100);
    expect(PARENT_MOTION.barDelayMs).toBe(80);
    expect(PARENT_MOTION.fillMs).toBe(1600);
  });

  it('computes stagger and bar delays from index', () => {
    expect(staggerDelayMs(0)).toBe(0);
    expect(staggerDelayMs(3)).toBe(270);
    expect(barDelayMs(0)).toBe(0);
    expect(barDelayMs(4)).toBe(320);
    expect(staggerDelayMs(-1)).toBe(0);
  });

  it('clamps percent to [0, 100] and rejects non-finite', () => {
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(42.7)).toBe(42.7);
    expect(clampPercent(100)).toBe(100);
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(Number.NaN)).toBe(0);
    expect(clampPercent(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('maps bar heights from real counts without exceeding the track', () => {
    expect(barHeightPx(0, 5, 118)).toBe(8);
    expect(barHeightPx(5, 5, 118)).toBe(118);
    expect(barHeightPx(2, 4, 100)).toBe(50);
    expect(barHeightPx(10, 5, 100)).toBe(100);
  });

  it('never lets metric display exceed the source value', () => {
    expect(finalMetricValue(12)).toBe(12);
    expect(finalMetricValue(0)).toBe(0);
    expect(finalMetricValue(-3)).toBe(0);
    expect(finalMetricValue(Number.NaN)).toBe(0);
  });

  it('disables repeating motion under reduced-motion or inactive', () => {
    expect(shouldRepeatMotion(false, true)).toBe(true);
    expect(shouldRepeatMotion(true, true)).toBe(false);
    expect(shouldRepeatMotion(false, false)).toBe(false);
    expect(shouldRepeatMotion(true, false)).toBe(false);
  });
});
