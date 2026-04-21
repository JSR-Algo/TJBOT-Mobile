import { JitterMonitor } from '../../src/audio/JitterMonitor';
import type { JitterSeedStore } from '../../src/audio/JitterSeedStore';

function makeFakeStore(initial: number[] | null = null): JitterSeedStore & {
  readCalls: number;
  writeCalls: number[][];
} {
  let samples: number[] | null = initial ? [...initial] : null;
  const store = {
    readCalls: 0,
    writeCalls: [] as number[][],
    read(): number[] | null {
      store.readCalls += 1;
      return samples ? [...samples] : null;
    },
    write(next: number[]): void {
      store.writeCalls.push([...next]);
      samples = [...next];
    },
  };
  return store;
}

describe('JitterMonitor with JitterSeedStore (iter2 §2.4, AC5)', () => {
  test('cold start (no seed): p95IAT returns null until ≥4 samples', () => {
    const store = makeFakeStore(null);
    const m = new JitterMonitor(16, store);
    expect(store.readCalls).toBe(1);
    expect(m.sampleCount()).toBe(0);

    // First arrival establishes baseline, no IAT yet
    m.recordArrival(1000);
    expect(m.p95IAT()).toBeNull();

    // 1 IAT → still below threshold
    m.recordArrival(1100);
    expect(m.p95IAT()).toBeNull();

    // 2 IATs
    m.recordArrival(1200);
    expect(m.p95IAT()).toBeNull();

    // 3 IATs
    m.recordArrival(1300);
    expect(m.p95IAT()).toBeNull();

    // 4 IATs → threshold met
    m.recordArrival(1400);
    expect(m.p95IAT()).not.toBeNull();
  });

  test('seeded: p95IAT returns a value as soon as total samples ≥ 2', () => {
    const seed = [100, 110, 95, 105];
    const store = makeFakeStore(seed);
    const m = new JitterMonitor(16, store);
    expect(m.sampleCount()).toBe(seed.length);
    // 4 seeded samples alone is already ≥ 2 and ≥ 4 — returns immediately
    expect(m.p95IAT()).not.toBeNull();
  });

  test('seeded with 1 sample: p95IAT still null until ring reaches 2', () => {
    const store = makeFakeStore([100]);
    const m = new JitterMonitor(16, store);
    // 1 seeded → seeded threshold is 2 → null
    expect(m.p95IAT()).toBeNull();

    // After one live arrival, baseline is set but only if recordArrival
    // sees a previous arrival. Since seed samples don't carry timestamps,
    // the first recordArrival sets lastArrivalMs without pushing an IAT.
    m.recordArrival(1000);
    expect(m.sampleCount()).toBe(1); // still just the seeded sample
    expect(m.p95IAT()).toBeNull();

    // Second arrival yields one live IAT → 2 total samples in ring → p95
    // should now be non-null because wasSeeded === true (threshold 2).
    m.recordArrival(1100);
    expect(m.sampleCount()).toBe(2);
    expect(m.p95IAT()).not.toBeNull();
  });

  test('publishSeed writes the current ring to the store', () => {
    const store = makeFakeStore(null);
    const m = new JitterMonitor(16, store);
    m.recordArrival(1000);
    m.recordArrival(1100);
    m.recordArrival(1200);

    expect(store.writeCalls.length).toBe(0);
    m.publishSeed();
    expect(store.writeCalls.length).toBe(1);
    expect(store.writeCalls[0]).toEqual([100, 100]);
  });

  test('publishSeed is a no-op when the store is not configured', () => {
    const m = new JitterMonitor(16, null);
    m.recordArrival(1000);
    m.recordArrival(1100);
    // Should not throw.
    expect(() => m.publishSeed()).not.toThrow();
  });

  test('publishSeed does not write when the ring is empty', () => {
    const store = makeFakeStore(null);
    const m = new JitterMonitor(16, store);
    m.publishSeed();
    expect(store.writeCalls.length).toBe(0);
  });

  test('seed respects windowSize — takes the most recent tail', () => {
    const seed = Array.from({ length: 10 }, (_, i) => i); // [0..9]
    const store = makeFakeStore(seed);
    const m = new JitterMonitor(4, store);
    expect(m.sampleCount()).toBe(4);
    // Publish and inspect — expect the most recent tail
    m.publishSeed();
    expect(store.writeCalls[store.writeCalls.length - 1]).toEqual([6, 7, 8, 9]);
  });

  test('seed with invalid entries is filtered (NaN, negatives)', () => {
    const seed = [100, NaN, -5, 120, Infinity, 90];
    const store = makeFakeStore(seed);
    const m = new JitterMonitor(16, store);
    // Only the finite, non-negative values are kept
    expect(m.sampleCount()).toBe(3);
    m.publishSeed();
    expect(store.writeCalls[0]).toEqual([100, 120, 90]);
  });

  test('backward compatibility: JitterMonitor without a store behaves exactly as pre-iter2', () => {
    const m = new JitterMonitor();
    expect(m.sampleCount()).toBe(0);
    // First arrival sets baseline — no IAT yet.
    m.recordArrival(1000);
    // 4 arrivals = 3 IATs → below cold-start threshold of 4
    m.recordArrival(1100);
    m.recordArrival(1200);
    m.recordArrival(1300);
    expect(m.sampleCount()).toBe(3);
    expect(m.p95IAT()).toBeNull();
    // 5th arrival = 4 IATs → threshold met
    m.recordArrival(1400);
    expect(m.sampleCount()).toBe(4);
    expect(m.p95IAT()).not.toBeNull();
  });

  test('test isolation: two monitors with independent fake stores do not share state', () => {
    const storeA = makeFakeStore([10, 20, 30]);
    const storeB = makeFakeStore([100, 200, 300]);

    const mA = new JitterMonitor(16, storeA);
    const mB = new JitterMonitor(16, storeB);

    mA.publishSeed();
    mB.publishSeed();

    // Each store sees its own monitor's publish, not the other's.
    expect(storeA.writeCalls[0]).toEqual([10, 20, 30]);
    expect(storeB.writeCalls[0]).toEqual([100, 200, 300]);
  });
});
