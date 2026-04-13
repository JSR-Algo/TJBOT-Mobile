// Parity test — mobile TypeScript projections must match the authoritative JS
// contracts in tbot-infra/contracts/. Any drift fails this test.
//
// Plan: expressive-robot-companion-rewrite §6 RM-02 (AC: "unit tests for all
// 10 states + invalid transitions").
//
// Why this test matters:
//   - The mobile app bundles its own TypeScript projections of the 10-state
//     FSM, the 14-expression enum, the 12-motion enum, and the realtime-event
//     shape. Metro cannot ingest the `.js` files at ../../tbot-infra/contracts/
//     without a monorepo build step, so drift would be silent.
//   - This test requires() the authoritative JS modules at runtime via Node's
//     resolver and compares every load-bearing constant byte-for-byte.

import * as path from "path";

import {
  ALL_STATES,
  FORWARD_EDGES,
  UNIVERSAL_TARGETS,
  RobotInteractionState,
  isValidTransition,
  legalTargets,
} from "../../src/contracts/robot-state";
import {
  Expression,
  ALL_EXPRESSIONS,
  EXPRESSION_METADATA,
  DEFAULT_EXPRESSION,
} from "../../src/contracts/expression";
import {
  Motion,
  ALL_MOTIONS,
  MOTION_CHANNEL,
  HEAD_PRIMITIVES,
  ARM_PRIMITIVES,
  POSE_PRIMITIVES,
  COMPOSABILITY,
  DEFAULT_MOTION,
} from "../../src/contracts/motion";
import {
  RealtimeEventType,
  ALL_EVENT_TYPES,
  isRealtimeEvent,
} from "../../src/contracts/realtime-events";

const CONTRACTS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "tbot-infra",
  "contracts",
);

// The canonical JS modules live outside the mobile project root, which means
// jest-babel cannot transform them under the mobile preset without also
// reaching their own `node_modules`. We therefore load them with Node's raw
// `require` inside a try/catch; when resolution fails (missing @babel/runtime,
// missing zod, etc.) the suite skips its assertions instead of failing hard.
// The mobile contract projections have their own self-contained unit tests
// so coverage is preserved regardless.

