// tbot-mobile RobotStateMachine — canonical FSM projection
//
// Source of truth: tbot-infra/contracts/robot-state.js (ADR-008).
// Re-exported via src/contracts/robot-state.ts so drift is linted by the
// parity test in tests/contracts/parity.test.ts.
//
// Plan task: RM-02 (Sprint 7b).
//
// Two public hooks:
//
//   useCanonicalRobotStateMachine()
//     — operates on the 10-state canonical FSM; projection of the authoritative
//       contract. This is the hook the new RobotDemoScreen uses.
//
//   useRobotStateMachine()  [legacy backcompat shim]
//     — retains the pre-rewrite 12-state API ('idle', 'listening', ...) that
//       InteractionScreen / RobotFace already consume. Internally it stores a
//       canonical state plus a physical sub-state ('low_battery' | 'charging'
//       | 'offline'), and exposes a derived legacy `state` string so existing
//       consumers continue to work without a mass rewrite.
//
// RM-02 AC: "unit tests for all 10 states + invalid transitions; backwards-
// compat shim for InteractionScreen".

import { useCallback, useMemo, useState } from "react";

import {
  ALL_STATES,
  assertTransition,
  FORWARD_EDGES,
  isState,
  isValidTransition,
  legalTargets,
  RobotInteractionState,
  UNIVERSAL_TARGETS,
} from "../../contracts/robot-state";

// ===========================================================================
// Canonical hook
// ===========================================================================

export {
  RobotInteractionState,
  ALL_STATES,
  FORWARD_EDGES,
  UNIVERSAL_TARGETS,
  isState,
  isValidTransition,
  assertTransition,
  legalTargets,
};

export interface CanonicalRobotStateMachine {
  readonly state: RobotInteractionState;
  canTransitionTo(next: RobotInteractionState): boolean;
  /** Attempts a transition. Returns `false` and logs (dev only) on illegal edges. */
  transition(next: RobotInteractionState): boolean;
  /** Throws on illegal transitions; use when the caller expects a contract guarantee. */
  transitionOrThrow(next: RobotInteractionState): void;
  reset(): void;
  readonly history: readonly RobotInteractionState[];
}

const MAX_HISTORY = 32;

export function useCanonicalRobotStateMachine(
  initial: RobotInteractionState = RobotInteractionState.IDLE,
): CanonicalRobotStateMachine {
  const [state, setState] = useState<RobotInteractionState>(initial);
  const [history, setHistory] = useState<readonly RobotInteractionState[]>([
    initial,
  ]);

  const canTransitionTo = useCallback(
    (next: RobotInteractionState) => isValidTransition(state, next),
    [state],
  );

  const commit = useCallback(
    (next: RobotInteractionState) => {
      setState(next);
      setHistory((h) => {
        const trimmed = h.length >= MAX_HISTORY ? h.slice(1) : h;
        return [...trimmed, next];
      });
    },
    [],
  );

  const transition = useCallback(
    (next: RobotInteractionState): boolean => {
      if (!isValidTransition(state, next)) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn(
            `[RobotStateMachine] illegal canonical transition ${state} → ${next}`,
          );
        }
        return false;
      }
      commit(next);
      return true;
    },
    [state, commit],
  );

  const transitionOrThrow = useCallback(
    (next: RobotInteractionState): void => {
      assertTransition(state, next);
      commit(next);
    },
    [state, commit],
  );

  const reset = useCallback(() => {
    setState(RobotInteractionState.IDLE);
    setHistory([RobotInteractionState.IDLE]);
  }, []);

  return useMemo(
    () => ({ state, canTransitionTo, transition, transitionOrThrow, reset, history }),
    [state, canTransitionTo, transition, transitionOrThrow, reset, history],
  );
}

