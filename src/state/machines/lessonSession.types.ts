/**
 * LessonSession state-machine types.
 *
 * Plan: TJBot-design/.omc/plans/state-machines-mobile-ux.md §2.2, §3.2, §4.2, §5, §7.
 *
 * Invariants enforced here (mirrored in lessonSession.machine.ts):
 *   - Terminal transitions are SERVER-AUTHORITATIVE (plan §0 Principle 1).
 *     The mobile machine never enters ABANDONED_DISCONNECT, TIMED_OUT,
 *     COST_CAPPED, PARENT_STOPPED, SAFETY_HALT, or COMPLETED from a client
 *     timer. Each terminal is gated on a `SESSION_END` (or `SAFETY_BLOCK`)
 *     event whose `reason` discriminator the server emits.
 *   - INTERRUPTED carries a `reason` discriminator
 *     (`bargein | gentle_correction | retry | offtopic`) stored in context
 *     AND emitted in the `lesson.interrupted` analytics side effect.
 *   - The `Idempotency-Key` for `POST /v1/sessions/start` is minted by the
 *     CALLER at CTA tap, not by the machine (plan §4.2, §7). The
 *     `START_SESSION` event carries it as `idempotencyKey`.
 */

export type SessionEndReason =
  | 'complete'
  | 'timeout'
  | 'cost_limit'
  | 'barge_limit'
  | 'parent_stop'
  | 'disconnect_timeout'
  | 'user_exit';

export type InterruptReason =
  | 'bargein'
  | 'gentle_correction'
  | 'retry'
  | 'offtopic';

export type AudioFailureCode =
  | 'ws_fail'
  | 'audio_init_fail'
  | 'mic_unavailable';

export interface LessonSessionContext {
  /** Server-issued realtime session id; null until `SESSION_STARTED`. */
  sessionId: string | null;
  /** Stable cross-reconnect handle (`device_session_id`, plan §3.2). */
  deviceSessionId: string | null;
  /**
   * Caller-minted Idempotency-Key for `POST /v1/sessions/start`. Set when
   * START_SESSION fires. Re-used on app-resume retries; never re-minted
   * from inside the machine (plan §4.2, §7, Pre-Mortem Scenario B).
   */
  idempotencyKey: string | null;
  /** sys-04 server-side counter mirror (cap = 60, plan §4.2). */
  turnsCount: number;
  /** sys-04 server-side counter mirror (cap = 5, plan §4.2). */
  bargeinCount: number;
  /** sys-04 metering mirror in USD cents (cap = 12, plan §4.2). */
  costUsdCents: number;
  /**
   * The discriminator from the most recent INTERRUPT event. Required by
   * plan §3.2 / §10 — without it the merged INTERRUPTED state loses the
   * 4-screen analytics fidelity it replaces.
   */
  interruptedReason: InterruptReason | null;
  /**
   * Non-terminal banner flag. Set true after a 15s client safety fallback
   * inside RECONNECTING (plan §4.2 ADR-002). Cleared on `WS_RESUMED`.
   * Never escalates to a terminal — that is the server's job.
   */
  offlineBanner: boolean;
  /** Terminal `end_reason` recorded once the machine reaches a terminal. */
  endReason: SessionEndReason | null;
  /** Audio-init failure code for AUDIO_FAILED (plan §3.2 row). */
  audioFailureCode: AudioFailureCode | null;
  /**
   * Last analytics event emitted, captured for tests. Production code
   * should swallow this via the side-effect spy; left in the context so
   * unit tests can assert on it without wiring a separate spy.
   */
  lastAnalyticsEvent: {
    name: string;
    payload: Record<string, unknown>;
  } | null;
}

export type LessonSessionEvent =
  // ── client-driven entry ────────────────────────────────────────────────
  | {
      type: 'START_SESSION';
      /** Minted at CTA tap by the caller (plan §4.2). */
      idempotencyKey: string;
    }
  | { type: 'BACK_TO_HOME' }
  | { type: 'USER_EXIT_TAP' }
  | { type: 'CONFIRM_EXIT' }
  | { type: 'CONFIRM_END' }
  | { type: 'RESUME' }
  | { type: 'RETRY' }
  | { type: 'GIVE_UP' }
  // ── server / transport ─────────────────────────────────────────────────
  | {
      type: 'SESSION_STARTED';
      sessionId: string;
      deviceSessionId: string;
    }
  | { type: 'WS_DISCONNECT' }
  | { type: 'HEARTBEAT_MISS_3X' }
  | { type: 'WS_RESUMED' }
  | { type: 'WS_FAIL'; code: AudioFailureCode }
  | { type: 'AUDIO_INIT_FAIL'; code: AudioFailureCode }
  // ── ACTIVE turn loop (composite) ───────────────────────────────────────
  | { type: 'GREETING_DONE' }
  | { type: 'INTRO_DONE' }
  | { type: 'VAD_SPEECH' }
  | { type: 'VAD_SILENCE_2S' }
  | { type: 'VAD_END' }
  | { type: 'PROMPT_AGAIN' }
  | { type: 'REPLY_READY' }
  | {
      type: 'TURN_COMPLETE';
      turnId: string;
      responseText: string;
      fallback?: boolean;
    }
  | { type: 'ACTIVITY_COMPLETE' }
  | { type: 'NEXT_ACTIVITY' }
  // ── interruption (carries the discriminator) ───────────────────────────
  | { type: 'INTERRUPT'; reason: InterruptReason }
  // ── server-authoritative terminal events ───────────────────────────────
  | { type: 'SESSION_END'; reason: SessionEndReason }
  | { type: 'SAFETY_BLOCK' };

/**
 * Service stubs the machine invokes. The shape is intentionally minimal —
 * lane B owns the state model, not the network layer. Plan §4.2 endpoint
 * paths are documented next to each stub.
 *
 * NOTE on `Idempotency-Key`: callers (CTA tap handler) mint the key and
 * thread it through `START_SESSION`. The machine forwards it to
 * `startSession`; the service never invents one.
 */
export interface LessonSessionServices {
  /**
   * `POST /v1/sessions/start` — opens the realtime session.
   *   Required headers: `Idempotency-Key: <caller-minted uuid v4>`.
   *   Server returns `{ sessionId, deviceSessionId }`; client mirrors via
   *   the `SESSION_STARTED` event.
   */
  startSession: (args: {
    idempotencyKey: string;
  }) => Promise<{ sessionId: string; deviceSessionId: string }>;

  /**
   * `POST /v1/sessions/{id}/end` — server-authoritative final close. The
   * mobile machine only calls this for the one CLIENT-initiated reason
   * (`user_exit`); every other terminal is driven by a server `SESSION_END`
   * event arriving over WS.
   */
  endSession: (args: {
    sessionId: string;
    reason: 'user_exit';
  }) => Promise<void>;

  /**
   * WS `session.resume` — caller passes the surviving `deviceSessionId`.
   * Resolution arrives via the `WS_RESUMED` event, NOT the promise: the
   * server emits `session.resumed` over the WS, which the transport layer
   * translates into a machine event. The promise resolving only means the
   * reconnect attempt was accepted, not that the session is back.
   */
  reconnectSession: (args: {
    deviceSessionId: string;
  }) => Promise<void>;
}
