// @tbot/contracts — Realtime event vocabulary — mobile projection
//
// Source of truth: tbot-infra/contracts/realtime-events.js (ADR-006/011/014).
// Mobile omits the Zod validator to avoid a new runtime dependency; instead it
// exposes TypeScript discriminated-union types plus a lightweight
// `isRealtimeEvent` narrowing helper. Round-trip compatibility with the
// backend payloads is guaranteed by parity test against the JS module.
//
// Plan: expressive-robot-companion-rewrite §3 ADR-006, §6 RM-07/RM-10/RM-11.

import type { Expression } from "./expression";
import type { Motion } from "./motion";
import type { RobotInteractionState } from "./robot-state";

export const RealtimeEventType = Object.freeze({
  INTERRUPT: "INTERRUPT",
  EXPRESSION: "EXPRESSION",
  MOTION: "MOTION",
  ROBOT_STATE: "ROBOT_STATE",
  PERCEIVED_REACTION: "PERCEIVED_REACTION",
  LATENCY_TICK: "LATENCY_TICK",
} as const);
export type RealtimeEventType =
  (typeof RealtimeEventType)[keyof typeof RealtimeEventType];

export const ALL_EVENT_TYPES: readonly RealtimeEventType[] = Object.freeze(
  Object.values(RealtimeEventType),
) as readonly RealtimeEventType[];

export interface EventEnvelope {
  readonly session_id: string;
  readonly turn_id?: string;
  readonly timestamp_ms: number;
}

export type InterruptReason =
  | "USER_TAP"
  | "USER_VOICE"
  | "SERVER_ABORT"
  | "SYSTEM_ERROR";
export type InterruptSource = "mobile" | "backend" | "firmware";

export interface InterruptEvent extends EventEnvelope {
  readonly type: "INTERRUPT";
  readonly payload: {
    readonly reason: InterruptReason;
    readonly source: InterruptSource;
  };
}

export type ExpressionSource = "llm_tag" | "engine" | "fallback";

export interface ExpressionEvent extends EventEnvelope {
  readonly type: "EXPRESSION";
  readonly payload: {
    readonly expression: Expression;
    readonly duration_ms: number;
    readonly source: ExpressionSource;
  };
}

export interface MotionEvent extends EventEnvelope {
  readonly type: "MOTION";
  readonly payload: {
    readonly motion: Motion;
    readonly duration_ms: number;
    readonly intensity: number; // 0..1
  };
}

export interface RobotStateEvent extends EventEnvelope {
  readonly type: "ROBOT_STATE";
  readonly payload: {
    readonly state: RobotInteractionState;
    readonly previous_state?: RobotInteractionState;
  };
}

export type PerceivedReactionTrigger = "AUDIO_END" | "VAD_SILENCE" | "TAP";

export interface PerceivedReactionEvent extends EventEnvelope {
  readonly type: "PERCEIVED_REACTION";
  readonly payload: { readonly trigger: PerceivedReactionTrigger };
}

export type LatencyMetric =
  | "perceived_reaction_ms"
  | "transcript_ms"
  | "first_audio_ms"
  | "full_completion_ms"
  | "interrupt_to_stop_ms";

export interface LatencyTickEvent extends EventEnvelope {
  readonly type: "LATENCY_TICK";
  readonly payload: {
    readonly metric: LatencyMetric;
    readonly value_ms: number;
  };
}

export type RealtimeEvent =
  | InterruptEvent
  | ExpressionEvent
  | MotionEvent
  | RobotStateEvent
  | PerceivedReactionEvent
  | LatencyTickEvent;

/**
 * Structural narrowing for a parsed JSON payload from the backend gateway.
 * Returns `true` iff the object matches one of the 6 event shapes. Used as a
 * first-line guard before passing to the Twin driver; the authoritative schema
 * lives server-side (Zod in tbot-infra/contracts/realtime-events.js).
 */
export function isRealtimeEvent(value: unknown): value is RealtimeEvent {
  if (!value || typeof value !== "object") return false;
  const v = value as { [k: string]: unknown };
  if (typeof v.session_id !== "string" || v.session_id.length === 0) return false;
  if (typeof v.timestamp_ms !== "number" || v.timestamp_ms < 0) return false;
  if (v.turn_id !== undefined && typeof v.turn_id !== "string") return false;
  if (typeof v.type !== "string") return false;
  if (!(ALL_EVENT_TYPES as readonly string[]).includes(v.type)) return false;
  const p = v.payload as { [k: string]: unknown } | undefined;
  if (!p || typeof p !== "object") return false;
  switch (v.type as RealtimeEventType) {
    case "INTERRUPT":
      return (
        typeof p.reason === "string" &&
        ["USER_TAP", "USER_VOICE", "SERVER_ABORT", "SYSTEM_ERROR"].includes(
          p.reason,
        ) &&
        typeof p.source === "string" &&
        ["mobile", "backend", "firmware"].includes(p.source)
      );
    case "EXPRESSION":
      return (
        typeof p.expression === "string" &&
        typeof p.duration_ms === "number" &&
        p.duration_ms > 0 &&
        typeof p.source === "string"
      );
    case "MOTION":
      return (
        typeof p.motion === "string" &&
        typeof p.duration_ms === "number" &&
        p.duration_ms > 0 &&
        (p.intensity === undefined ||
          (typeof p.intensity === "number" &&
            p.intensity >= 0 &&
            p.intensity <= 1))
      );
    case "ROBOT_STATE":
      return typeof p.state === "string";
    case "PERCEIVED_REACTION":
      return (
        typeof p.trigger === "string" &&
        ["AUDIO_END", "VAD_SILENCE", "TAP"].includes(p.trigger)
      );
    case "LATENCY_TICK":
      return (
        typeof p.metric === "string" &&
        [
          "perceived_reaction_ms",
          "transcript_ms",
          "first_audio_ms",
          "full_completion_ms",
          "interrupt_to_stop_ms",
        ].includes(p.metric) &&
        typeof p.value_ms === "number" &&
        p.value_ms >= 0
      );
    default:
      return false;
  }
}

export function createInterrupt(args: {
  session_id: string;
  turn_id?: string;
  reason: InterruptReason;
  source: InterruptSource;
  timestamp_ms?: number;
}): InterruptEvent {
  return Object.freeze({
    type: "INTERRUPT",
    session_id: args.session_id,
    turn_id: args.turn_id,
    timestamp_ms: args.timestamp_ms ?? Date.now(),
    payload: Object.freeze({ reason: args.reason, source: args.source }),
  });
}

export function createLatencyTick(args: {
  session_id: string;
  turn_id?: string;
  metric: LatencyMetric;
  value_ms: number;
  timestamp_ms?: number;
}): LatencyTickEvent {
  return Object.freeze({
    type: "LATENCY_TICK",
    session_id: args.session_id,
    turn_id: args.turn_id,
    timestamp_ms: args.timestamp_ms ?? Date.now(),
    payload: Object.freeze({ metric: args.metric, value_ms: args.value_ms }),
  });
}
