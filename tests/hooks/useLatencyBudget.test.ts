// Unit tests for useLatencyBudget — four-budget turn telemetry.
//
// Plan: expressive-robot-companion-rewrite §6 RM-07.
//
// We mock `performance.now()` deterministically so budget arithmetic is
// asserted exactly rather than relying on real-clock drift.

import { act, renderHook } from "@testing-library/react-native";

import {
  LATENCY_TARGETS,
  useLatencyBudget,
  type LatencyBudgetSample,
} from "../../src/hooks/useLatencyBudget";

describe("useLatencyBudget", () => {
  const originalNow = globalThis.performance?.now;
  let clock = 0;

  beforeEach(() => {
    clock = 0;
    (globalThis as unknown as { performance: { now: () => number } }).performance = {
      now: () => clock,
    };
  });

  afterEach(() => {
    if (originalNow) {
      (globalThis as unknown as { performance: { now: () => number } }).performance = {
        now: originalNow,
      };
    }
  });

  function advance(ms: number) {
    clock += ms;
  }

  test("emits the four forward budgets exactly once per turn", () => {
    const samples: LatencyBudgetSample[] = [];
    const { result } = renderHook(() =>
      useLatencyBudget({ onSample: (s) => samples.push(s) }),
    );

    act(() => {
      result.current.startTurn("t1");
      result.current.markMicOpen(); // 0
      advance(300);
      result.current.markFirstPartial(); // transcript_ms = 300 (p50)
      advance(100);
      result.current.markMicClose(); // 400
      advance(120);
      result.current.markFirstNonIdleExpression(); // perceived_reaction_ms = 120 (p50)
      advance(700);
      result.current.markFirstTtsChunk(); // first_audio_ms = 820 (p50)
      advance(1800);
      result.current.markPlaybackEnd(); // full_completion_ms = 2620 (p95)
    });

    expect(samples.map((s) => s.metric)).toEqual([
      "transcript_ms",
      "perceived_reaction_ms",
      "first_audio_ms",
      "full_completion_ms",
    ]);
    expect(samples[0].value_ms).toBe(300);
    expect(samples[0].within).toBe("p50");
    expect(samples[1].value_ms).toBe(120);
    expect(samples[1].within).toBe("p50");
    expect(samples[2].value_ms).toBe(820);
    expect(samples[2].within).toBe("p50");
    expect(samples[3].value_ms).toBe(2620);
    expect(samples[3].within).toBe("p95");
  });

  test("is idempotent — repeated marks within a turn do not re-emit", () => {
    const samples: LatencyBudgetSample[] = [];
    const { result } = renderHook(() =>
      useLatencyBudget({ onSample: (s) => samples.push(s) }),
    );

    act(() => {
      result.current.startTurn("t1");
      result.current.markMicOpen();
      advance(200);
      result.current.markFirstPartial();
      advance(50);
      result.current.markFirstPartial(); // ignored
      result.current.markFirstPartial(); // ignored
    });

    expect(samples).toHaveLength(1);
    expect(samples[0].metric).toBe("transcript_ms");
    expect(samples[0].value_ms).toBe(200);
  });

  test("interrupt_to_stop_ms uses interrupt → audio_stop delta", () => {
    const samples: LatencyBudgetSample[] = [];
    const { result } = renderHook(() =>
      useLatencyBudget({ onSample: (s) => samples.push(s) }),
    );

    act(() => {
      result.current.startTurn("t1");
      result.current.markMicOpen();
      advance(500);
      result.current.markMicClose();
      advance(900);
      result.current.markFirstTtsChunk();
      advance(250);
      result.current.markInterrupt();
      advance(150);
      result.current.markAudioStopped();
    });

    const interrupt = samples.find((s) => s.metric === "interrupt_to_stop_ms");
    expect(interrupt).toBeDefined();
    expect(interrupt!.value_ms).toBe(150);
    expect(interrupt!.within).toBe("p95");
  });

  test("classifies over-budget samples as 'over'", () => {
    const samples: LatencyBudgetSample[] = [];
    const { result } = renderHook(() =>
      useLatencyBudget({ onSample: (s) => samples.push(s) }),
    );

    act(() => {
      result.current.startTurn("t1");
      result.current.markMicClose();
      advance(3000); // well over perceived_reaction p95 (250 ms)
      result.current.markFirstNonIdleExpression();
    });

    expect(samples[0].within).toBe("over");
    expect(samples[0].value_ms).toBe(3000);
  });

  test("exposes LATENCY_TARGETS matching ADR-011", () => {
    expect(LATENCY_TARGETS.first_audio_ms.p50_ms).toBe(900);
    expect(LATENCY_TARGETS.first_audio_ms.p95_ms).toBe(1300);
    expect(LATENCY_TARGETS.interrupt_to_stop_ms.p95_ms).toBe(200);
    expect(LATENCY_TARGETS.perceived_reaction_ms.p50_ms).toBe(150);
  });

  test("snapshot() returns a frozen view of the current turn", () => {
    const { result } = renderHook(() => useLatencyBudget());
    act(() => {
      result.current.startTurn("t1");
      result.current.markMicOpen();
      advance(200);
      result.current.markFirstPartial();
    });
    const snap = result.current.snapshot();
    expect(snap).not.toBeNull();
    expect(snap!.turn_id).toBe("t1");
    expect(snap!.samples.map((s) => s.metric)).toEqual(["transcript_ms"]);
  });
});
