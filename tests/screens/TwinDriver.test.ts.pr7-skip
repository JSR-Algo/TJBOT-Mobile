// Unit tests for TwinDriver — HAL stub implementations on mobile.
//
// Plan: expressive-robot-companion-rewrite §6 RM-12.
// AC: "stub renders to twin; unit test".

import {
  TwinDisplayDriver,
  TwinHal,
  TwinLedDriver,
  TwinMotionDriver,
  TwinRobotEventEmitter,
} from "../../src/screens/robot-demo/TwinDriver";
import { Expression } from "../../src/contracts/expression";
import { Motion } from "../../src/contracts/motion";
import { RobotInteractionState } from "../../src/contracts/robot-state";

describe("TwinDisplayDriver", () => {
  test("records every setExpression into history and emits to listeners", async () => {
    const driver = new TwinDisplayDriver();
    const frames: string[] = [];
    const unsub = driver.listen((frame) => frames.push(frame.expression));

    await driver.setExpression(Expression.HAPPY, 1200);
    await driver.setExpression(Expression.CURIOUS, 1400);

    expect(driver.history.map((f) => f.expression)).toEqual([
      Expression.HAPPY,
      Expression.CURIOUS,
    ]);
    expect(driver.current.expression).toBe(Expression.CURIOUS);
    expect(frames).toEqual([Expression.HAPPY, Expression.CURIOUS]);
    unsub();
  });

  test("clear() marks the face as cleared and snaps back to default", async () => {
    const driver = new TwinDisplayDriver();
    await driver.setExpression(Expression.SPEAKING, 1500);
    driver.clear();
    expect(driver.isCleared).toBe(true);
    expect(driver.current.expression).toBe(Expression.IDLE_BREATHING);
  });
});

describe("TwinMotionDriver", () => {
  test("enqueue records pending + history and clips intensity to [0,1]", async () => {
    const driver = new TwinMotionDriver();
    await driver.enqueue(Motion.NOD_YES, 600, 0.5);
    await driver.enqueue(Motion.WAVE_ARM, 800, 1.7); // should clip to 1
    await driver.enqueue(Motion.LOOK_LEFT, 400, -3); // should clip to 0

    expect(driver.pending.map((m) => m.motion)).toEqual([
      Motion.NOD_YES,
      Motion.WAVE_ARM,
      Motion.LOOK_LEFT,
    ]);
    expect(driver.pending[1].intensity).toBe(1);
    expect(driver.pending[2].intensity).toBe(0);
    expect(driver.history.length).toBe(3);
  });

  test("drain() empties pending queue but keeps history", async () => {
    const driver = new TwinMotionDriver();
    await driver.enqueue(Motion.NOD_YES, 600, 1);
    driver.drain();
    expect(driver.pending.length).toBe(0);
    expect(driver.history.length).toBe(1);
  });

  test("neutral() drains and enqueues DEFAULT_MOTION=LOOK_FORWARD", async () => {
    const driver = new TwinMotionDriver();
    await driver.enqueue(Motion.SHAKE_NO, 800, 1);
    await driver.neutral();
    const last = driver.pending[driver.pending.length - 1];
    expect(last.motion).toBe(Motion.LOOK_FORWARD);
    expect(driver.pending.length).toBe(1);
  });
});

describe("TwinLedDriver", () => {
  test("setAll stores current color and records a frame", () => {
    const driver = new TwinLedDriver();
    driver.setAll({ r: 10, g: 20, b: 30 });
    expect(driver.color).toEqual({ r: 10, g: 20, b: 30 });
    expect(driver.history[0].kind).toBe("setAll");
  });

  test("playEffect and clear record distinct frame kinds", async () => {
    const driver = new TwinLedDriver();
    await driver.playEffect("listening_pulse", 500);
    driver.clear();
    const kinds = driver.history.map((f) => f.kind);
    expect(kinds).toEqual(["playEffect", "clear"]);
    expect(driver.color).toBeNull();
  });
});

describe("TwinRobotEventEmitter", () => {
  test("emitExpression and emitMotion are captured in the log", () => {
    const emitter = new TwinRobotEventEmitter();
    const log: string[] = [];
    emitter.listen((evt) => log.push(evt.kind));

    emitter.emitExpression({
      type: "EXPRESSION",
      session_id: "s1",
      turn_id: "t1",
      timestamp_ms: 1,
      payload: {
        expression: Expression.HAPPY,
        duration_ms: 1200,
        source: "llm_tag",
      },
    });
    emitter.emitMotion({
      type: "MOTION",
      session_id: "s1",
      turn_id: "t1",
      timestamp_ms: 2,
      payload: { motion: Motion.NOD_YES, duration_ms: 600, intensity: 1 },
    });

    expect(emitter.log.map((e) => e.kind)).toEqual(["expression", "motion"]);
    expect(log).toEqual(["expression", "motion"]);
  });
});

describe("TwinHal", () => {
  test("setState enforces canonical FSM forward edges", () => {
    const hal = new TwinHal();
    expect(hal.state).toBe(RobotInteractionState.IDLE);
    hal.setState(RobotInteractionState.LISTENING);
    expect(hal.state).toBe(RobotInteractionState.LISTENING);
    expect(() => hal.setState(RobotInteractionState.SPEAKING)).toThrow(
      /illegal transition LISTENING → SPEAKING/,
    );
    expect(hal.state).toBe(RobotInteractionState.LISTENING);
  });

  test("trySetState returns false on illegal edges without throwing", () => {
    const hal = new TwinHal();
    expect(hal.trySetState(RobotInteractionState.SPEAKING)).toBe(false);
    expect(hal.trySetState(RobotInteractionState.LISTENING)).toBe(true);
    expect(hal.state).toBe(RobotInteractionState.LISTENING);
  });

  test("universal escape edges always succeed", () => {
    const hal = new TwinHal();
    hal.setState(RobotInteractionState.LISTENING);
    expect(hal.trySetState(RobotInteractionState.INTERRUPTED)).toBe(true);
    expect(hal.state).toBe(RobotInteractionState.INTERRUPTED);
  });

  test("listenState notifies subscribers on every transition", () => {
    const hal = new TwinHal();
    const seen: RobotInteractionState[] = [];
    const unsub = hal.listenState((s) => seen.push(s));
    hal.setState(RobotInteractionState.LISTENING);
    hal.setState(RobotInteractionState.PARTIAL_TRANSCRIPT_ACTIVE);
    unsub();
    hal.setState(RobotInteractionState.THINKING);
    expect(seen).toEqual([
      RobotInteractionState.LISTENING,
      RobotInteractionState.PARTIAL_TRANSCRIPT_ACTIVE,
    ]);
  });

  test("resetForTest clears every sub-driver and snaps state to IDLE", async () => {
    const hal = new TwinHal();
    await hal.display.setExpression(Expression.HAPPY, 1000);
    await hal.motion.enqueue(Motion.NOD_YES, 500, 1);
    hal.led.setAll({ r: 1, g: 2, b: 3 });
    hal.setState(RobotInteractionState.LISTENING);

    hal.resetForTest();

    expect(hal.display.history.length).toBe(0);
    expect(hal.motion.history.length).toBe(0);
    expect(hal.led.history.length).toBe(0);
    expect(hal.state).toBe(RobotInteractionState.IDLE);
  });
});
