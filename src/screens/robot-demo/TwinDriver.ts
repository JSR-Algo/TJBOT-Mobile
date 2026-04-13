// TwinDriver — Hardware Abstraction Layer stub implementations for the
// software robot twin on mobile.
//
// Plan: expressive-robot-companion-rewrite §3 ADR-013, §6 RM-12.
//
// The HAL interfaces (DisplayDriver, MotionDriver, LedDriver) are declared in
// `src/contracts/hal.ts` as a mobile projection of the authoritative types in
// `tbot-infra/contracts/hal.d.ts`. This file provides in-memory "twin"
// implementations that:
//
//   - record every call into a history buffer so the debug HUD, golden-image
//     tests, and end-to-end tests can assert what the driver was asked to do
//   - fan state changes out to subscribers so the RobotDemoScreen can re-render
//     when the driver receives a new Expression or Motion
//   - never touch hardware. ADR-010 requires twin-first development: missing
//     actuators are a no-op, not a throw.
//
// The per-driver `listen()` subscription API intentionally mirrors a minimal
// pub-sub (not full zustand/Redux) so the Twin can be unit-tested headlessly
// without React.

import type {
  DisplayDriver,
  HalKind,
  LedColor,
  LedDriver,
  MotionDriver,
  RobotHal,
  RobotEventEmitter,
} from "../../contracts/hal";
import { Expression, DEFAULT_EXPRESSION } from "../../contracts/expression";
import { Motion, DEFAULT_MOTION } from "../../contracts/motion";
import {
  RobotInteractionState,
  assertTransition,
  isValidTransition,
} from "../../contracts/robot-state";
import type {
  ExpressionEvent,
  InterruptEvent,
  LatencyTickEvent,
  MotionEvent,
  PerceivedReactionEvent,
  RobotStateEvent,
} from "../../contracts/realtime-events";

const TWIN: HalKind = "twin";

// Minimal pub-sub — avoids a runtime dependency on any state-store library.
type Unsub = () => void;
class Emitter<T> {
  private subs = new Set<(value: T) => void>();
  emit(value: T): void {
    for (const s of this.subs) s(value);
  }
  on(listener: (value: T) => void): Unsub {
    this.subs.add(listener);
    return () => {
      this.subs.delete(listener);
    };
  }
  clear(): void {
    this.subs.clear();
  }
}

// ===========================================================================
// TwinDisplayDriver — the face
// ===========================================================================

export interface TwinFaceFrame {
  readonly expression: Expression;
  readonly duration_ms: number;
  readonly startedAt: number;
}

export class TwinDisplayDriver implements DisplayDriver {
  readonly kind = TWIN;
  private _current: TwinFaceFrame = Object.freeze({
    expression: DEFAULT_EXPRESSION,
    duration_ms: 0,
    startedAt: 0,
  });
  private _history: TwinFaceFrame[] = [];
  private _emitter = new Emitter<TwinFaceFrame>();
  private _cleared = false;

  get current(): TwinFaceFrame {
    return this._current;
  }

  /** Read-only frame history for tests and the debug HUD. */
  get history(): readonly TwinFaceFrame[] {
    return this._history;
  }

  /**
   * Subscribe to face-frame updates. Returns an unsubscribe function.
   * Called by RobotDemoScreen to re-render when the backend HAL=twin path
   * (RM-10) pushes a new Expression event.
   */
  listen(listener: (frame: TwinFaceFrame) => void): Unsub {
    return this._emitter.on(listener);
  }

  async setExpression(expression: Expression, duration_ms: number): Promise<void> {
    const frame: TwinFaceFrame = Object.freeze({
      expression,
      duration_ms,
      startedAt: Date.now(),
    });
    this._current = frame;
    this._cleared = false;
    this._history.push(frame);
    this._emitter.emit(frame);
  }

  clear(): void {
    this._cleared = true;
    this._current = Object.freeze({
      expression: DEFAULT_EXPRESSION,
      duration_ms: 0,
      startedAt: Date.now(),
    });
    this._emitter.emit(this._current);
  }

