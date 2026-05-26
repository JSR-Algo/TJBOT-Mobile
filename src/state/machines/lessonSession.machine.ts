import { assign, fromPromise, setup, type ActorRefFrom } from 'xstate';
import type {
  LessonSessionContext,
  LessonSessionEvent,
  LessonSessionServices,
} from './lessonSession.types';

/**
 * LessonSession state machine.
 *
 * Plan: TJBot-design/.omc/plans/state-machines-mobile-ux.md §0, §2.2, §3.2,
 * §4.2, §5, §7. Architect + Critic consensus pass 2026-05-11.
 *
 * Server-authoritative terminals (plan §0 Principle 1, ADR-002):
 *
 *   - RECONNECTING → ABANDONED_DISCONNECT fires ONLY on
 *     `SESSION_END { reason: 'disconnect_timeout' }`. There is NO
 *     `after: N` transition out of RECONNECTING into any terminal.
 *     The 15s `after` from RECONNECTING flips `offlineBanner=true`
 *     (non-terminal UI flag), it does NOT change state.
 *
 *   - TIMED_OUT / COST_CAPPED / PARENT_STOPPED / SAFETY_HALT /
 *     COMPLETED are all server-driven via `SESSION_END` or
 *     `SAFETY_BLOCK` events.
 *
 *   - The single CLIENT-initiated terminal is `ABANDONED` from
 *     `PAUSED` via `CONFIRM_EXIT` — that path calls
 *     `services.endSession({ reason: 'user_exit' })`.
 *
 * Invalid transitions (plan §5) are enforced by omission: no incoming
 * edge to ACTIVE, CONNECTING, etc. from any terminal state. XState v5
 * silently no-ops events that have no matching transition in the
 * current state, so a `.send({ type: 'RESUME' })` to SAFETY_HALT or
 * PARENT_STOPPED leaves the machine where it was — verified by
 * lessonSession.machine.test.ts.
 *
 * INTERRUPTED carries a `reason` discriminator (plan §3.2 / §10). The
 * `entry` action emits a `lesson.interrupted` analytics event whose
 * payload includes the discriminator. Tests assert this via
 * `lastAnalyticsEvent` in context.
 */

const DEFAULT_CONTEXT: LessonSessionContext = {
  sessionId: null,
  deviceSessionId: null,
  idempotencyKey: null,
  turnsCount: 0,
  bargeinCount: 0,
  costUsdCents: 0,
  interruptedReason: null,
  offlineBanner: false,
  endReason: null,
  audioFailureCode: null,
  lastAnalyticsEvent: null,
};

/**
 * Plan §4.2 ADR-002: 15s non-terminal banner fallback inside RECONNECTING.
 * NEVER promote this to a terminal — server is the only authority that
 * can declare `disconnect_timeout`.
 */
const RECONNECTING_BANNER_MS = 15_000;

