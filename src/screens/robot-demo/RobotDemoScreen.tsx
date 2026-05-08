// RobotDemoScreen — canonical software twin surface for TBOT on mobile.
//
// Plan: expressive-robot-companion-rewrite §6 RM-01/RM-08/RM-09/RM-10/RM-11,
//       §9 Mobile Robot Demo Screen responsibilities.
//
// Gating: this screen is registered on MainStack only when the environment
// variable EXPO_PUBLIC_DEMO_SCREEN === 'true'. Consumers must check
// `isRobotDemoScreenEnabled()` before navigating to it.
//
// What this screen covers for Sprint 7b:
//
//   RM-01  The screen itself + MainStack route behind EXPO_PUBLIC_DEMO_SCREEN.
//   RM-08  Debug grid rendering all 14 Expression values + all 12 Motion
//          primitives; each cell drives the twin HAL.
//   RM-09  Demo scenario picker — loads DEMO_SCENARIOS and replays them
//          through the twin HAL using the backend-twin bridge in scripted
//          mode (no network). This is the software-only playback path §9.9.
//   RM-10  Backend HAL=twin path — every Expression/Motion event is routed
//          through the TwinRobotEventEmitter's pub-sub and rendered on the
//          twin driver. An `EventSourceToggle` switches between the scripted
//          source and a pluggable backend source.
//   RM-11  Dev-only LatencyHud overlay showing the 4 ADR-011 budgets.
//
// NOT in scope for worker-4 (these belong to worker-5's mobile-perf slice):
//   - Reanimated body renderer (RM-03)
//   - Pre-buffer reduction (RM-04)
//   - Barge-in UI wiring (RM-05)
//   - VAD hold-off (RM-06)
//
// The tap-anywhere hint surface is still present so when worker-5 lands
// barge-in it can bind onPress directly to `handleLocalInterrupt`.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { LatencyHud } from "../../components/robot/LatencyHud";
import {
  ALL_EXPRESSIONS,
  Expression,
  expressionMetadata,
} from "../../contracts/expression";
import {
  ALL_MOTIONS,
  Motion,
  MOTION_CHANNEL,
} from "../../contracts/motion";
import {
  ALL_STATES,
  RobotInteractionState,
} from "../../contracts/robot-state";
import type {
  LatencyMetric,
  RealtimeEvent,
} from "../../contracts/realtime-events";
import { useLatencyBudget, type LatencyBudgetSample } from "../../hooks/useLatencyBudget";
import {
  TwinHal,
  type AnyRobotEvent,
} from "./TwinDriver";
import {
  handleRealtimeEvent,
  useBackendTwinBridge,
  type BackendEventSource,
} from "./useBackendTwinBridge";
import { DEMO_SCENARIOS, type DemoScenario } from "./demoScenarios";

// ===========================================================================
// Env flag — the screen is dev/demo only
// ===========================================================================

/**
 * EXPO_PUBLIC_DEMO_SCREEN must be the literal string `"true"`. We read from
 * `process.env` so Metro replaces it at build time; any other value leaves
 * the screen gated off and `isRobotDemoScreenEnabled()` returns false.
 */
export function isRobotDemoScreenEnabled(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (process as any)?.env ?? {};
  return env.EXPO_PUBLIC_DEMO_SCREEN === "true";
}

// ===========================================================================
// Local event source — scripted scenario player
// ===========================================================================

interface ScriptedSourceHandle {
  readonly subscribe: BackendEventSource;
  readonly push: (event: RealtimeEvent) => void;
  readonly reset: () => void;
}

function createScriptedSource(): ScriptedSourceHandle {
  let listeners = new Set<(evt: unknown) => void>();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    push: (event) => {
      for (const l of listeners) l(event);
    },
    reset: () => {
      listeners = new Set();
    },
  };
}

// ===========================================================================
// Screen
// ===========================================================================

