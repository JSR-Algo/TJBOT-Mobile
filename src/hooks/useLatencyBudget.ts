// useLatencyBudget — four-budget turn telemetry for the robot demo / interaction.
//
// Plan: expressive-robot-companion-rewrite §3 ADR-011, §6 RM-07.
// AC: "new useLatencyBudget hook; emits all 4 budgets per turn; dev HUD shows
//      live numbers; CI parses logs".
//
// Four canonical budgets (ADR-011):
//   L1 perceived_reaction_ms — mic close → first non-IDLE expression
//   L2 transcript_ms         — mic open  → first partial transcript
//   L3 first_audio_ms        — mic close → first TTS audio sample played
//   L4 full_completion_ms    — mic close → TTS playback end
//
// The hook is pure in-memory; a ref holds per-turn timestamps so repeated
// renders never re-emit the same budget. The returned `emit` function pipes
// finalized budgets to:
//   - an optional listener (Latency HUD / RM-11)
//   - an optional LATENCY_TICK realtime event sink (RM-10 bridge)
//   - `__DEV__ && console.log` with a parseable prefix so CI can scrape it.

import { useCallback, useEffect, useMemo, useRef } from "react";

import type { LatencyMetric } from "../contracts/realtime-events";

export interface LatencyBudgetSample {
  readonly metric: LatencyMetric;
  readonly value_ms: number;
  readonly within: "p50" | "p95" | "over";
  readonly turn_id: string;
}

// Canonical ADR-011 p50/p95 targets.
export const LATENCY_TARGETS: Readonly<
  Record<LatencyMetric, { readonly p50_ms: number; readonly p95_ms: number }>
> = Object.freeze({
  perceived_reaction_ms: Object.freeze({ p50_ms: 150, p95_ms: 250 }),
  transcript_ms: Object.freeze({ p50_ms: 350, p95_ms: 600 }),
  first_audio_ms: Object.freeze({ p50_ms: 900, p95_ms: 1300 }),
  full_completion_ms: Object.freeze({ p50_ms: 2200, p95_ms: 3500 }),
  interrupt_to_stop_ms: Object.freeze({ p50_ms: 120, p95_ms: 200 }),
});

function classify(
  metric: LatencyMetric,
  value_ms: number,
): LatencyBudgetSample["within"] {
  const t = LATENCY_TARGETS[metric];
  if (value_ms <= t.p50_ms) return "p50";
  if (value_ms <= t.p95_ms) return "p95";
  return "over";
}

export interface TurnTimings {
  mic_open_ms?: number;
  mic_close_ms?: number;
  first_partial_ms?: number;
  first_non_idle_expression_ms?: number;
  first_tts_chunk_ms?: number;
  playback_end_ms?: number;
  interrupt_ms?: number;
  audio_stop_ms?: number;
}

export interface LatencyBudgetState {
  readonly turn_id: string;
  readonly timings: Readonly<TurnTimings>;
  readonly samples: readonly LatencyBudgetSample[];
}

export interface UseLatencyBudgetOptions {
  /** Fires whenever a new budget is finalized for the active turn. */
  onSample?: (sample: LatencyBudgetSample) => void;
  /**
   * Dev-only log tag. Budgets are printed as
   *   `[tbot-latency] <turn_id> <metric>=<value>ms (<class>)`
   * so the `qa-latency` CI job can scrape them.
   */
  log?: boolean;
}

const NOW = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

/**
 * Hook contract:
 *
 *   startTurn('turn-42')
 *   markMicOpen()
 *   markMicClose()
 *   markFirstPartial()                // → emits transcript_ms
 *   markFirstNonIdleExpression()      // → emits perceived_reaction_ms
 *   markFirstTtsChunk()               // → emits first_audio_ms
 *   markPlaybackEnd()                 // → emits full_completion_ms
 *   markInterrupt()                   // starts interrupt_to_stop_ms clock
 *   markAudioStopped()                // → emits interrupt_to_stop_ms
 *
 * Each marker is idempotent within a turn: calling it twice is a no-op. This
 * is crucial on React — re-renders must not re-emit.
 */