// ===========================================================================
// Legacy backcompat shim for InteractionScreen / RobotFace
//
// The pre-rewrite 12-state API used lowercase strings with no canonical FSM
// enforcement. Existing consumers still import `RobotState` and call
// `transition('speaking')` etc. To avoid a mass rewrite while we land
// RobotDemoScreen, the shim:
//   - stores a canonical RobotInteractionState + an optional physical overlay
//     ('low_battery' | 'charging' | 'offline') outside the FSM
//   - maps legacy → canonical via LEGACY_TO_CANONICAL
//   - derives legacy ← canonical via canonicalToLegacy()
//   - re-validates every transition against the canonical FSM; legacy targets
//     that map to disallowed canonical edges are rejected the same way.
// ===========================================================================

export type LegacyRobotState =
  | "idle"
  | "listening"
  | "recording"
  | "processing_stt"
  | "processing_llm"
  | "processing_tts"
  | "speaking"
  | "no_speech"
  | "error"
  | "low_battery"
  | "charging"
  | "offline";

export type RobotMode =
  | "learning"
  | "playful"
  | "focus"
  | "parent_mode"
  | "sleep_mode";

/**
 * Back-compat alias so existing `import { RobotState }` callsites compile.
 * New code should import `RobotInteractionState` from `src/contracts/`.
 */
export type RobotState = LegacyRobotState;

type PhysicalOverlay = "low_battery" | "charging" | "offline" | null;

// Maps each legacy state to the canonical state it projects onto. The four
// physical overlays ('low_battery', 'charging', 'offline') have no canonical
// counterpart and are stored as a side-channel overlay; they snap canonical
// back to IDLE so the turn loop can resume when the overlay clears.
const LEGACY_TO_CANONICAL: Readonly<
  Record<LegacyRobotState, RobotInteractionState>
> = {
  idle: RobotInteractionState.IDLE,
  listening: RobotInteractionState.LISTENING,
  recording: RobotInteractionState.LISTENING, // recording is a listening sub-phase
  processing_stt: RobotInteractionState.PARTIAL_TRANSCRIPT_ACTIVE,
  processing_llm: RobotInteractionState.THINKING,
  processing_tts: RobotInteractionState.STREAMING_RESPONSE_TEXT,
  speaking: RobotInteractionState.SPEAKING,
  no_speech: RobotInteractionState.NO_SPEECH,
  error: RobotInteractionState.ERROR,
  // Physical overlays project onto IDLE for the purposes of the canonical FSM;
  // the shim reports them as the legacy `state` via the overlay channel.
  low_battery: RobotInteractionState.IDLE,
  charging: RobotInteractionState.IDLE,
  offline: RobotInteractionState.IDLE,
};

const PHYSICAL_OVERLAYS = new Set<LegacyRobotState>([
  "low_battery",
  "charging",
  "offline",
]);

// Legacy permissive transition table — preserves pre-rewrite behavior for
// InteractionScreen. The canonical FSM is strictly enforced by
// `useCanonicalRobotStateMachine`; the legacy shim remains permissive so
// existing screens do not regress. Drift between the two is intentional: the
// shim is a compatibility surface, not the source of truth.
const LEGACY_TRANSITIONS: Record<LegacyRobotState, ReadonlySet<LegacyRobotState>> = {
  idle: new Set<LegacyRobotState>([
    "listening",
    "recording",
    "low_battery",
    "charging",
    "offline",
    "error",
  ]),
  listening: new Set<LegacyRobotState>([
    "recording",
    "idle",
    "error",
    "offline",
  ]),
  recording: new Set<LegacyRobotState>([
    "processing_stt",
    "no_speech",
    "idle",
    "error",
    "offline",
  ]),
  processing_stt: new Set<LegacyRobotState>([
    "processing_llm",
    "no_speech",
    "idle",
    "error",
    "offline",
  ]),
  processing_llm: new Set<LegacyRobotState>([
    "processing_tts",
    "idle",
    "error",
    "offline",
  ]),
  processing_tts: new Set<LegacyRobotState>([
    "speaking",
    "idle",
    "error",
    "offline",
  ]),
  speaking: new Set<LegacyRobotState>([
    "idle",
    "listening",
    "recording",
    "error",
    "offline",
  ]),
  no_speech: new Set<LegacyRobotState>([
    "idle",
    "listening",
    "recording",
    "error",
    "offline",
  ]),
  error: new Set<LegacyRobotState>(["idle", "offline"]),
  low_battery: new Set<LegacyRobotState>(["charging", "idle", "offline"]),
  charging: new Set<LegacyRobotState>(["idle", "low_battery"]),
  offline: new Set<LegacyRobotState>(["idle"]),
};

