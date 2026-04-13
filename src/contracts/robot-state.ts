// @tbot/contracts — RobotInteractionState (canonical 10-state FSM) — mobile projection
//
// Source of truth: tbot-infra/contracts/robot-state.js (ADR-008).
// This file is a TypeScript projection consumed by tbot-mobile. A parity test
// (tests/contracts/parity.test.ts) asserts every enum value, forward edge, and
// universal-target here matches the authoritative JS module at the filesystem
// path `../../../tbot-infra/contracts/robot-state.js`. Drift fails the test.
//
// Plan: expressive-robot-companion-rewrite §3 ADR-008, §6 RM-02.

export const RobotInteractionState = Object.freeze({
  IDLE: "IDLE",
  LISTENING: "LISTENING",
  PARTIAL_TRANSCRIPT_ACTIVE: "PARTIAL_TRANSCRIPT_ACTIVE",
  THINKING: "THINKING",
  STREAMING_RESPONSE_TEXT: "STREAMING_RESPONSE_TEXT",
  SPEAKING: "SPEAKING",
  INTERRUPTED: "INTERRUPTED",
  NO_SPEECH: "NO_SPEECH",
  RECONNECTING: "RECONNECTING",
  ERROR: "ERROR",
} as const);

export type RobotInteractionState =
  (typeof RobotInteractionState)[keyof typeof RobotInteractionState];

export const ALL_STATES: readonly RobotInteractionState[] = Object.freeze(
  Object.values(RobotInteractionState),
) as readonly RobotInteractionState[];

// Forward edges — each state's explicit forward transitions (ADR-008 canonical).
export const FORWARD_EDGES: Readonly<
  Record<RobotInteractionState, readonly RobotInteractionState[]>
> = Object.freeze({
  IDLE: ["LISTENING"],
  LISTENING: ["PARTIAL_TRANSCRIPT_ACTIVE"],
  PARTIAL_TRANSCRIPT_ACTIVE: ["THINKING"],
  THINKING: ["STREAMING_RESPONSE_TEXT"],
  STREAMING_RESPONSE_TEXT: ["SPEAKING"],
  SPEAKING: ["IDLE"],
  INTERRUPTED: ["LISTENING"],
  NO_SPEECH: ["IDLE"],
  RECONNECTING: ["IDLE", "ERROR"],
  ERROR: ["IDLE", "RECONNECTING"],
} as const);

// Universal-source escape edges: every state may transition to any of these.
export const UNIVERSAL_TARGETS: readonly RobotInteractionState[] = Object.freeze([
  "INTERRUPTED",
  "NO_SPEECH",
  "RECONNECTING",
  "ERROR",
] as const);

export function isState(name: unknown): name is RobotInteractionState {
  return (
    typeof name === "string" &&
    Object.prototype.hasOwnProperty.call(RobotInteractionState, name)
  );
}

/**
 * Pure predicate — `true` iff (from → to) is a permitted canonical transition.
 * Does not throw.
 */
export function isValidTransition(from: unknown, to: unknown): boolean {
  if (!isState(from) || !isState(to)) return false;
  if ((UNIVERSAL_TARGETS as readonly string[]).includes(to)) return true;
  const allowed = FORWARD_EDGES[from];
  return allowed.includes(to);
}

/**
 * Throws on illegal transition; returns `true` on success. Use at every
 * state-write boundary in projection code so the canonical FSM is enforceable
 * at runtime (RM-02 AC: "invalid transitions rejected").
 */
export function assertTransition(
  from: RobotInteractionState,
  to: RobotInteractionState,
): true {
  if (!isState(from)) {
    throw new TypeError(
      `assertTransition: unknown 'from' state: ${JSON.stringify(from)}`,
    );
  }
  if (!isState(to)) {
    throw new TypeError(
      `assertTransition: unknown 'to' state: ${JSON.stringify(to)}`,
    );
  }
  if (!isValidTransition(from, to)) {
    const allowed = [...FORWARD_EDGES[from], ...UNIVERSAL_TARGETS].join(", ");
    throw new Error(
      `assertTransition: illegal transition ${from} → ${to}. Allowed from ${from}: [${allowed}]`,
    );
  }
  return true;
}

export function legalTargets(
  from: RobotInteractionState,
): RobotInteractionState[] {
  if (!isState(from)) return [];
  const set = new Set<RobotInteractionState>([
    ...FORWARD_EDGES[from],
    ...UNIVERSAL_TARGETS,
  ]);
  set.delete(from); // self-loops on universal edges are meaningless
  return Array.from(set);
}
