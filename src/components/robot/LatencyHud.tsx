// LatencyHud — dev-only 4-budget HUD overlay for the robot demo screen.
//
// Plan: expressive-robot-companion-rewrite §3 ADR-011, §6 RM-11.
// AC: "HUD shows perceived/transcript/first-audio/full per turn, color-coded
//      vs ADR-011 budgets; HUD visible in dev only; numbers update every turn".
//
// The HUD is a read-only projection of the most recent LatencyBudgetSample
// per metric. It is deliberately kept minimal — no animations, no tap targets
// — so it cannot steal frames from the 60 fps twin body renderer.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { LATENCY_TARGETS } from "../../hooks/useLatencyBudget";
import type { LatencyBudgetSample } from "../../hooks/useLatencyBudget";
import type { LatencyMetric } from "../../contracts/realtime-events";

interface LatencyHudProps {
  /**
   * Latest sample per metric, keyed by LatencyMetric. Renders a dash when a
   * metric has not yet been observed for the current turn.
   */
  readonly samples: Readonly<Partial<Record<LatencyMetric, LatencyBudgetSample>>>;
  /** When false, the HUD renders nothing. Wire to `__DEV__` in callers. */
  readonly visible: boolean;
}

interface Row {
  readonly metric: LatencyMetric;
  readonly label: string;
}

const ROWS: readonly Row[] = [
  { metric: "perceived_reaction_ms", label: "L1 perceived" },
  { metric: "transcript_ms", label: "L2 transcript" },
  { metric: "first_audio_ms", label: "L3 first audio" },
  { metric: "full_completion_ms", label: "L4 full" },
  { metric: "interrupt_to_stop_ms", label: "L5 interrupt" },
];

function classColor(cls: LatencyBudgetSample["within"] | null): string {
  switch (cls) {
    case "p50":
      return "#3ddc84"; // green — under the p50 headline number
    case "p95":
      return "#f9c74f"; // amber — within p95 but above p50
    case "over":
      return "#ff4d4f"; // red — over ADR-011 budget
    default:
      return "#90a4ae"; // grey — no sample yet
  }
}

function formatValue(sample: LatencyBudgetSample | undefined): string {
  if (!sample) return "—";
  return `${Math.round(sample.value_ms)}ms`;
}

function formatTargets(metric: LatencyMetric): string {
  const t = LATENCY_TARGETS[metric];
  return `p50 ≤ ${t.p50_ms} / p95 ≤ ${t.p95_ms}`;
}

export function LatencyHud({ samples, visible }: LatencyHudProps): React.JSX.Element | null {
  if (!visible) return null;
  return (
    <View
      style={styles.container}
      accessibilityLabel="Latency HUD — ADR-011 budgets"
      pointerEvents="none"
    >
      <Text style={styles.title}>ADR-011 LATENCY HUD</Text>
      {ROWS.map((row) => {
        const sample = samples[row.metric];
        const color = classColor(sample ? sample.within : null);
        return (
          <View key={row.metric} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={[styles.value, { color }]}>{formatValue(sample)}</Text>
            <Text style={styles.target}>{formatTargets(row.metric)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 44,
    right: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(10, 15, 25, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(96, 125, 139, 0.5)",
    maxWidth: 280,
  },
  title: {
    color: "#eceff1",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 1,
  },
  label: {
    color: "#cfd8dc",
    fontSize: 10,
    width: 96,
  },
  value: {
    fontSize: 11,
    fontWeight: "700",
    width: 66,
    textAlign: "right",
    marginRight: 6,
  },
  target: {
    color: "#78909c",
    fontSize: 9,
    flexShrink: 1,
  },
});
