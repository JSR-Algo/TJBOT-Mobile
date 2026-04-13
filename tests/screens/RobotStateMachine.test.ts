// Unit tests for RobotStateMachine — canonical FSM projection + legacy shim.
//
// Plan: expressive-robot-companion-rewrite §6 RM-02.
// AC: "unit tests for all 10 states + invalid transitions; backwards-compat
//     shim for InteractionScreen".
//
// We drive the hook via @testing-library/react-native's renderHook so the
// effects, useCallback dependency updates, and useState resets behave the
// way the screen sees them.

import { act, renderHook } from "@testing-library/react-native";

import {
  ALL_STATES,
  FORWARD_EDGES,
  RobotInteractionState,
  UNIVERSAL_TARGETS,
  useCanonicalRobotStateMachine,
  useRobotStateMachine,
  type LegacyRobotState,
} from "../../src/screens/interaction/RobotStateMachine";

describe("useCanonicalRobotStateMachine", () => {
  test("starts in IDLE by default", () => {
    const { result } = renderHook(() => useCanonicalRobotStateMachine());
    expect(result.current.state).toBe(RobotInteractionState.IDLE);
    expect(result.current.history).toEqual([RobotInteractionState.IDLE]);
  });

  test("accepts the full canonical forward loop IDLE→...→IDLE", () => {
    const { result } = renderHook(() => useCanonicalRobotStateMachine());
    const loop: RobotInteractionState[] = [
      RobotInteractionState.LISTENING,
      RobotInteractionState.PARTIAL_TRANSCRIPT_ACTIVE,
      RobotInteractionState.THINKING,
      RobotInteractionState.STREAMING_RESPONSE_TEXT,
      RobotInteractionState.SPEAKING,
      RobotInteractionState.IDLE,
    ];
    for (const next of loop) {
      let ok = false;
      act(() => {
        ok = result.current.transition(next);
      });
      expect(ok).toBe(true);
      expect(result.current.state).toBe(next);
    }
    expect(result.current.history.slice(-loop.length)).toEqual(loop);
  });

  test("rejects an illegal forward edge (IDLE → SPEAKING)", () => {
    const { result } = renderHook(() => useCanonicalRobotStateMachine());
    let ok = true;
    act(() => {
      ok = result.current.transition(RobotInteractionState.SPEAKING);
    });
    expect(ok).toBe(false);
    expect(result.current.state).toBe(RobotInteractionState.IDLE);
  });

  test("transitionOrThrow raises on illegal edges", () => {
    const { result } = renderHook(() => useCanonicalRobotStateMachine());
    expect(() =>
      act(() => {
        result.current.transitionOrThrow(RobotInteractionState.SPEAKING);
      }),
    ).toThrow(/illegal transition IDLE → SPEAKING/);
  });

  test("universal escape edges fire from every canonical state", () => {
    // Drive the hook through each state and confirm each UNIVERSAL_TARGETS
    // edge (INTERRUPTED / NO_SPEECH / RECONNECTING / ERROR) is accepted.
    for (const from of ALL_STATES) {
      for (const escape of UNIVERSAL_TARGETS) {
        if (escape === from) continue; // no self-escape edge
        const { result } = renderHook(() =>
          useCanonicalRobotStateMachine(from),
        );
        let ok = false;
        act(() => {
          ok = result.current.transition(escape);
        });
        expect(ok).toBe(true);
        expect(result.current.state).toBe(escape);
      }
    }
  });

  test("every canonical FORWARD_EDGES cell is reachable from the hook", () => {
    // For each state in FORWARD_EDGES, confirm the hook accepts the declared
    // forward targets — covers the 10 states' outbound edges exhaustively.
    for (const from of ALL_STATES) {
      for (const to of FORWARD_EDGES[from]) {
        const { result } = renderHook(() =>
          useCanonicalRobotStateMachine(from),
        );
        let ok = false;
        act(() => {
          ok = result.current.transition(to);
        });
        expect(ok).toBe(true);
        expect(result.current.state).toBe(to);
      }
    }
  });

  test("reset snaps back to IDLE and clears history", () => {
    const { result } = renderHook(() => useCanonicalRobotStateMachine());
    act(() => {
      result.current.transition(RobotInteractionState.LISTENING);
    });
    act(() => {
      result.current.transition(RobotInteractionState.INTERRUPTED);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toBe(RobotInteractionState.IDLE);
    expect(result.current.history).toEqual([RobotInteractionState.IDLE]);
  });
});

describe("useRobotStateMachine (legacy backcompat shim)", () => {
  test("legacy forward loop idle→listening→recording→processing_stt→…→speaking→idle", () => {
    const { result } = renderHook(() => useRobotStateMachine());
    const loop: LegacyRobotState[] = [
      "listening",
      "recording",
      "processing_stt",
      "processing_llm",
      "processing_tts",
      "speaking",
      "idle",
    ];
    for (const next of loop) {
      let ok = false;
      act(() => {
        ok = result.current.transition(next);
      });
      expect(ok).toBe(true);
      expect(result.current.state).toBe(next);
    }
    expect(result.current.canonicalState).toBe(RobotInteractionState.IDLE);
  });

  test("rejects illegal legacy edge (idle → speaking) via canonical FSM", () => {
    const { result } = renderHook(() => useRobotStateMachine());
    let ok = true;
    act(() => {
      ok = result.current.transition("speaking");
    });
    expect(ok).toBe(false);
    expect(result.current.state).toBe("idle");
  });

  test("physical overlay can replace any legacy state and be cleared via the permissive legacy table", () => {
    const { result } = renderHook(() => useRobotStateMachine());
    // Walk to idle → listening → recording → processing_stt → processing_llm.
    // The legacy permissive table requires passing through `recording` to
    // reach `processing_stt`; we exercise the full path so a future change
    // that trims the table is caught here.
    act(() => {
      result.current.transition("listening");
    });
    act(() => {
      result.current.transition("recording");
    });
    act(() => {
      result.current.transition("processing_stt");
    });
    act(() => {
      result.current.transition("processing_llm");
    });
    expect(result.current.canonicalState).toBe(RobotInteractionState.THINKING);
    // Applying 'low_battery' replaces the legacy label entirely (side-channel
    // semantics preserved from the pre-rewrite shim). The legacy table allows
    // `low_battery → idle`, which is how the runtime leaves the overlay.
    act(() => {
      // processing_llm is allowed to transition to 'idle' and 'error' but not
      // directly to 'low_battery'; the overlay is reached by first snapping
      // to idle, which is what the pre-rewrite runtime did as well.
      result.current.transition("idle");
    });
    act(() => {
      result.current.transition("low_battery");
    });
    expect(result.current.state).toBe("low_battery");
    expect(result.current.canonicalState).toBe(RobotInteractionState.IDLE);
    // Clear overlay via the legacy table's own edge: low_battery → idle.
    act(() => {
      result.current.transition("idle");
    });
    expect(result.current.state).toBe("idle");
    expect(result.current.canonicalState).toBe(RobotInteractionState.IDLE);
  });

  test("legacy aliases within the same canonical state are accepted as no-ops", () => {
    const { result } = renderHook(() => useRobotStateMachine("listening"));
    let ok = false;
    act(() => {
      ok = result.current.transition("recording");
    });
    expect(ok).toBe(true);
    // Both legacy labels project onto canonical LISTENING.
    expect(result.current.canonicalState).toBe(RobotInteractionState.LISTENING);
    expect(result.current.state).toBe("recording");
  });

  test("legacy permissive table still gates illegal edges like idle → processing_tts", () => {
    const { result } = renderHook(() => useRobotStateMachine("idle"));
    // idle can go to listening/recording/overlays/error — not straight to tts.
    expect(result.current.canTransitionTo("listening")).toBe(true);
    expect(result.current.canTransitionTo("error")).toBe(true);
    expect(result.current.canTransitionTo("low_battery")).toBe(true);
    expect(result.current.canTransitionTo("processing_tts")).toBe(false);
    expect(result.current.canTransitionTo("speaking")).toBe(false);
  });
});
