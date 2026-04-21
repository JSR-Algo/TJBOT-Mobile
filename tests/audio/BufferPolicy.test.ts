import {
  DEFAULT_BUFFER_POLICY,
  POLICY_CAUTIOUS,
  POLICY_FAST,
  POLICY_FULL_BUFFER,
  clampPrebuffer,
  effectiveMinSegmentMs,
  effectiveRefillTargetMs,
} from '../../src/audio/BufferPolicy';

describe('BufferPolicy', () => {
  test('default values match plan §2.2 + iter2 §2.1-§2.5', () => {
    expect(DEFAULT_BUFFER_POLICY).toEqual({
      prebufferFloorMs: 350,
      prebufferCeilingMs: 900,
      prebufferJitterMult: 3.0,
      minSegmentMs: 250,
      targetQueueDepthMs: 350,
      underrunGraceMs: 120,
      refillTargetMs: 250,
      refillTimeoutMs: 1500,
      jitterWindow: 16,
      flushDelayMs: 250,
      // iter 2
      minSegmentJitterMult: 2.0,
      maxSegmentMs: 600,
      maxConsecutiveUnderruns: 2,
      escalatedPrebufferMs: 700,
      escalatedRefillTargetMs: 500,
      phraseAwareFlush: true,
      phraseBoundaryFloorMs: 100,
      seedJitterAcrossInstances: true,
      refillPollMinMs: 25,
      poorNetworkThreshold: 3,
      fullBufferCeilingMs: 3000,
      fullBufferMinCoverageMs: 2500,
      escalatedSegmentMult: 2.5,
      p95CautiousThresholdMs: 150,
      p95FullBufferThresholdMs: 300,
      seedPersistenceTtlMs: 24 * 60 * 60 * 1000,
      ratchetEvidenceTurns: 2,
    });
  });

  test('POLICY_FAST matches default policy shape', () => {
    expect(POLICY_FAST).toEqual(DEFAULT_BUFFER_POLICY);
  });

  test('POLICY_CAUTIOUS raises prebuffer floor over fast', () => {
    expect(POLICY_CAUTIOUS.prebufferFloorMs).toBeGreaterThan(
      POLICY_FAST.prebufferFloorMs,
    );
  });

  test('POLICY_FULL_BUFFER honors minimum full-buffer coverage', () => {
    expect(POLICY_FULL_BUFFER.prebufferFloorMs).toBeGreaterThanOrEqual(
      POLICY_FULL_BUFFER.fullBufferMinCoverageMs,
    );
  });

  test('POLICY_CAUTIOUS raises effective min segment size over fast', () => {
    expect(effectiveMinSegmentMs(100, POLICY_CAUTIOUS)).toBeGreaterThan(
      effectiveMinSegmentMs(100, POLICY_FAST),
    );
  });
});

describe('clampPrebuffer', () => {
  test('null p95 returns floor', () => {
    expect(clampPrebuffer(null, DEFAULT_BUFFER_POLICY)).toBe(350);
  });

  test('NaN p95 returns floor', () => {
    expect(clampPrebuffer(NaN, DEFAULT_BUFFER_POLICY)).toBe(350);
  });

  test('Infinity p95 returns floor', () => {
    expect(clampPrebuffer(Infinity, DEFAULT_BUFFER_POLICY)).toBe(350);
  });

  test('low p95 clamps to floor (100ms * 3 = 300 < floor 350)', () => {
    expect(clampPrebuffer(100, DEFAULT_BUFFER_POLICY)).toBe(350);
  });

  test('mid p95 scales linearly (150ms * 3 = 450, within band)', () => {
    expect(clampPrebuffer(150, DEFAULT_BUFFER_POLICY)).toBe(450);
  });

  test('high p95 clamps to ceiling (400ms * 3 = 1200 > ceiling 900)', () => {
    expect(clampPrebuffer(400, DEFAULT_BUFFER_POLICY)).toBe(900);
  });

  test('boundary: p95 = floor/mult returns floor exactly', () => {
    // 350 / 3 = 116.666... — just above the floor boundary
    expect(clampPrebuffer(116.666, DEFAULT_BUFFER_POLICY)).toBeCloseTo(350, 1);
  });

  test('boundary: p95 = ceiling/mult returns ceiling exactly', () => {
    // 900 / 3 = 300
    expect(clampPrebuffer(300, DEFAULT_BUFFER_POLICY)).toBe(900);
  });

  test('custom policy applies its own floor/ceiling', () => {
    const strict = {
      ...DEFAULT_BUFFER_POLICY,
      prebufferFloorMs: 100,
      prebufferCeilingMs: 500,
    };
    expect(clampPrebuffer(50, strict)).toBe(150); // 50*3=150, within
    expect(clampPrebuffer(10, strict)).toBe(100); // clamped to floor
    expect(clampPrebuffer(1000, strict)).toBe(500); // clamped to ceiling
  });
});