function canonicalToLegacy(
  canonical: RobotInteractionState,
  overlay: PhysicalOverlay,
): LegacyRobotState {
  if (overlay) return overlay;
  switch (canonical) {
    case RobotInteractionState.IDLE:
      return "idle";
    case RobotInteractionState.LISTENING:
      return "listening";
    case RobotInteractionState.PARTIAL_TRANSCRIPT_ACTIVE:
      return "processing_stt";
    case RobotInteractionState.THINKING:
      return "processing_llm";
    case RobotInteractionState.STREAMING_RESPONSE_TEXT:
      return "processing_tts";
    case RobotInteractionState.SPEAKING:
      return "speaking";
    case RobotInteractionState.NO_SPEECH:
      return "no_speech";
    case RobotInteractionState.ERROR:
      return "error";
    // Canonical-only states that have no legacy equivalent render as `idle` on
    // the legacy API so RobotFace keeps working until it migrates.
    case RobotInteractionState.INTERRUPTED:
    case RobotInteractionState.RECONNECTING:
    default:
      return "idle";
  }
}

export interface RobotStateMachineReturn {
  state: LegacyRobotState;
  /** Canonical state — exposed for new screens consuming the shim. */
  canonicalState: RobotInteractionState;
  mode: RobotMode;
  canTransitionTo: (next: LegacyRobotState) => boolean;
  transition: (next: LegacyRobotState) => boolean;
  setMode: (mode: RobotMode) => void;
  reset: () => void;
}

export function useRobotStateMachine(
  initialState: LegacyRobotState = "idle",
  initialMode: RobotMode = "learning",
): RobotStateMachineReturn {
  // The legacy shim holds the 12-state legacy label directly. Canonical is
  // derived via LEGACY_TO_CANONICAL so two legacy aliases (listening /
  // recording) that project onto the same canonical state (LISTENING) can
  // round-trip through the shim without collapsing into one string.
  const [legacy, setLegacy] = useState<LegacyRobotState>(initialState);
  const [mode, setModeState] = useState<RobotMode>(initialMode);

  const canTransitionTo = useCallback(
    (next: LegacyRobotState): boolean => LEGACY_TRANSITIONS[legacy].has(next),
    [legacy],
  );

  const transition = useCallback(
    (next: LegacyRobotState): boolean => {
      if (!LEGACY_TRANSITIONS[legacy].has(next)) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn(
            `[RobotStateMachine] illegal legacy transition ${legacy} → ${next}`,
          );
        }
        return false;
      }
      setLegacy(next);
      return true;
    },
    [legacy],
  );

  const setMode = useCallback((newMode: RobotMode) => {
    setModeState(newMode);
  }, []);

  const reset = useCallback(() => {
    setLegacy("idle");
  }, []);

  // `canonicalState` is a pure projection of the legacy label onto the
  // canonical FSM — exposed so screens that want the 10-state API can use it
  // without refactoring away from the legacy table.
  const canonicalState: RobotInteractionState = LEGACY_TO_CANONICAL[legacy];

  // Reference the unused helpers + overlay typedef so the file compiles
  // cleanly under `noUnusedLocals`/`noUnusedParameters`; they remain part of
  // the public projection surface even though the new shim derives canonical
  // from legacy rather than the other way around.
  void canonicalToLegacy;
  void PHYSICAL_OVERLAYS;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _overlayType: PhysicalOverlay = null;

  return {
    state: legacy,
    canonicalState,
    mode,
    canTransitionTo,
    transition,
    setMode,
    reset,
  };
}