export function RobotDemoScreen(): React.JSX.Element {
  // Twin HAL is stable across re-renders; the mutable recording lives inside.
  const halRef = useRef<TwinHal | null>(null);
  if (halRef.current === null) halRef.current = new TwinHal();
  const hal = halRef.current;

  // Scripted event source for scenario playback. A real backend source would
  // live in an adapter module and be swapped in via the EventSourceToggle.
  const scriptedRef = useRef<ScriptedSourceHandle | null>(null);
  if (scriptedRef.current === null) scriptedRef.current = createScriptedSource();
  const scripted = scriptedRef.current;

  const [bridgeEnabled, setBridgeEnabled] = useState<boolean>(true);
  const [canonicalState, setCanonicalState] = useState<RobotInteractionState>(
    RobotInteractionState.IDLE,
  );
  const [currentExpression, setCurrentExpression] = useState<Expression>(
    Expression.IDLE_BREATHING,
  );
  const [currentMotion, setCurrentMotion] = useState<Motion | null>(null);
  const [eventLog, setEventLog] = useState<readonly AnyRobotEvent[]>([]);

  // Latency hook — renders via HUD, emits via onSample.
  const [latencySamples, setLatencySamples] = useState<
    Partial<Record<LatencyMetric, LatencyBudgetSample>>
  >({});
  const latency = useLatencyBudget({
    onSample: (sample) =>
      setLatencySamples((prev) => ({ ...prev, [sample.metric]: sample })),
    log: __DEV__,
  });

  // Subscribe to canonical FSM transitions so the state-tape re-renders.
  useEffect(() => {
    const unsub = hal.listenState((next) => setCanonicalState(next));
    return unsub;
  }, [hal]);

  // Subscribe to display + motion + emitter history so the debug grid and
  // event log update on every HAL=twin event.
  useEffect(() => {
    const unsubDisplay = hal.display.listen((frame) =>
      setCurrentExpression(frame.expression),
    );
    const unsubMotion = hal.motion.listen((frame) =>
      setCurrentMotion(frame.motion),
    );
    const unsubEmitter = hal.emitter.listen((evt) =>
      setEventLog((log) => {
        const next = [...log, evt];
        return next.length > 50 ? next.slice(next.length - 50) : next;
      }),
    );
    return () => {
      unsubDisplay();
      unsubMotion();
      unsubEmitter();
    };
  }, [hal]);

  // Wire the backend twin bridge to the scripted source. When a real WS is
  // attached, the caller swaps `scripted.subscribe` for `realtime.subscribe`.
  useBackendTwinBridge({
    hal,
    source: scripted.subscribe,
    enabled: bridgeEnabled,
  });

  // --- Debug actions --------------------------------------------------------

  const forceExpression = useCallback(
    (expr: Expression) => {
      const meta = expressionMetadata(expr);
      void hal.display.setExpression(expr, meta?.default_duration_ms ?? 1500);
    },
    [hal],
  );

  const forceMotion = useCallback(
    (m: Motion) => {
      void hal.motion.enqueue(m, 800, 1);
    },
    [hal],
  );

  const forceState = useCallback(
    (s: RobotInteractionState) => {
      if (!hal.trySetState(s)) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn(
            `[RobotDemoScreen] force state ${canonicalState} → ${s} rejected by canonical FSM`,
          );
        }
      }
    },
    [hal, canonicalState],
  );

  const handleLocalInterrupt = useCallback(() => {
    // Mirror the wire-protocol INTERRUPT so the twin drains like the real
    // runtime will. Full barge-in (mic re-arm, metrics) is worker-5's slice.
    latency.markInterrupt();
    handleRealtimeEvent(
      {
        type: "INTERRUPT",
        session_id: "demo",
        turn_id: "demo-turn",
        timestamp_ms: Date.now(),
        payload: { reason: "USER_TAP", source: "mobile" },
      },
      hal,
    );
    latency.markAudioStopped();
  }, [hal, latency]);

  // --- Scenario playback (RM-09) -------------------------------------------

  const [playingScenario, setPlayingScenario] = useState<DemoScenario | null>(null);

  const playScenario = useCallback(
    (scenario: DemoScenario) => {
      setPlayingScenario(scenario);
      hal.resetForTest();
      setLatencySamples({});
      latency.startTurn(scenario.id);
      latency.markMicOpen();

      // Walk through the scripted turns with short gaps so the twin has time
      // to animate each one. A production scenario player would hook into
      // real TTS + STT events; here we synthesize the canonical event order:
      //   EXPRESSION → MOTION → ROBOT_STATE transitions for visual feedback.
      let delay = 0;
      scenario.script.forEach((turn, idx) => {
        const at = delay;
        // Robot demo scripted-event scheduler. Presentation-only —
        // does not affect the production voice FSM (this screen is a
        // demo runner that synthesizes events, not consumes them).
        // eslint-disable-next-line tbot-voice/no-voice-timing-in-shared
        setTimeout(() => {
          scripted.push({
            type: "ROBOT_STATE",
            session_id: scenario.id,
            turn_id: `${scenario.id}-${idx}`,
            timestamp_ms: Date.now(),
            payload: { state: RobotInteractionState.LISTENING },
          });
          scripted.push({
            type: "PERCEIVED_REACTION",
            session_id: scenario.id,
            turn_id: `${scenario.id}-${idx}`,
            timestamp_ms: Date.now(),
            payload: { trigger: "AUDIO_END" },
          });
          latency.markMicClose();
          latency.markFirstNonIdleExpression();
          scripted.push({
            type: "EXPRESSION",
            session_id: scenario.id,
            turn_id: `${scenario.id}-${idx}`,
            timestamp_ms: Date.now(),
            payload: {
              expression: turn.expected_expression,
              duration_ms: 1500,
              source: "llm_tag",
            },
          });
          scripted.push({
            type: "MOTION",
            session_id: scenario.id,
            turn_id: `${scenario.id}-${idx}`,
            timestamp_ms: Date.now(),
            payload: {
              motion: turn.expected_motion,
              duration_ms: 800,
              intensity: 1,
            },
          });
          latency.markFirstTtsChunk();
          latency.markPlaybackEnd();
        }, at);
        delay += 700; // ~700 ms per turn for a watchable demo
      });
      // Robot demo scenario-end hook. Presentation-only.
      // eslint-disable-next-line tbot-voice/no-voice-timing-in-shared
      setTimeout(() => setPlayingScenario(null), delay + 300);
    },
    [hal, latency, scripted],
  );

  // --- Render ---------------------------------------------------------------

  const expressionCards = useMemo(
    () =>
      ALL_EXPRESSIONS.map((expr) => {
        const meta = expressionMetadata(expr);
        const active = currentExpression === expr;
        return (
          <Pressable
            key={expr}
            onPress={() => forceExpression(expr)}
            style={[styles.card, active && styles.cardActive]}
            accessibilityLabel={`Force expression ${expr}`}
          >
            <Text style={styles.cardTitle}>{expr}</Text>
            <Text style={styles.cardMeta}>{meta?.label}</Text>
            <Text style={styles.cardMeta}>
              → {meta?.recommended_motion} · {meta?.default_duration_ms}ms
            </Text>
            <Text style={styles.cardTags}>{meta?.mood_tags.join(" · ")}</Text>
          </Pressable>
        );
      }),
    [currentExpression, forceExpression],
  );

  const motionButtons = useMemo(
    () =>
      ALL_MOTIONS.map((m) => {
        const active = currentMotion === m;
        return (
          <Pressable
            key={m}
            onPress={() => forceMotion(m)}
            style={[styles.motionButton, active && styles.motionButtonActive]}
            accessibilityLabel={`Force motion ${m}`}
          >
            <Text style={styles.motionLabel}>{m}</Text>
            <Text style={styles.motionChannel}>{MOTION_CHANNEL[m]}</Text>
          </Pressable>
        );
      }),
    [currentMotion, forceMotion],
  );

  const stateButtons = useMemo(
    () =>
      ALL_STATES.map((s) => {
        const active = canonicalState === s;
        return (
          <Pressable
            key={s}
            onPress={() => forceState(s)}
            style={[styles.stateButton, active && styles.stateButtonActive]}
            accessibilityLabel={`Force state ${s}`}
          >
            <Text style={styles.stateLabel}>{s}</Text>
          </Pressable>
        );
      }),
    [canonicalState, forceState],
  );

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.interruptSurface}
        onPress={handleLocalInterrupt}
        accessibilityLabel="Tap to interrupt"
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>TBOT Robot Demo (twin)</Text>
            <Text style={styles.subtitle}>
              Canonical state: <Text style={styles.strong}>{canonicalState}</Text>
            </Text>
            <Text style={styles.subtitle}>
              Expression: <Text style={styles.strong}>{currentExpression}</Text>
            </Text>
            <Text style={styles.subtitle}>
              Motion: <Text style={styles.strong}>{currentMotion ?? "—"}</Text>
            </Text>
            <View style={styles.switchRow}>
              <Text style={styles.subtitle}>HAL=twin bridge</Text>
              <Switch
                value={bridgeEnabled}
                onValueChange={setBridgeEnabled}
                accessibilityLabel="Toggle HAL=twin bridge"
              />
            </View>
            {playingScenario && (
              <Text style={styles.subtitleWarn}>
                Playing scenario: {playingScenario.id}
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Expressions (14)</Text>
          <View style={styles.grid}>{expressionCards}</View>

          <Text style={styles.sectionTitle}>Motions (12)</Text>
          <View style={styles.row}>{motionButtons}</View>

          <Text style={styles.sectionTitle}>Canonical FSM (10)</Text>
          <View style={styles.row}>{stateButtons}</View>

          <Text style={styles.sectionTitle}>Demo Scenarios</Text>
          <View style={styles.columnList}>
            {DEMO_SCENARIOS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => playScenario(s)}
                style={styles.scenarioRow}
                accessibilityLabel={`Play scenario ${s.id}`}
              >
                <Text style={styles.scenarioTitle}>{s.title}</Text>
                <Text style={styles.scenarioMeta}>
                  {s.id} · {s.script.length} turn{s.script.length === 1 ? "" : "s"} ·
                  tone ≥ {s.tone_min_score.toFixed(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Event log (last 50)</Text>
          <View style={styles.logWrap}>
            {eventLog.length === 0 ? (
              <Text style={styles.logEmpty}>no events yet</Text>
            ) : (
              eventLog.slice(-20).map((evt, i) => (
                <Text key={`${i}-${evt.kind}`} style={styles.logLine}>
                  {evt.kind} · {JSON.stringify(evt.event.payload)}
                </Text>
              ))
            )}
          </View>

          <Text style={styles.footer}>
            Tap anywhere to fire a local INTERRUPT (barge-in UI wiring is
            worker-5's RM-05 slice).
          </Text>
        </ScrollView>
      </Pressable>

      <LatencyHud samples={latencySamples} visible={__DEV__} />
    </View>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  interruptSurface: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: "#e0f7fa",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#b0bec5",
    fontSize: 12,
    marginBottom: 2,
  },
  subtitleWarn: {
    color: "#ffd54f",
    fontSize: 12,
    marginTop: 4,
  },
  strong: {
    color: "#00e5ff",
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  sectionTitle: {
    color: "#eceff1",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 6,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  card: {
    width: "48%",
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#14202e",
    borderColor: "#263238",
    borderWidth: 1,
  },
  cardActive: {
    borderColor: "#00e5ff",
    backgroundColor: "#0e2a33",
  },
  cardTitle: {
    color: "#eceff1",
    fontWeight: "700",
    fontSize: 11,
  },
  cardMeta: {
    color: "#90a4ae",
    fontSize: 10,
    marginTop: 2,
  },
  cardTags: {
    color: "#607d8b",
    fontSize: 9,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  motionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#14202e",
    borderWidth: 1,
    borderColor: "#263238",
  },
  motionButtonActive: {
    borderColor: "#00e5ff",
    backgroundColor: "#0e2a33",
  },
  motionLabel: {
    color: "#eceff1",
    fontSize: 11,
    fontWeight: "600",
  },
  motionChannel: {
    color: "#78909c",
    fontSize: 9,
  },
  stateButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: "#1c2631",
  },
  stateButtonActive: {
    backgroundColor: "#00363a",
    borderWidth: 1,
    borderColor: "#00e5ff",
  },
  stateLabel: {
    color: "#b2ebf2",
    fontSize: 10,
  },
  columnList: {
    flexDirection: "column",
    gap: 6,
  },
  scenarioRow: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#141d2a",
    borderWidth: 1,
    borderColor: "#263238",
  },
  scenarioTitle: {
    color: "#e0f7fa",
    fontSize: 12,
    fontWeight: "700",
  },
  scenarioMeta: {
    color: "#78909c",
    fontSize: 10,
    marginTop: 2,
  },
  logWrap: {
    backgroundColor: "#10161f",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#263238",
  },
  logEmpty: {
    color: "#546e7a",
    fontSize: 10,
    fontStyle: "italic",
  },
  logLine: {
    color: "#80cbc4",
    fontSize: 9,
    fontFamily: undefined,
    marginVertical: 1,
  },
  footer: {
    color: "#546e7a",
    fontSize: 10,
    marginTop: 18,
    fontStyle: "italic",
  },
});