  get isCleared(): boolean {
    return this._cleared;
  }

  /** Test-only: wipe the history without touching subscribers. */
  resetForTest(): void {
    this._history = [];
    this._current = Object.freeze({
      expression: DEFAULT_EXPRESSION,
      duration_ms: 0,
      startedAt: 0,
    });
    this._cleared = false;
  }
}

// ===========================================================================
// TwinMotionDriver — head / arm / pose primitives
// ===========================================================================

export interface TwinMotionFrame {
  readonly motion: Motion;
  readonly duration_ms: number;
  readonly intensity: number;
  readonly enqueuedAt: number;
}

export class TwinMotionDriver implements MotionDriver {
  readonly kind = TWIN;
  private _pending: TwinMotionFrame[] = [];
  private _history: TwinMotionFrame[] = [];
  private _emitter = new Emitter<TwinMotionFrame>();

  get pending(): readonly TwinMotionFrame[] {
    return this._pending;
  }

  get history(): readonly TwinMotionFrame[] {
    return this._history;
  }

  listen(listener: (frame: TwinMotionFrame) => void): Unsub {
    return this._emitter.on(listener);
  }

  async enqueue(
    motion: Motion,
    duration_ms: number,
    intensity: number = 1,
  ): Promise<void> {
    if (intensity < 0 || intensity > 1) {
      // ADR-010 asks the driver to soft-clip rather than throw.
      intensity = Math.max(0, Math.min(1, intensity));
    }
    const frame: TwinMotionFrame = Object.freeze({
      motion,
      duration_ms,
      intensity,
      enqueuedAt: Date.now(),
    });
    this._pending.push(frame);
    this._history.push(frame);
    this._emitter.emit(frame);
  }

  drain(): void {
    this._pending = [];
  }

  async neutral(): Promise<void> {
    this.drain();
    await this.enqueue(DEFAULT_MOTION, 200, 1);
  }

  resetForTest(): void {
    this._pending = [];
    this._history = [];
  }
}

// ===========================================================================
// TwinLedDriver — eye ring / status LEDs
// ===========================================================================

export interface TwinLedFrame {
  readonly kind: "setAll" | "playEffect" | "clear";
  readonly color?: LedColor;
  readonly effect?: string;
  readonly duration_ms?: number;
  readonly at: number;
}

export class TwinLedDriver implements LedDriver {
  readonly kind = TWIN;
  private _history: TwinLedFrame[] = [];
  private _current: LedColor | null = null;
  private _emitter = new Emitter<TwinLedFrame>();

  get history(): readonly TwinLedFrame[] {
    return this._history;
  }

  get color(): LedColor | null {
    return this._current;
  }

  listen(listener: (frame: TwinLedFrame) => void): Unsub {
    return this._emitter.on(listener);
  }

  setAll(color: LedColor): void {
    this._current = color;
    const frame: TwinLedFrame = Object.freeze({
      kind: "setAll",
      color,
      at: Date.now(),
    });
    this._history.push(frame);
    this._emitter.emit(frame);
  }

  async playEffect(effect: string, duration_ms: number): Promise<void> {
    const frame: TwinLedFrame = Object.freeze({
      kind: "playEffect",
      effect,
      duration_ms,
      at: Date.now(),
    });
    this._history.push(frame);
    this._emitter.emit(frame);
  }

  clear(): void {
    this._current = null;
    const frame: TwinLedFrame = Object.freeze({ kind: "clear", at: Date.now() });
    this._history.push(frame);
    this._emitter.emit(frame);
  }

  resetForTest(): void {
    this._history = [];
    this._current = null;
  }
}

// ===========================================================================
// TwinRobotEventEmitter — forwards every WS event through the twin
// ===========================================================================

