// @tbot/contracts — Motion vocabulary (12 primitives) — mobile projection
//
// Source of truth: tbot-infra/contracts/motion.js (ADR-010).
// Parity asserted in tests/contracts/parity.test.ts.
//
// Plan: expressive-robot-companion-rewrite §3 ADR-010, §6 RM-02/RM-08/RM-12.

export const Motion = Object.freeze({
  LOOK_FORWARD: "LOOK_FORWARD",
  LOOK_LEFT: "LOOK_LEFT",
  LOOK_RIGHT: "LOOK_RIGHT",
  NOD_YES: "NOD_YES",
  SHAKE_NO: "SHAKE_NO",
  TILT_CURIOUS: "TILT_CURIOUS",
  BOW_ACK: "BOW_ACK",
  WAVE_ARM: "WAVE_ARM",
  IDLE_SWAY: "IDLE_SWAY",
  EXCITED_BOUNCE: "EXCITED_BOUNCE",
  WAITING_POSE: "WAITING_POSE",
  FAIL_SLUMP: "FAIL_SLUMP",
} as const);

export type Motion = (typeof Motion)[keyof typeof Motion];

export const ALL_MOTIONS: readonly Motion[] = Object.freeze(
  Object.values(Motion),
) as readonly Motion[];

export const MotionChannel = Object.freeze({
  HEAD: "HEAD",
  ARM: "ARM",
  POSE: "POSE",
} as const);
export type MotionChannel = (typeof MotionChannel)[keyof typeof MotionChannel];

export const MOTION_CHANNEL: Readonly<Record<Motion, MotionChannel>> =
  Object.freeze({
    LOOK_FORWARD: MotionChannel.HEAD,
    LOOK_LEFT: MotionChannel.HEAD,
    LOOK_RIGHT: MotionChannel.HEAD,
    NOD_YES: MotionChannel.HEAD,
    SHAKE_NO: MotionChannel.HEAD,
    TILT_CURIOUS: MotionChannel.HEAD,
    BOW_ACK: MotionChannel.HEAD,
    WAVE_ARM: MotionChannel.ARM,
    IDLE_SWAY: MotionChannel.POSE,
    EXCITED_BOUNCE: MotionChannel.POSE,
    WAITING_POSE: MotionChannel.POSE,
    FAIL_SLUMP: MotionChannel.POSE,
  });

export const HEAD_PRIMITIVES: readonly Motion[] = Object.freeze([
  Motion.LOOK_FORWARD,
  Motion.LOOK_LEFT,
  Motion.LOOK_RIGHT,
  Motion.NOD_YES,
  Motion.SHAKE_NO,
  Motion.TILT_CURIOUS,
  Motion.BOW_ACK,
] as const);

export const ARM_PRIMITIVES: readonly Motion[] = Object.freeze([
  Motion.WAVE_ARM,
] as const);

export const POSE_PRIMITIVES: readonly Motion[] = Object.freeze([
  Motion.IDLE_SWAY,
  Motion.EXCITED_BOUNCE,
  Motion.WAITING_POSE,
  Motion.FAIL_SLUMP,
] as const);

function buildMatrix(): Readonly<Record<Motion, Readonly<Record<Motion, boolean>>>> {
  const m: Record<string, Record<string, boolean>> = {};
  for (const a of ALL_MOTIONS) m[a] = {};
  // HEAD ↔ HEAD: only self-chain allowed
  for (const a of HEAD_PRIMITIVES) {
    for (const b of HEAD_PRIMITIVES) m[a][b] = a === b;
    for (const b of ARM_PRIMITIVES) m[a][b] = true;
    for (const b of POSE_PRIMITIVES) m[a][b] = false;
  }
  // ARM: chains with HEAD / self, not with POSE
  for (const a of ARM_PRIMITIVES) {
    for (const b of HEAD_PRIMITIVES) m[a][b] = true;
    for (const b of ARM_PRIMITIVES) m[a][b] = true;
    for (const b of POSE_PRIMITIVES) m[a][b] = false;
  }
  // POSE: terminal atomic
  for (const a of POSE_PRIMITIVES) {
    for (const b of ALL_MOTIONS) m[a][b] = false;
  }
  for (const a of ALL_MOTIONS) Object.freeze(m[a]);
  return Object.freeze(m) as Readonly<
    Record<Motion, Readonly<Record<Motion, boolean>>>
  >;
}

export const COMPOSABILITY = buildMatrix();

export function isValidMotion(name: unknown): name is Motion {
  return (
    typeof name === "string" &&
    Object.prototype.hasOwnProperty.call(Motion, name)
  );
}

export function channelOf(name: Motion): MotionChannel | null {
  if (!isValidMotion(name)) return null;
  return MOTION_CHANNEL[name];
}

export function canChain(a: Motion, b: Motion): boolean {
  if (!isValidMotion(a) || !isValidMotion(b)) return false;
  return COMPOSABILITY[a][b] === true;
}

export function assertChain(a: Motion, b: Motion): true {
  if (!isValidMotion(a)) {
    throw new TypeError(
      `assertChain: unknown 'from' motion: ${JSON.stringify(a)}`,
    );
  }
  if (!isValidMotion(b)) {
    throw new TypeError(
      `assertChain: unknown 'to' motion: ${JSON.stringify(b)}`,
    );
  }
  if (!canChain(a, b)) {
    throw new Error(
      `assertChain: impossible motion chain ${a} → ${b} (${MOTION_CHANNEL[a]} → ${MOTION_CHANNEL[b]}).`,
    );
  }
  return true;
}

export const DEFAULT_MOTION: Motion = Motion.LOOK_FORWARD;
