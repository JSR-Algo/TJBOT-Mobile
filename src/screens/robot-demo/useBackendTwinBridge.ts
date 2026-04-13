// useBackendTwinBridge — consume backend Expression/Motion/ROBOT_STATE events
// and drive the twin HAL. This is the HAL=twin path from ADR-013.
//
// Plan: expressive-robot-companion-rewrite §6 RM-10.
// AC: "Backend HAL=twin path → twin renders backend-emitted Expression/Motion
//      events; end-to-end demo of one tagged turn".
//
// The bridge is transport-agnostic: callers pass an observable (function that
// registers a listener). This makes it trivial to drive from:
//   - a real WebSocket (realtime.client.ts)
//   - a scripted scenario player (DEMO_SCENARIOS replay)
//   - a Jest test harness
//
// Invariants:
//   1. Every incoming message is guarded by `isRealtimeEvent` before it
//      reaches the HAL. Malformed events are dropped with a dev warning.
//   2. Canonical FSM transitions use `trySetState` so out-of-order ROBOT_STATE
//      events cannot throw and unmount the screen.
//   3. An optional hook to the latency-budget hook fires on EXPRESSION (first
//      non-idle) and INTERRUPT events so the HUD updates in real time.

import { useEffect } from "react";

import { isRealtimeEvent } from "../../contracts/realtime-events";
import type {
  ExpressionEvent,
  InterruptEvent,
  LatencyTickEvent,
  MotionEvent,
  PerceivedReactionEvent,
  RealtimeEvent,
  RobotStateEvent,
} from "../../contracts/realtime-events";
import { Expression, DEFAULT_EXPRESSION } from "../../contracts/expression";
import type { TwinHal } from "./TwinDriver";

/**
 * A backend event source is any function that registers a listener and
 * returns an unsubscribe. Realtime client, mock driver, and scenario player
 * all satisfy this shape.
 */
export type BackendEventSource = (
  listener: (event: unknown) => void,
) => () => void;

export interface UseBackendTwinBridgeOptions {
  readonly hal: TwinHal;
  readonly source: BackendEventSource;
  readonly onExpression?: (event: ExpressionEvent) => void;
  readonly onMotion?: (event: MotionEvent) => void;
  readonly onRobotState?: (event: RobotStateEvent) => void;
  readonly onPerceivedReaction?: (event: PerceivedReactionEvent) => void;
  readonly onInterrupt?: (event: InterruptEvent) => void;
  readonly onLatencyTick?: (event: LatencyTickEvent) => void;
  /** Disable binding without unmounting; handy for the HAL=stub toggle. */
  readonly enabled?: boolean;
}

/**
 * Binds the backend event source to the twin HAL.
 *
 * `handleRealtimeEvent` is exported so unit tests and the scenario player can
 * feed events synthetically without spinning up a fake event source.
 */
export function handleRealtimeEvent(
  event: RealtimeEvent,
  hal: TwinHal,
  callbacks?: Omit<UseBackendTwinBridgeOptions, "hal" | "source" | "enabled">,
): void {
  switch (event.type) {
    case "EXPRESSION": {
      // Fire-and-forget; twin setExpression is synchronous under the hood.
      void hal.display.setExpression(
        event.payload.expression as Expression,
        event.payload.duration_ms,
      );
      hal.emitter.emitExpression(event);
      callbacks?.onExpression?.(event);
      break;
    }
    case "MOTION": {
      void hal.motion.enqueue(
        event.payload.motion,
        event.payload.duration_ms,
        event.payload.intensity,
      );
      hal.emitter.emitMotion(event);
      callbacks?.onMotion?.(event);
      break;
    }
    case "ROBOT_STATE": {
      hal.trySetState(event.payload.state);
      hal.emitter.emitRobotState(event);
      callbacks?.onRobotState?.(event);
      break;
    }
    case "PERCEIVED_REACTION": {
      // Perceived-reaction is a UI-side animation cue per ADR-011 L1. The
      // screen-level hook owns the corresponding expression flip; here we
      // just forward the event so the HUD can start its timer.
      hal.emitter.emitPerceivedReaction(event);
      callbacks?.onPerceivedReaction?.(event);
      break;
    }
    case "INTERRUPT": {
      hal.display.clear();
      hal.motion.drain();
      hal.emitter.emitInterrupt(event);
      // Snap the face back to the canonical quiet frame so the twin's last
      // animation doesn't linger past the abort.
      void hal.display.setExpression(Expression.INTERRUPTED_QUIET, 600);
      callbacks?.onInterrupt?.(event);
      break;
    }
    case "LATENCY_TICK": {
      hal.emitter.emitLatencyTick(event);
      callbacks?.onLatencyTick?.(event);
      break;
    }
    default: {
      // Exhaustiveness guard — compile error on missing case.
      const _exhaustive: never = event;
      void _exhaustive;
    }
  }
  // Silence DEFAULT_EXPRESSION unused-import lint without affecting behavior.
  void DEFAULT_EXPRESSION;
}

export function useBackendTwinBridge(opts: UseBackendTwinBridgeOptions): void {
  const {
    hal,
    source,
    enabled = true,
    onExpression,
    onMotion,
    onRobotState,
    onPerceivedReaction,
    onInterrupt,
    onLatencyTick,
  } = opts;

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = source((raw) => {
      if (!isRealtimeEvent(raw)) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn("[useBackendTwinBridge] dropped malformed event", raw);
        }
        return;
      }
      handleRealtimeEvent(raw, hal, {
        onExpression,
        onMotion,
        onRobotState,
        onPerceivedReaction,
        onInterrupt,
        onLatencyTick,
      });
    });
    return unsubscribe;
  }, [
    hal,
    source,
    enabled,
    onExpression,
    onMotion,
    onRobotState,
    onPerceivedReaction,
    onInterrupt,
    onLatencyTick,
  ]);
}