export type AnyRobotEvent =
  | { kind: "expression"; event: ExpressionEvent }
  | { kind: "motion"; event: MotionEvent }
  | { kind: "robot_state"; event: RobotStateEvent }
  | { kind: "perceived_reaction"; event: PerceivedReactionEvent }
  | { kind: "interrupt"; event: InterruptEvent }
  | { kind: "latency_tick"; event: LatencyTickEvent };

export class TwinRobotEventEmitter implements RobotEventEmitter {
  private _log: AnyRobotEvent[] = [];
  private _emitter = new Emitter<AnyRobotEvent>();

  get log(): readonly AnyRobotEvent[] {
    return this._log;
  }

  listen(listener: (evt: AnyRobotEvent) => void): Unsub {
    return this._emitter.on(listener);
  }

  private _push(evt: AnyRobotEvent): void {
    this._log.push(evt);
    this._emitter.emit(evt);
  }

  emitExpression(event: ExpressionEvent): void {
    this._push({ kind: "expression", event });
  }
  emitMotion(event: MotionEvent): void {
    this._push({ kind: "motion", event });
  }
  emitRobotState(event: RobotStateEvent): void {
    this._push({ kind: "robot_state", event });
  }
  emitPerceivedReaction(event: PerceivedReactionEvent): void {
    this._push({ kind: "perceived_reaction", event });
  }
  emitInterrupt(event: InterruptEvent): void {
    this._push({ kind: "interrupt", event });
  }
  emitLatencyTick(event: LatencyTickEvent): void {
    this._push({ kind: "latency_tick", event });
  }

  resetForTest(): void {
    this._log = [];
  }
}

// ===========================================================================
// Twin HAL container
// ===========================================================================

/**
 * A single container that ties the four twin drivers together behind the
 * RobotHal type. RobotDemoScreen instantiates exactly one TwinHal per screen
 * mount and passes it down via props / context.
 *
 * `state` is a live canonical FSM state that the screen bumps whenever a
 * ROBOT_STATE event arrives from the backend HAL=twin path (RM-10). The
 * setter enforces the canonical transition table at runtime.
 */
export class TwinHal implements RobotHal {
  readonly display: TwinDisplayDriver;
  readonly motion: TwinMotionDriver;
  readonly led: TwinLedDriver;
  readonly emitter: TwinRobotEventEmitter;

  private _state: RobotInteractionState = RobotInteractionState.IDLE;
  private _stateEmitter = new Emitter<RobotInteractionState>();

  constructor(opts?: {
    display?: TwinDisplayDriver;
    motion?: TwinMotionDriver;
    led?: TwinLedDriver;
    emitter?: TwinRobotEventEmitter;
  }) {
    this.display = opts?.display ?? new TwinDisplayDriver();
    this.motion = opts?.motion ?? new TwinMotionDriver();
    this.led = opts?.led ?? new TwinLedDriver();
    this.emitter = opts?.emitter ?? new TwinRobotEventEmitter();
  }

  get state(): RobotInteractionState {
    return this._state;
  }

  /** Subscribe to canonical FSM state changes. */
  listenState(listener: (state: RobotInteractionState) => void): Unsub {
    return this._stateEmitter.on(listener);
  }

  /**
   * Move the canonical FSM forward. Throws on illegal edges — the caller
   * should never pump a raw event through without checking.
   */
  setState(next: RobotInteractionState): void {
    assertTransition(this._state, next);
    this._state = next;
    this._stateEmitter.emit(next);
  }

  /**
   * Attempts a canonical FSM transition and returns whether it was accepted
   * without throwing. Intended for event-driven code paths where the backend
   * may retry or send duplicate state updates.
   */
  trySetState(next: RobotInteractionState): boolean {
    if (!isValidTransition(this._state, next)) return false;
    this._state = next;
    this._stateEmitter.emit(next);
    return true;
  }

  /** Test hook — reset the twin HAL to its initial state. */
  resetForTest(): void {
    this.display.resetForTest();
    this.motion.resetForTest();
    this.led.resetForTest();
    this.emitter.resetForTest();
    this._state = RobotInteractionState.IDLE;
  }
}