describe('effectiveMinSegmentMs (iter2 §2.1)', () => {
  test('null p95 returns minSegmentMs floor', () => {
    expect(effectiveMinSegmentMs(null, DEFAULT_BUFFER_POLICY)).toBe(250);
  });

  test('NaN p95 returns floor', () => {
    expect(effectiveMinSegmentMs(NaN, DEFAULT_BUFFER_POLICY)).toBe(250);
  });

  test('Infinity p95 returns floor', () => {
    expect(effectiveMinSegmentMs(Infinity, DEFAULT_BUFFER_POLICY)).toBe(250);
  });

  test('mid p95 scales: 150ms * 2 = 300, within band', () => {
    expect(effectiveMinSegmentMs(150, DEFAULT_BUFFER_POLICY)).toBe(300);
  });

  test('high p95 clamps to maxSegmentMs ceiling (500ms * 2 = 1000 > cap 600)', () => {
    expect(effectiveMinSegmentMs(500, DEFAULT_BUFFER_POLICY)).toBe(600);
  });

  test('very low p95 clamps up to minSegmentMs (50ms * 2 = 100 < floor 250)', () => {
    expect(effectiveMinSegmentMs(50, DEFAULT_BUFFER_POLICY)).toBe(250);
  });

  test('boundary: exactly at minSegmentMs/mult returns floor', () => {
    // 250 / 2 = 125
    expect(effectiveMinSegmentMs(125, DEFAULT_BUFFER_POLICY)).toBe(250);
  });

  test('boundary: exactly at maxSegmentMs/mult returns ceiling', () => {
    // 600 / 2 = 300
    expect(effectiveMinSegmentMs(300, DEFAULT_BUFFER_POLICY)).toBe(600);
  });

  test('multiplier=0 collapses adaptive behavior back to minSegmentMs', () => {
    const flat = { ...DEFAULT_BUFFER_POLICY, minSegmentJitterMult: 0 };
    expect(effectiveMinSegmentMs(500, flat)).toBe(250);
    expect(effectiveMinSegmentMs(50, flat)).toBe(250);
  });
});

describe('effectiveRefillTargetMs (iter2 §2.2)', () => {
  test('non-escalated returns baseline refillTargetMs', () => {
    expect(effectiveRefillTargetMs(DEFAULT_BUFFER_POLICY, false)).toBe(250);
  });

  test('escalated returns escalatedRefillTargetMs when higher', () => {
    expect(effectiveRefillTargetMs(DEFAULT_BUFFER_POLICY, true)).toBe(500);
  });

  test('escalated never goes below baseline if escalated constant is lower', () => {
    const inverted = {
      ...DEFAULT_BUFFER_POLICY,
      refillTargetMs: 800,
      escalatedRefillTargetMs: 300,
    };
    expect(effectiveRefillTargetMs(inverted, true)).toBe(800);
  });
});
