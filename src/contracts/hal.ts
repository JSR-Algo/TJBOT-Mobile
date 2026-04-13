// @tbot/contracts — Hardware Abstraction Layer — mobile projection (type-only)
//
// Source of truth: tbot-infra/contracts/hal.d.ts (ADR-013).
// Imported by tbot-mobile/src/screens/robot-demo/TwinDriver.ts (RM-12) and
// the backend-HAL=twin bridge (RM-10).
//
// Plan: expressive-robot-companion-rewrite §3 ADR-013, §6 RM-10/RM-12.

import type { Expression } from "./expression";
import type { Motion } from "./motion";
import type { RobotInteractionState } from "./robot-state";
import type {
  ExpressionEvent,
  InterruptEvent,
  LatencyTickEvent,
  MotionEvent,
  PerceivedReactionEvent,
  RobotStateEvent,
} from "./realtime-events";

export type HalKind = "twin" | "stub" | "hardware";

export interface DisplayDriver {
  /** Render an Expression frame for `duration_ms`, then return to IDLE_BREATHING. */
  setExpression(expression: Expression, duration_ms: number): Promise<void>;
  /** Preempt current face frame (INTERRUPT). */
  clear(): void;
  readonly kind: HalKind;
}

export interface MotionDriver {
  /**
   * Enqueue a Motion primitive. Twin-first per ADR-010: missing actuators are
   * a no-op, not a throw.
   */
  enqueue(motion: Motion, duration_ms: number, intensity?: number): Promise<void>;
  /** Drop every pending primitive (INTERRUPT). */
  drain(): void;
  /** Return to neutral pose. */
  neutral(): Promise<void>;
  readonly kind: HalKind;
}

export interface LedColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface LedDriver {
  setAll(color: LedColor): void;
  playEffect(effect: string, duration_ms: number): Promise<void>;
  clear(): void;
  readonly kind: HalKind;
}

export interface RobotEventEmitter {
  emitExpression(evt: ExpressionEvent): void;
  emitMotion(evt: MotionEvent): void;
  emitRobotState(evt: RobotStateEvent): void;
  emitPerceivedReaction(evt: PerceivedReactionEvent): void;
  emitInterrupt(evt: InterruptEvent): void;
  emitLatencyTick(evt: LatencyTickEvent): void;
}

export interface RobotHal {
  readonly display: DisplayDriver;
  readonly motion: MotionDriver;
  readonly led: LedDriver;
  readonly emitter: RobotEventEmitter;
  readonly state: RobotInteractionState;
}