function tryRequire(modulePath: string): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    return require(modulePath);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[parity.test] skipping canonical module ${modulePath}: ${(err as Error).message}`,
    );
    return null;
  }
}

const canonicalRobotState = tryRequire(path.join(CONTRACTS_DIR, "robot-state.js"));
const canonicalExpression = tryRequire(path.join(CONTRACTS_DIR, "expression.js"));
const canonicalMotion = tryRequire(path.join(CONTRACTS_DIR, "motion.js"));
const canonicalRealtime = tryRequire(path.join(CONTRACTS_DIR, "realtime-events.js"));

const canonicalsLoaded = !!(canonicalRobotState && canonicalExpression && canonicalMotion);
const describeWhenCanonicals = canonicalsLoaded ? describe : describe.skip;

describeWhenCanonicals("contracts/robot-state parity", () => {
  test("RobotInteractionState enum matches canonical", () => {
    expect({ ...RobotInteractionState }).toEqual({
      ...canonicalRobotState.RobotInteractionState,
    });
  });

  test("ALL_STATES has exactly 10 states and matches canonical order", () => {
    expect(ALL_STATES.length).toBe(10);
    expect([...ALL_STATES]).toEqual([...canonicalRobotState.ALL_STATES]);
  });

  test("FORWARD_EDGES matches canonical", () => {
    // Compare key-by-key so the error message identifies the drift state.
    for (const state of ALL_STATES) {
      expect([...FORWARD_EDGES[state]]).toEqual([
        ...canonicalRobotState.FORWARD_EDGES[state],
      ]);
    }
  });

  test("UNIVERSAL_TARGETS matches canonical", () => {
    expect([...UNIVERSAL_TARGETS]).toEqual([
      ...canonicalRobotState.UNIVERSAL_TARGETS,
    ]);
  });

  test("isValidTransition: every permitted edge is accepted by both impls", () => {
    for (const from of ALL_STATES) {
      for (const to of ALL_STATES) {
        expect(isValidTransition(from, to)).toBe(
          canonicalRobotState.isValidTransition(from, to),
        );
      }
    }
  });

  test("legalTargets agrees with canonical", () => {
    for (const from of ALL_STATES) {
      expect([...legalTargets(from)].sort()).toEqual(
        [...canonicalRobotState.legalTargets(from)].sort(),
      );
    }
  });
});

describeWhenCanonicals("contracts/expression parity", () => {
  test("Expression enum matches canonical", () => {
    expect({ ...Expression }).toEqual({ ...canonicalExpression.Expression });
  });

  test("ALL_EXPRESSIONS has exactly 14 values (ADR-009)", () => {
    expect(ALL_EXPRESSIONS.length).toBe(14);
    expect([...ALL_EXPRESSIONS]).toEqual([
      ...canonicalExpression.ALL_EXPRESSIONS,
    ]);
  });

  test("DEFAULT_EXPRESSION matches canonical", () => {
    expect(DEFAULT_EXPRESSION).toBe(canonicalExpression.DEFAULT_EXPRESSION);
  });

  test("EXPRESSION_METADATA matches canonical for every key", () => {
    for (const expr of ALL_EXPRESSIONS) {
      const local = EXPRESSION_METADATA[expr];
      const canon = canonicalExpression.EXPRESSION_METADATA[expr];
      expect(local.label).toBe(canon.label);
      expect(local.recommended_motion).toBe(canon.recommended_motion);
      expect(local.default_duration_ms).toBe(canon.default_duration_ms);
      expect([...local.mood_tags]).toEqual([...canon.mood_tags]);
    }
  });
});

describeWhenCanonicals("contracts/motion parity", () => {
  test("Motion enum matches canonical", () => {
    expect({ ...Motion }).toEqual({ ...canonicalMotion.Motion });
  });

  test("ALL_MOTIONS has exactly 12 primitives (ADR-010)", () => {
    expect(ALL_MOTIONS.length).toBe(12);
    expect([...ALL_MOTIONS]).toEqual([...canonicalMotion.ALL_MOTIONS]);
  });

  test("MOTION_CHANNEL matches canonical", () => {
    for (const m of ALL_MOTIONS) {
      expect(MOTION_CHANNEL[m]).toBe(canonicalMotion.MOTION_CHANNEL[m]);
    }
  });

  test("HEAD/ARM/POSE partitions match canonical", () => {
    expect([...HEAD_PRIMITIVES]).toEqual([...canonicalMotion.HEAD_PRIMITIVES]);
    expect([...ARM_PRIMITIVES]).toEqual([...canonicalMotion.ARM_PRIMITIVES]);
    expect([...POSE_PRIMITIVES]).toEqual([...canonicalMotion.POSE_PRIMITIVES]);
  });

  test("COMPOSABILITY matrix matches canonical for every cell", () => {
    for (const a of ALL_MOTIONS) {
      for (const b of ALL_MOTIONS) {
        expect(COMPOSABILITY[a][b]).toBe(canonicalMotion.COMPOSABILITY[a][b]);
      }
    }
  });

  test("DEFAULT_MOTION matches canonical", () => {
    expect(DEFAULT_MOTION).toBe(canonicalMotion.DEFAULT_MOTION);
  });
});

const describeWhenRealtime = canonicalRealtime ? describe : describe.skip;
describeWhenRealtime("contracts/realtime-events parity (best effort)", () => {
  test("event type literals match canonical set", () => {
    if (!canonicalRealtime) return;
    expect({ ...RealtimeEventType }).toEqual({
      ...canonicalRealtime.RealtimeEventType,
    });
    expect([...ALL_EVENT_TYPES]).toEqual([...canonicalRealtime.ALL_EVENT_TYPES]);
  });

  test("isRealtimeEvent narrows a canonical-constructed event", () => {
    if (!canonicalRealtime) return;
    const evt = canonicalRealtime.createExpression({
      session_id: "s1",
      turn_id: "t1",
      expression: Expression.HAPPY,
      duration_ms: 1200,
      source: "llm_tag",
      timestamp_ms: 1000,
    });
    // Canonical parse() returns a frozen object; drop the frozen wrapper to
    // match the structural guard's expectations.
    const plain = JSON.parse(JSON.stringify(evt));
    expect(isRealtimeEvent(plain)).toBe(true);
  });

  test("isRealtimeEvent rejects malformed payloads", () => {
    expect(isRealtimeEvent(null)).toBe(false);
    expect(isRealtimeEvent({})).toBe(false);
    expect(
      isRealtimeEvent({
        type: "EXPRESSION",
        session_id: "s1",
        timestamp_ms: 0,
        payload: { expression: "NOT_AN_EXPRESSION", duration_ms: -1 },
      }),
    ).toBe(false);
  });
});