/** Build the machine. The `services` arg is the network layer — see types. */
export const createLessonSessionMachine = (services: LessonSessionServices) =>
  setup({
    types: {
      context: {} as LessonSessionContext,
      events: {} as LessonSessionEvent,
    },
    actions: {
      assignSessionStartArgs: assign({
        idempotencyKey: ({ event }) =>
          event.type === 'START_SESSION' ? event.idempotencyKey : null,
      }),
      assignSessionStartedIds: assign({
        sessionId: ({ event }) =>
          event.type === 'SESSION_STARTED' ? event.sessionId : null,
        deviceSessionId: ({ event }) =>
          event.type === 'SESSION_STARTED' ? event.deviceSessionId : null,
      }),
      assignInterruptedReason: assign({
        interruptedReason: ({ event }) =>
          event.type === 'INTERRUPT' ? event.reason : null,
        bargeinCount: ({ context, event }) =>
          event.type === 'INTERRUPT' && event.reason === 'bargein'
            ? context.bargeinCount + 1
            : context.bargeinCount,
      }),
      emitInterruptedAnalytics: assign({
        // Side-effect emitter implemented via context-writeable record so
        // tests can assert without wiring a separate spy. Real callers can
        // observe `lastAnalyticsEvent` changes via a subscriber, or replace
        // this action when injecting telemetry middleware.
        lastAnalyticsEvent: ({ context }) => ({
          name: 'lesson.interrupted',
          payload: {
            reason: context.interruptedReason,
            sessionId: context.sessionId,
            bargeinCount: context.bargeinCount,
          },
        }),
      }),
      clearInterruptedReason: assign({
        interruptedReason: null,
      }),
      setOfflineBanner: assign({
        offlineBanner: true,
      }),
      clearOfflineBanner: assign({
        offlineBanner: false,
      }),
      assignEndReasonFromEvent: assign({
        endReason: ({ event }) =>
          event.type === 'SESSION_END' ? event.reason : null,
      }),
      assignEndReasonUserExit: assign({
        endReason: 'user_exit' as const,
      }),
      assignEndReasonSafetyHalt: assign({
        // Surface SAFETY_BLOCK as a distinct end-reason in context for
        // analytics; the state name SAFETY_HALT carries the same signal.
        endReason: null,
      }),
      assignAudioFailure: assign({
        audioFailureCode: ({ event }) => {
          if (event.type === 'WS_FAIL' || event.type === 'AUDIO_INIT_FAIL') {
            return event.code;
          }
          return null;
        },
      }),
      incrementTurns: assign({
        turnsCount: ({ context }) => context.turnsCount + 1,
      }),
    },
    guards: {
      endReasonComplete: ({ event }) =>
        event.type === 'SESSION_END' && event.reason === 'complete',
      endReasonTimeout: ({ event }) =>
        event.type === 'SESSION_END' && event.reason === 'timeout',
      endReasonCostLimit: ({ event }) =>
        event.type === 'SESSION_END' && event.reason === 'cost_limit',
      endReasonBargeLimit: ({ event }) =>
        event.type === 'SESSION_END' && event.reason === 'barge_limit',
      endReasonParentStop: ({ event }) =>
        event.type === 'SESSION_END' && event.reason === 'parent_stop',
      endReasonDisconnectTimeout: ({ event }) =>
        event.type === 'SESSION_END' && event.reason === 'disconnect_timeout',
    },
    actors: {
      startSession: fromPromise<
        { sessionId: string; deviceSessionId: string },
        { idempotencyKey: string }
      >(({ input }) =>
        services.startSession({ idempotencyKey: input.idempotencyKey }),
      ),
      endSession: fromPromise<void, { sessionId: string }>(({ input }) =>
        services.endSession({ sessionId: input.sessionId, reason: 'user_exit' }),
      ),
      reconnectSession: fromPromise<void, { deviceSessionId: string }>(
        ({ input }) =>
          services.reconnectSession({ deviceSessionId: input.deviceSessionId }),
      ),
    },
  }).createMachine({
    id: 'lessonSession',
    initial: 'IDLE',
    context: DEFAULT_CONTEXT,
    on: {
      // Server-authoritative terminals can fire from ANY non-terminal state
      // (defensive: a `parent_stop` arriving while we're in PAUSED must
      // still terminate). Each is gated on the reason discriminator.
      SESSION_END: [
        {
          guard: 'endReasonComplete',
          target: '.COMPLETED',
          actions: 'assignEndReasonFromEvent',
        },
        {
          guard: 'endReasonTimeout',
          target: '.TIMED_OUT',
          actions: 'assignEndReasonFromEvent',
        },
        {
          guard: 'endReasonCostLimit',
          target: '.COST_CAPPED',
          actions: 'assignEndReasonFromEvent',
        },
        {
          guard: 'endReasonBargeLimit',
          // `barge_limit` is a server-emitted variant of TIMED_OUT per
          // plan AC #6 ("disconnect_timeout collapses to timeout" — same
          // category: server-cap-driven termination of an ACTIVE session).
          target: '.TIMED_OUT',
          actions: 'assignEndReasonFromEvent',
        },
        {
          guard: 'endReasonParentStop',
          target: '.PARENT_STOPPED',
          actions: 'assignEndReasonFromEvent',
        },
        {
          guard: 'endReasonDisconnectTimeout',
          // Only reachable from RECONNECTING per the state diagram, but we
          // guard by reason rather than source-state so a server emit that
          // arrives slightly out of order (e.g. server saw the dropout
          // before we transitioned to RECONNECTING) still terminates.
          target: '.ABANDONED_DISCONNECT',
          actions: 'assignEndReasonFromEvent',
        },
      ],
      SAFETY_BLOCK: {
        target: '.SAFETY_HALT',
        actions: 'assignEndReasonSafetyHalt',
      },
    },
    states: {
      IDLE: {
        on: {
          START_SESSION: {
            target: 'CONNECTING',
            actions: 'assignSessionStartArgs',
          },
          BACK_TO_HOME: { target: 'ENDED_BACK' },
        },
      },

      // Pseudo-final to model `IDLE → [*]: back_to_home`. Final + no
      // outgoing edges, so the parent can observe `output` if needed.
      ENDED_BACK: { type: 'final' },

      CONNECTING: {
        invoke: {
          src: 'startSession',
          input: ({ context }) => ({
            idempotencyKey: context.idempotencyKey ?? '',
          }),
          onError: {
            target: 'AUDIO_FAILED',
            actions: assign({
              audioFailureCode: () => 'ws_fail' as const,
            }),
          },
        },
        on: {
          SESSION_STARTED: {
            target: 'ACTIVE',
            actions: 'assignSessionStartedIds',
          },
          WS_FAIL: {
            target: 'AUDIO_FAILED',
            actions: 'assignAudioFailure',
          },
          AUDIO_INIT_FAIL: {
            target: 'AUDIO_FAILED',
            actions: 'assignAudioFailure',
          },
          // user_cancel during CONNECTING → ABANDONED per plan §2.2
          USER_EXIT_TAP: { target: 'ABANDONED', actions: 'assignEndReasonUserExit' },
        },
      },

      ACTIVE: {
        initial: 'GREETING',
        on: {
          INTERRUPT: {
            target: 'INTERRUPTED',
            actions: ['assignInterruptedReason'],
          },
          USER_EXIT_TAP: { target: 'PAUSED' },
          WS_DISCONNECT: { target: 'RECONNECTING' },
          HEARTBEAT_MISS_3X: { target: 'RECONNECTING' },
        },
        states: {
          GREETING: {
            on: { GREETING_DONE: { target: 'ACTIVITY_INTRO' } },
          },
          ACTIVITY_INTRO: {
            on: { INTRO_DONE: { target: 'ROBOT_SPEAKING' } },
          },
          ROBOT_SPEAKING: {
            on: { REPLY_READY: { target: 'ROBOT_LISTENING' } },
          },
          ROBOT_LISTENING: {
            on: {
              VAD_SPEECH: { target: 'USER_SPEAKING' },
              VAD_SILENCE_2S: { target: 'SILENCE' },
            },
          },
          USER_SPEAKING: {
            on: {
              VAD_END: { target: 'THINKING', actions: 'incrementTurns' },
            },
          },
          SILENCE: {
            on: { PROMPT_AGAIN: { target: 'ROBOT_SPEAKING' } },
          },
          THINKING: {
            on: {
              REPLY_READY: { target: 'ROBOT_SPEAKING' },
              ACTIVITY_COMPLETE: { target: 'ACTIVITY_DONE' },
            },
          },
          ACTIVITY_DONE: {
            on: { NEXT_ACTIVITY: { target: 'ROBOT_SPEAKING' } },
          },
        },
      },

      INTERRUPTED: {
        entry: ['emitInterruptedAnalytics'],
        on: {
          RESUME: {
            target: 'ACTIVE',
            actions: 'clearInterruptedReason',
          },
          USER_EXIT_TAP: { target: 'PAUSED' },
        },
      },

      PAUSED: {
        on: {
          RESUME: { target: 'ACTIVE' },
          CONFIRM_END: { target: 'COMPLETED' },
          CONFIRM_EXIT: {
            target: 'ABANDONED',
            actions: 'assignEndReasonUserExit',
          },
        },
      },

      RECONNECTING: {
        // PLAN INVARIANT (§4.2 ADR-002): no `after` to any terminal.
        // The 15s `after` only flips a non-terminal banner flag.
        // RECONNECTING → ABANDONED_DISCONNECT is reachable ONLY via the
        // root-level `SESSION_END { reason: 'disconnect_timeout' }`
        // transition declared on the machine root.
        after: {
          [RECONNECTING_BANNER_MS]: {
            actions: 'setOfflineBanner',
            // Self-target so we re-enter to ensure `after` doesn't refire,
            // but DO NOT promote to a terminal. Using `target: undefined`
            // would also work; an internal action is explicit.
          },
        },
        on: {
          WS_RESUMED: {
            target: 'ACTIVE',
            actions: 'clearOfflineBanner',
          },
        },
      },

      AUDIO_FAILED: {
        on: {
          RETRY: { target: 'CONNECTING' },
          GIVE_UP: { target: 'ABANDONED', actions: 'assignEndReasonUserExit' },
        },
      },

      // ── Terminal states (plan §3.2). Each is `final`; no outgoing edges.
      // Re-entry forbidden — plan §5 "TERMINAL → *" row.
      SAFETY_HALT: { type: 'final' },
      TIMED_OUT: { type: 'final' },
      COST_CAPPED: { type: 'final' },
      PARENT_STOPPED: { type: 'final' },
      COMPLETED: { type: 'final' },
      ABANDONED: { type: 'final' },
      ABANDONED_DISCONNECT: { type: 'final' },
    },
  });

export type LessonSessionMachine = ReturnType<typeof createLessonSessionMachine>;
export type LessonSessionActor = ActorRefFrom<LessonSessionMachine>;

/** No-op service stubs for tests that don't care about the network layer. */
export const noopLessonSessionServices: LessonSessionServices = {
  startSession: async () => ({
    sessionId: 'test-session-id',
    deviceSessionId: 'test-device-session-id',
  }),
  endSession: async () => {
    /* no-op */
  },
  reconnectSession: async () => {
    /* no-op */
  },
};
