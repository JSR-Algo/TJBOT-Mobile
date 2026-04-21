import { JitterMonitor } from '../../src/audio/JitterMonitor';

describe('JitterMonitor', () => {
  test('p95 null before 4 samples', () => {
    const m = new JitterMonitor(16);
    expect(m.p95IAT()).toBe(null);
    m.recordArrival(0);
    expect(m.p95IAT()).toBe(null); // first arrival: no IAT emitted
    m.recordArrival(100);
    expect(m.p95IAT()).toBe(null); // 1 IAT
    m.recordArrival(200);
    expect(m.p95IAT()).toBe(null); // 2 IATs
    m.recordArrival(300);
    expect(m.p95IAT()).toBe(null); // 3 IATs — still below the 4-sample threshold
  });

  test('first arrival does not record an IAT', () => {
    const m = new JitterMonitor(16);
    m.recordArrival(1000);
    expect(m.sampleCount()).toBe(0);
  });

  test('p95 of evenly-spaced arrivals equals the spacing', () => {
    const m = new JitterMonitor(16);
    for (let i = 0; i < 10; i++) m.recordArrival(i * 100);
    // 9 IATs of 100ms each
    expect(m.sampleCount()).toBe(9);
    expect(m.p95IAT()).toBe(100);
  });

  test('p95 tracks the 95th percentile of a tail-heavy distribution', () => {
    const m = new JitterMonitor(16);
    let t = 0;
    m.recordArrival(t);
    // 15 fast IATs of 100ms
    for (let i = 0; i < 15; i++) {
      t += 100;
      m.recordArrival(t);
    }
    // 1 slow IAT of 500ms
    t += 500;
    m.recordArrival(t);
    // samples sorted: [100 x 15, 500]
    // p95 of length 16 = index 0.95 * 15 = 14.25
    // interpolate sorted[14]=100 and sorted[15]=500 → 100 + 0.25*400 = 200
    expect(m.p95IAT()).toBeCloseTo(200, 0);
  });

  test('ring buffer wraps past windowSize', () => {
    const m = new JitterMonitor(4);
    m.recordArrival(0);
    for (let i = 1; i <= 10; i++) m.recordArrival(i * 100);
    // Only last 4 IATs retained
    expect(m.sampleCount()).toBe(4);
    expect(m.p95IAT()).toBe(100);
  });

  test('reset clears samples and baseline', () => {
    const m = new JitterMonitor(16);
    for (let i = 0; i < 10; i++) m.recordArrival(i * 100);
    expect(m.sampleCount()).toBeGreaterThan(0);
    m.reset();
    expect(m.sampleCount()).toBe(0);
    expect(m.p95IAT()).toBe(null);
    // After reset, the next call is treated as a fresh baseline
    m.recordArrival(500);
    expect(m.sampleCount()).toBe(0);
    m.recordArrival(600);
    expect(m.sampleCount()).toBe(1);
  });

  test('ignores negative IAT (clock skew guard)', () => {
    const m = new JitterMonitor(16);
    m.recordArrival(1000);
    m.recordArrival(500); // regressed clock — should be ignored
    expect(m.sampleCount()).toBe(0);
    m.recordArrival(1100);
    expect(m.sampleCount()).toBe(1);
  });

  test('invalid windowSize throws', () => {
    expect(() => new JitterMonitor(0)).toThrow();
    expect(() => new JitterMonitor(-1)).toThrow();
    expect(() => new JitterMonitor(1.5)).toThrow();
  });
});
