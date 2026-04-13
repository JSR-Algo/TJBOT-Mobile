// @tbot/contracts — Expression vocabulary (14 values) — mobile projection
//
// Source of truth: tbot-infra/contracts/expression.js (ADR-009).
// Parity asserted in tests/contracts/parity.test.ts.
//
// Plan: expressive-robot-companion-rewrite §3 ADR-009, §6 RM-02/RM-08.

import { Motion } from "./motion";

export const Expression = Object.freeze({
  IDLE_BREATHING: "IDLE_BREATHING",
  LISTENING: "LISTENING",
  THINKING: "THINKING",
  SPEAKING: "SPEAKING",
  HAPPY: "HAPPY",
  CURIOUS: "CURIOUS",
  CONFUSED: "CONFUSED",
  ENCOURAGING: "ENCOURAGING",
  EMPATHETIC: "EMPATHETIC",
  PLAYFUL: "PLAYFUL",
  SLEEPY: "SLEEPY",
  RECONNECTING: "RECONNECTING",
  ERROR: "ERROR",
  INTERRUPTED_QUIET: "INTERRUPTED_QUIET",
} as const);

export type Expression = (typeof Expression)[keyof typeof Expression];

export const ALL_EXPRESSIONS: readonly Expression[] = Object.freeze(
  Object.values(Expression),
) as readonly Expression[];

export interface ExpressionMetadata {
  readonly label: string;
  readonly recommended_motion: Motion;
  readonly default_duration_ms: number;
  readonly mood_tags: readonly string[];
}

export const EXPRESSION_METADATA: Readonly<
  Record<Expression, ExpressionMetadata>
> = Object.freeze({
  IDLE_BREATHING: Object.freeze({
    label: "Idle (breathing)",
    recommended_motion: Motion.IDLE_SWAY,
    default_duration_ms: 4000,
    mood_tags: Object.freeze(["calm", "neutral", "ambient"] as const),
  }),
  LISTENING: Object.freeze({
    label: "Listening",
    recommended_motion: Motion.LOOK_FORWARD,
    default_duration_ms: 1500,
    mood_tags: Object.freeze(["attentive", "alert"] as const),
  }),
  THINKING: Object.freeze({
    label: "Thinking",
    recommended_motion: Motion.TILT_CURIOUS,
    default_duration_ms: 1200,
    mood_tags: Object.freeze(["pensive", "processing"] as const),
  }),
  SPEAKING: Object.freeze({
    label: "Speaking",
    recommended_motion: Motion.LOOK_FORWARD,
    default_duration_ms: 1800,
    mood_tags: Object.freeze(["expressive", "talkative"] as const),
  }),
  HAPPY: Object.freeze({
    label: "Happy",
    recommended_motion: Motion.NOD_YES,
    default_duration_ms: 1600,
    mood_tags: Object.freeze(["positive", "warm"] as const),
  }),
  CURIOUS: Object.freeze({
    label: "Curious",
    recommended_motion: Motion.TILT_CURIOUS,
    default_duration_ms: 1400,
    mood_tags: Object.freeze(["wondering", "interested"] as const),
  }),
  CONFUSED: Object.freeze({
    label: "Confused",
    recommended_motion: Motion.SHAKE_NO,
    default_duration_ms: 1400,
    mood_tags: Object.freeze(["uncertain", "asking"] as const),
  }),
  ENCOURAGING: Object.freeze({
    label: "Encouraging",
    recommended_motion: Motion.NOD_YES,
    default_duration_ms: 1600,
    mood_tags: Object.freeze(["supportive", "grounded"] as const),
  }),
  EMPATHETIC: Object.freeze({
    label: "Empathetic",
    recommended_motion: Motion.BOW_ACK,
    default_duration_ms: 1800,
    mood_tags: Object.freeze(["caring", "soft"] as const),
  }),
  PLAYFUL: Object.freeze({
    label: "Playful",
    recommended_motion: Motion.EXCITED_BOUNCE,
    default_duration_ms: 1500,
    mood_tags: Object.freeze(["fun", "energetic"] as const),
  }),
  SLEEPY: Object.freeze({
    label: "Sleepy",
    recommended_motion: Motion.WAITING_POSE,
    default_duration_ms: 3000,
    mood_tags: Object.freeze(["calm", "low-energy"] as const),
  }),
  RECONNECTING: Object.freeze({
    label: "Reconnecting",
    recommended_motion: Motion.WAITING_POSE,
    default_duration_ms: 2000,
    mood_tags: Object.freeze(["transient", "system"] as const),
  }),
  ERROR: Object.freeze({
    label: "Error",
    recommended_motion: Motion.FAIL_SLUMP,
    default_duration_ms: 2000,
    mood_tags: Object.freeze(["fault", "system"] as const),
  }),
  INTERRUPTED_QUIET: Object.freeze({
    label: "Interrupted (quiet)",
    recommended_motion: Motion.LOOK_FORWARD,
    default_duration_ms: 600,
    mood_tags: Object.freeze(["yielding", "respectful"] as const),
  }),
});

export function isValidExpression(name: unknown): name is Expression {
  return (
    typeof name === "string" &&
    Object.prototype.hasOwnProperty.call(Expression, name)
  );
}

export function expressionMetadata(
  name: Expression,
): ExpressionMetadata | null {
  if (!isValidExpression(name)) return null;
  return EXPRESSION_METADATA[name];
}

/**
 * ADR-009/ADR-014 fallback when the LLM emits an invalid or missing tag — the
 * face is never blank.
 */
export const DEFAULT_EXPRESSION: Expression = Expression.IDLE_BREATHING;
