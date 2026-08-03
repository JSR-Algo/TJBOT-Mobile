// @TJBot/contracts — Realtime event vocabulary — mobile projection
//
// Source of truth: TJBot-infra/contracts/realtime-events.js (ADR-006/011/014).
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

// Enumerations for payload validation
const INTERRUPT_REASONS = Object.freeze(["USER_TAP", "USER_VOICE", "SERVER_ABORT", "SYSTEM_ERROR"]);
const INTERRUPT_SOURCES = Object.freeze(["mobile", "backend", "firmware"]);
const PERCEIVED_REACTION_TRIGGERS = Object.freeze(["AUDIO_END", "VAD_SILENCE", "TAP"]);
const LATENCY_METRICS = Object.freeze([
  "perceived_reaction_ms",
  "transcript_ms",
  "first_audio_ms",
  "full_completion_ms",
  "interrupt_to_stop_ms",
]);

/**
 * Checks if session_id field is valid.
 */
function hasValidSessionId(v: { [k: string]: unknown }): boolean {
  return typeof v.session_id === "string" && v.session_id.length > 0;
}

/**
 * Checks if timestamp_ms field is valid.
 */
function hasValidTimestamp(v: { [k: string]: unknown }): boolean {
  return typeof v.timestamp_ms === "number" && v.timestamp_ms >= 0;
}

/**
 * Checks if turn_id field is valid (optional).
 */
function hasValidTurnId(v: { [k: string]: unknown }): boolean {
  return v.turn_id === undefined || typeof v.turn_id === "string";
}

/**
 * Validates the common EventEnvelope fields present in all realtime events.
 */
function isValidEventEnvelope(v: { [k: string]: unknown }): boolean {
  return hasValidSessionId(v) && hasValidTimestamp(v) && hasValidTurnId(v);
}

/**
 * Validates that the object has a recognized event type.
 */
function isKnownEventType(v: { [k: string]: unknown }): v is { [k: string]: unknown } & { type: RealtimeEventType } {
  if (typeof v.type !== "string") return false;
  return (ALL_EVENT_TYPES as readonly string[]).includes(v.type);
}

/**
 * Checks if intensity value is valid or absent.
 */
function isValidIntensity(intensity: unknown): boolean {
  if (intensity === undefined) return true;
  return typeof intensity === "number" && intensity >= 0 && intensity <= 1;
}

/**
 * Validates an INTERRUPT payload.
 */
function isValidInterruptPayload(p: { [k: string]: unknown }): boolean {
  return (
    typeof p.reason === "string" &&
    (INTERRUPT_REASONS as readonly string[]).includes(p.reason) &&
    typeof p.source === "string" &&
    (INTERRUPT_SOURCES as readonly string[]).includes(p.source)
  );
}

/**
 * Validates an EXPRESSION payload.
 */
function isValidExpressionPayload(p: { [k: string]: unknown }): boolean {
  return (
    typeof p.expression === "string" &&
    typeof p.duration_ms === "number" &&
    p.duration_ms > 0 &&
    typeof p.source === "string"
  );
}

/**
 * Validates a MOTION payload.
 */
function isValidMotionPayload(p: { [k: string]: unknown }): boolean {
  return (
    typeof p.motion === "string" &&
    typeof p.duration_ms === "number" &&
    p.duration_ms > 0 &&
    isValidIntensity(p.intensity)
  );
}

/**
 * Validates a ROBOT_STATE payload.
 */
function isValidRobotStatePayload(p: { [k: string]: unknown }): boolean {
  return typeof p.state === "string";
}

/**
 * Validates a PERCEIVED_REACTION payload.
 */
function isValidPerceivedReactionPayload(p: { [k: string]: unknown }): boolean {
  return (
    typeof p.trigger === "string" &&
    (PERCEIVED_REACTION_TRIGGERS as readonly string[]).includes(p.trigger)
  );
}

/**
 * Validates a LATENCY_TICK payload.
 */
function isValidLatencyTickPayload(p: { [k: string]: unknown }): boolean {
  return (
    typeof p.metric === "string" &&
    (LATENCY_METRICS as readonly string[]).includes(p.metric) &&
    typeof p.value_ms === "number" &&
    p.value_ms >= 0
  );
}

/**
 * Map of event type to its payload validator function.
 */
const PAYLOAD_VALIDATORS: Record<RealtimeEventType, (p: { [k: string]: unknown }) => boolean> = {
  INTERRUPT: isValidInterruptPayload,
  EXPRESSION: isValidExpressionPayload,
  MOTION: isValidMotionPayload,
  ROBOT_STATE: isValidRobotStatePayload,
  PERCEIVED_REACTION: isValidPerceivedReactionPayload,
  LATENCY_TICK: isValidLatencyTickPayload,
};

/**
 * Dispatches payload validation to the appropriate event-type validator.
 */
function isValidPayloadForEventType(
  eventType: RealtimeEventType,
  payload: { [k: string]: unknown },
): boolean {
  const validator = PAYLOAD_VALIDATORS[eventType];
  return validator ? validator(payload) : false;
}

/**
 * Checks if value is a plain object.
 */
function isPlainObject(value: unknown): value is { [k: string]: unknown } {
  return value !== null && typeof value === "object";
}

/**
 * Extracts and validates the payload field.
 */
function extractValidPayload(v: { [k: string]: unknown }): { [k: string]: unknown } | null {
  const p = v.payload as { [k: string]: unknown } | undefined;
  return (p && typeof p === "object") ? p : null;
}

/**
 * Structural narrowing for a parsed JSON payload from the backend gateway.
 * Returns `true` iff the object matches one of the 6 event shapes. Used as a
 * first-line guard before passing to the Twin driver; the authoritative schema
 * lives server-side (Zod in TJBot-infra/contracts/realtime-events.js).
 */
export function isRealtimeEvent(value: unknown): value is RealtimeEvent {
  if (!isPlainObject(value)) return false;
  const v = value;
  if (!isValidEventEnvelope(v)) return false;
  if (!isKnownEventType(v)) return false;
  const p = extractValidPayload(v);
  if (!p) return false;
  return isValidPayloadForEventType(v.type, p);
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