export function useLatencyBudget(opts: UseLatencyBudgetOptions = {}) {
  const { onSample, log = false } = opts;
  const onSampleRef = useRef(onSample);
  const logRef = useRef(log);
  useEffect(() => {
    onSampleRef.current = onSample;
  }, [onSample]);
  useEffect(() => {
    logRef.current = log;
  }, [log]);

  const turnRef = useRef<{
    id: string;
    timings: TurnTimings;
    samples: LatencyBudgetSample[];
    emitted: Set<LatencyMetric>;
  } | null>(null);

  const emit = useCallback((metric: LatencyMetric, value_ms: number) => {
    const turn = turnRef.current;
    if (!turn) return;
    if (turn.emitted.has(metric)) return; // idempotent per turn
    const sample: LatencyBudgetSample = Object.freeze({
      metric,
      value_ms,
      within: classify(metric, value_ms),
      turn_id: turn.id,
    });
    turn.samples.push(sample);
    turn.emitted.add(metric);
    if (logRef.current && typeof console !== "undefined") {
      // Parseable by the `qa-latency` CI job.
      // eslint-disable-next-line no-console
      console.log(
        `[tbot-latency] ${turn.id} ${metric}=${value_ms.toFixed(1)}ms (${sample.within})`,
      );
    }
    onSampleRef.current?.(sample);
  }, []);

  const startTurn = useCallback((turn_id: string) => {
    turnRef.current = {
      id: turn_id,
      timings: {},
      samples: [],
      emitted: new Set(),
    };
  }, []);

  const markMicOpen = useCallback(() => {
    const turn = turnRef.current;
    if (!turn || turn.timings.mic_open_ms !== undefined) return;
    turn.timings.mic_open_ms = NOW();
  }, []);

  const markMicClose = useCallback(() => {
    const turn = turnRef.current;
    if (!turn || turn.timings.mic_close_ms !== undefined) return;
    turn.timings.mic_close_ms = NOW();
  }, []);

  const markFirstPartial = useCallback(() => {
    const turn = turnRef.current;
    if (!turn) return;
    if (turn.timings.first_partial_ms !== undefined) return;
    turn.timings.first_partial_ms = NOW();
    if (turn.timings.mic_open_ms !== undefined) {
      emit("transcript_ms", turn.timings.first_partial_ms - turn.timings.mic_open_ms);
    }
  }, [emit]);

  const markFirstNonIdleExpression = useCallback(() => {
    const turn = turnRef.current;
    if (!turn) return;
    if (turn.timings.first_non_idle_expression_ms !== undefined) return;
    turn.timings.first_non_idle_expression_ms = NOW();
    if (turn.timings.mic_close_ms !== undefined) {
      emit(
        "perceived_reaction_ms",
        turn.timings.first_non_idle_expression_ms - turn.timings.mic_close_ms,
      );
    }
  }, [emit]);

  const markFirstTtsChunk = useCallback(() => {
    const turn = turnRef.current;
    if (!turn) return;
    if (turn.timings.first_tts_chunk_ms !== undefined) return;
    turn.timings.first_tts_chunk_ms = NOW();
    if (turn.timings.mic_close_ms !== undefined) {
      emit(
        "first_audio_ms",
        turn.timings.first_tts_chunk_ms - turn.timings.mic_close_ms,
      );
    }
  }, [emit]);

  const markPlaybackEnd = useCallback(() => {
    const turn = turnRef.current;
    if (!turn) return;
    if (turn.timings.playback_end_ms !== undefined) return;
    turn.timings.playback_end_ms = NOW();
    if (turn.timings.mic_close_ms !== undefined) {
      emit(
        "full_completion_ms",
        turn.timings.playback_end_ms - turn.timings.mic_close_ms,
      );
    }
  }, [emit]);

  const markInterrupt = useCallback(() => {
    const turn = turnRef.current;
    if (!turn) return;
    if (turn.timings.interrupt_ms !== undefined) return;
    turn.timings.interrupt_ms = NOW();
  }, []);

  const markAudioStopped = useCallback(() => {
    const turn = turnRef.current;
    if (!turn) return;
    if (turn.timings.audio_stop_ms !== undefined) return;
    turn.timings.audio_stop_ms = NOW();
    if (turn.timings.interrupt_ms !== undefined) {
      emit(
        "interrupt_to_stop_ms",
        turn.timings.audio_stop_ms - turn.timings.interrupt_ms,
      );
    }
  }, [emit]);

  const snapshot = useCallback((): LatencyBudgetState | null => {
    const turn = turnRef.current;
    if (!turn) return null;
    return {
      turn_id: turn.id,
      timings: { ...turn.timings },
      samples: [...turn.samples],
    };
  }, []);

  return useMemo(
    () => ({
      LATENCY_TARGETS,
      startTurn,
      markMicOpen,
      markMicClose,
      markFirstPartial,
      markFirstNonIdleExpression,
      markFirstTtsChunk,
      markPlaybackEnd,
      markInterrupt,
      markAudioStopped,
      snapshot,
    }),
    [
      startTurn,
      markMicOpen,
      markMicClose,
      markFirstPartial,
      markFirstNonIdleExpression,
      markFirstTtsChunk,
      markPlaybackEnd,
      markInterrupt,
      markAudioStopped,
      snapshot,
    ],
  );
}
