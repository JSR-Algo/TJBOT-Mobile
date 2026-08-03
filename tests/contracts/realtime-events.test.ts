// Unit tests for realtime-events contract validation
// Tests the decomposed isRealtimeEvent function and its helper validators

import {
  isRealtimeEvent,
  InterruptEvent,
  ExpressionEvent,
  MotionEvent,
  RobotStateEvent,
  PerceivedReactionEvent,
  LatencyTickEvent,
  createInterrupt,
  createLatencyTick,
} from "../../src/contracts/realtime-events";

describe("isRealtimeEvent", () => {
  describe("envelope validation", () => {
    it("rejects null value", () => {
      expect(isRealtimeEvent(null)).toBe(false);
    });

    it("rejects undefined value", () => {
      expect(isRealtimeEvent(undefined)).toBe(false);
    });

    it("rejects non-object value", () => {
      expect(isRealtimeEvent("not an object")).toBe(false);
      expect(isRealtimeEvent(42)).toBe(false);
      expect(isRealtimeEvent(true)).toBe(false);
    });

    it("rejects missing session_id", () => {
      const event = {
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects empty session_id", () => {
      const event = {
        session_id: "",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects non-string session_id", () => {
      const event = {
        session_id: 123,
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects missing timestamp_ms", () => {
      const event = {
        session_id: "sess-123",
        type: "INTERRUPT",
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects negative timestamp_ms", () => {
      const event = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: -1,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects non-number timestamp_ms", () => {
      const event = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: "1000",
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects invalid turn_id (non-string when present)", () => {
      const event = {
        session_id: "sess-123",
        turn_id: 123,
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("accepts valid turn_id", () => {
      const event: InterruptEvent = {
        session_id: "sess-123",
        turn_id: "turn-456",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts absent turn_id", () => {
      const event: InterruptEvent = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });
  });

  describe("type validation", () => {
    it("rejects missing type field", () => {
      const event = {
        session_id: "sess-123",
        timestamp_ms: 1000,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects non-string type", () => {
      const event = {
        session_id: "sess-123",
        type: 123,
        timestamp_ms: 1000,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects unknown event type", () => {
      const event = {
        session_id: "sess-123",
        type: "UNKNOWN_TYPE",
        timestamp_ms: 1000,
        payload: {},
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });
  });

  describe("payload validation", () => {
    it("rejects missing payload", () => {
      const event = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects null payload", () => {
      const event = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: null,
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects non-object payload", () => {
      const event = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: "string",
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });
  });

  describe("INTERRUPT event validation", () => {
    it("accepts valid INTERRUPT event with USER_TAP", () => {
      const event: InterruptEvent = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts valid INTERRUPT event with USER_VOICE", () => {
      const event: InterruptEvent = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "USER_VOICE", source: "backend" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts valid INTERRUPT event with SERVER_ABORT", () => {
      const event: InterruptEvent = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "SERVER_ABORT", source: "firmware" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts valid INTERRUPT event with SYSTEM_ERROR", () => {
      const event: InterruptEvent = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "SYSTEM_ERROR", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("rejects INTERRUPT with missing reason", () => {
      const event = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects INTERRUPT with invalid reason", () => {
      const event = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "INVALID_REASON", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects INTERRUPT with missing source", () => {
      const event = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "USER_TAP" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects INTERRUPT with invalid source", () => {
      const event = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: { reason: "USER_TAP", source: "invalid" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });
  });

  describe("EXPRESSION event validation", () => {
    it("accepts valid EXPRESSION event", () => {
      const event: ExpressionEvent = {
        session_id: "sess-123",
        type: "EXPRESSION",
        timestamp_ms: 1000,
        payload: { expression: "HAPPY", duration_ms: 500, source: "llm_tag" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("rejects EXPRESSION with non-string expression", () => {
      const event = {
        session_id: "sess-123",
        type: "EXPRESSION",
        timestamp_ms: 1000,
        payload: { expression: 123, duration_ms: 500, source: "llm_tag" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects EXPRESSION with non-number duration_ms", () => {
      const event = {
        session_id: "sess-123",
        type: "EXPRESSION",
        timestamp_ms: 1000,
        payload: { expression: "happy", duration_ms: "500", source: "llm_tag" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects EXPRESSION with zero duration_ms", () => {
      const event = {
        session_id: "sess-123",
        type: "EXPRESSION",
        timestamp_ms: 1000,
        payload: { expression: "happy", duration_ms: 0, source: "llm_tag" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects EXPRESSION with negative duration_ms", () => {
      const event = {
        session_id: "sess-123",
        type: "EXPRESSION",
        timestamp_ms: 1000,
        payload: { expression: "happy", duration_ms: -100, source: "llm_tag" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects EXPRESSION with non-string source", () => {
      const event = {
        session_id: "sess-123",
        type: "EXPRESSION",
        timestamp_ms: 1000,
        payload: { expression: "happy", duration_ms: 500, source: 123 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects EXPRESSION with missing source", () => {
      const event = {
        session_id: "sess-123",
        type: "EXPRESSION",
        timestamp_ms: 1000,
        payload: { expression: "happy", duration_ms: 500 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });
  });

  describe("MOTION event validation", () => {
    it("accepts valid MOTION event without intensity", () => {
      const event: MotionEvent = {
        session_id: "sess-123",
        type: "MOTION",
        timestamp_ms: 1000,
        payload: { motion: "WAVE_ARM", duration_ms: 500, intensity: 0.5 },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts valid MOTION event with intensity 0", () => {
      const event: MotionEvent = {
        session_id: "sess-123",
        type: "MOTION",
        timestamp_ms: 1000,
        payload: { motion: "WAVE_ARM", duration_ms: 500, intensity: 0 },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts valid MOTION event with intensity 1", () => {
      const event: MotionEvent = {
        session_id: "sess-123",
        type: "MOTION",
        timestamp_ms: 1000,
        payload: { motion: "WAVE_ARM", duration_ms: 500, intensity: 1 },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts MOTION event without intensity field", () => {
      const event = {
        session_id: "sess-123",
        type: "MOTION",
        timestamp_ms: 1000,
        payload: { motion: "wave", duration_ms: 500 },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("rejects MOTION with non-string motion", () => {
      const event = {
        session_id: "sess-123",
        type: "MOTION",
        timestamp_ms: 1000,
        payload: { motion: 123, duration_ms: 500, intensity: 0.5 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects MOTION with zero duration_ms", () => {
      const event = {
        session_id: "sess-123",
        type: "MOTION",
        timestamp_ms: 1000,
        payload: { motion: "wave", duration_ms: 0, intensity: 0.5 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects MOTION with negative duration_ms", () => {
      const event = {
        session_id: "sess-123",
        type: "MOTION",
        timestamp_ms: 1000,
        payload: { motion: "wave", duration_ms: -100, intensity: 0.5 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects MOTION with intensity < 0", () => {
      const event = {
        session_id: "sess-123",
        type: "MOTION",
        timestamp_ms: 1000,
        payload: { motion: "WAVE_ARM", duration_ms: 500, intensity: -0.1 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects MOTION with intensity > 1", () => {
      const event = {
        session_id: "sess-123",
        type: "MOTION",
        timestamp_ms: 1000,
        payload: { motion: "WAVE_ARM", duration_ms: 500, intensity: 1.1 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects MOTION with non-number intensity", () => {
      const event = {
        session_id: "sess-123",
        type: "MOTION",
        timestamp_ms: 1000,
        payload: { motion: "WAVE_ARM", duration_ms: 500, intensity: "0.5" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });
  });

  describe("ROBOT_STATE event validation", () => {
    it("accepts valid ROBOT_STATE event", () => {
      const event: RobotStateEvent = {
        session_id: "sess-123",
        type: "ROBOT_STATE",
        timestamp_ms: 1000,
        payload: { state: "IDLE" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts ROBOT_STATE event with previous_state", () => {
      const event: RobotStateEvent = {
        session_id: "sess-123",
        type: "ROBOT_STATE",
        timestamp_ms: 1000,
        payload: { state: "LISTENING", previous_state: "IDLE" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("rejects ROBOT_STATE with non-string state", () => {
      const event = {
        session_id: "sess-123",
        type: "ROBOT_STATE",
        timestamp_ms: 1000,
        payload: { state: 123 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects ROBOT_STATE with missing state", () => {
      const event = {
        session_id: "sess-123",
        type: "ROBOT_STATE",
        timestamp_ms: 1000,
        payload: {},
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });
  });

  describe("PERCEIVED_REACTION event validation", () => {
    it("accepts valid PERCEIVED_REACTION with AUDIO_END", () => {
      const event: PerceivedReactionEvent = {
        session_id: "sess-123",
        type: "PERCEIVED_REACTION",
        timestamp_ms: 1000,
        payload: { trigger: "AUDIO_END" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts valid PERCEIVED_REACTION with VAD_SILENCE", () => {
      const event: PerceivedReactionEvent = {
        session_id: "sess-123",
        type: "PERCEIVED_REACTION",
        timestamp_ms: 1000,
        payload: { trigger: "VAD_SILENCE" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts valid PERCEIVED_REACTION with TAP", () => {
      const event: PerceivedReactionEvent = {
        session_id: "sess-123",
        type: "PERCEIVED_REACTION",
        timestamp_ms: 1000,
        payload: { trigger: "TAP" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("rejects PERCEIVED_REACTION with invalid trigger", () => {
      const event = {
        session_id: "sess-123",
        type: "PERCEIVED_REACTION",
        timestamp_ms: 1000,
        payload: { trigger: "INVALID" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects PERCEIVED_REACTION with non-string trigger", () => {
      const event = {
        session_id: "sess-123",
        type: "PERCEIVED_REACTION",
        timestamp_ms: 1000,
        payload: { trigger: 123 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects PERCEIVED_REACTION with missing trigger", () => {
      const event = {
        session_id: "sess-123",
        type: "PERCEIVED_REACTION",
        timestamp_ms: 1000,
        payload: {},
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });
  });

  describe("LATENCY_TICK event validation", () => {
    it("accepts valid LATENCY_TICK with perceived_reaction_ms", () => {
      const event: LatencyTickEvent = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { metric: "perceived_reaction_ms", value_ms: 150 },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts valid LATENCY_TICK with transcript_ms", () => {
      const event: LatencyTickEvent = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { metric: "transcript_ms", value_ms: 300 },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts valid LATENCY_TICK with first_audio_ms", () => {
      const event: LatencyTickEvent = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { metric: "first_audio_ms", value_ms: 50 },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts valid LATENCY_TICK with full_completion_ms", () => {
      const event: LatencyTickEvent = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { metric: "full_completion_ms", value_ms: 2000 },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts valid LATENCY_TICK with interrupt_to_stop_ms", () => {
      const event: LatencyTickEvent = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { metric: "interrupt_to_stop_ms", value_ms: 100 },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts LATENCY_TICK with value_ms = 0", () => {
      const event: LatencyTickEvent = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { metric: "perceived_reaction_ms", value_ms: 0 },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("rejects LATENCY_TICK with invalid metric", () => {
      const event = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { metric: "invalid_metric", value_ms: 150 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects LATENCY_TICK with non-string metric", () => {
      const event = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { metric: 123, value_ms: 150 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects LATENCY_TICK with negative value_ms", () => {
      const event = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { metric: "perceived_reaction_ms", value_ms: -10 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects LATENCY_TICK with non-number value_ms", () => {
      const event = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { metric: "perceived_reaction_ms", value_ms: "150" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects LATENCY_TICK with missing metric", () => {
      const event = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { value_ms: 150 },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });

    it("rejects LATENCY_TICK with missing value_ms", () => {
      const event = {
        session_id: "sess-123",
        type: "LATENCY_TICK",
        timestamp_ms: 1000,
        payload: { metric: "perceived_reaction_ms" },
      };
      expect(isRealtimeEvent(event)).toBe(false);
    });
  });

  describe("event factory functions", () => {
    it("createInterrupt creates valid INTERRUPT event", () => {
      const event = createInterrupt({
        session_id: "sess-123",
        reason: "USER_TAP",
        source: "mobile",
      });
      expect(isRealtimeEvent(event)).toBe(true);
      expect(event.type).toBe("INTERRUPT");
    });

    it("createInterrupt includes turn_id if provided", () => {
      const event = createInterrupt({
        session_id: "sess-123",
        turn_id: "turn-456",
        reason: "USER_TAP",
        source: "mobile",
      });
      expect(event.turn_id).toBe("turn-456");
    });

    it("createInterrupt generates timestamp if not provided", () => {
      const before = Date.now();
      const event = createInterrupt({
        session_id: "sess-123",
        reason: "USER_TAP",
        source: "mobile",
      });
      const after = Date.now();
      expect(event.timestamp_ms).toBeGreaterThanOrEqual(before);
      expect(event.timestamp_ms).toBeLessThanOrEqual(after);
    });

    it("createLatencyTick creates valid LATENCY_TICK event", () => {
      const event = createLatencyTick({
        session_id: "sess-123",
        metric: "perceived_reaction_ms",
        value_ms: 150,
      });
      expect(isRealtimeEvent(event)).toBe(true);
      expect(event.type).toBe("LATENCY_TICK");
    });

    it("createLatencyTick generates timestamp if not provided", () => {
      const before = Date.now();
      const event = createLatencyTick({
        session_id: "sess-123",
        metric: "perceived_reaction_ms",
        value_ms: 150,
      });
      const after = Date.now();
      expect(event.timestamp_ms).toBeGreaterThanOrEqual(before);
      expect(event.timestamp_ms).toBeLessThanOrEqual(after);
    });
  });

  describe("edge cases and error paths", () => {
    it("accepts zero timestamp_ms", () => {
      const event: InterruptEvent = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 0,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("accepts very large timestamp_ms", () => {
      const event: InterruptEvent = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: Number.MAX_SAFE_INTEGER,
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("rejects object with extra fields (ignores them)", () => {
      const event: any = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        extra_field: "ignored",
        payload: { reason: "USER_TAP", source: "mobile" },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });

    it("rejects payload with extra fields (ignores them)", () => {
      const event: any = {
        session_id: "sess-123",
        type: "INTERRUPT",
        timestamp_ms: 1000,
        payload: {
          reason: "USER_TAP",
          source: "mobile",
          extra_field: "ignored",
        },
      };
      expect(isRealtimeEvent(event)).toBe(true);
    });
  });
});
