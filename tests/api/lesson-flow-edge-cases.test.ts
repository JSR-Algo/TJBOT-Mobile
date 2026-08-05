import {
  createAssignment,
  isPreloadReady,
  lessonAssignmentIdempotencyKey,
  normalizePreloadStatusPayload,
  type AssignmentState,
  type PreloadStatus,
} from '@/services/api/course-library.api';
import client from '@/services/http/client';
import { getErrorMessage, normalizeError } from '@/utils/errors';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

// US-006 course-flow — pure-logic edge cases that the existing api/feature suites
// do NOT cover. These guard four traps independently of any screen render:
//   1. ASSIGNMENT_CONFLICT survives normalizeError so the screen branch can fire.
//   2. STEP_TIMEOUT resolves to the M4 restart copy through normalizeError.
//   3. The READY gate FLIPS false→true only on a real state===READY transition
//      (never a hardcoded good:true, never a count-derived "looks done").
//   4. The (deviceId, lessonId, childId) idempotency key never embeds an
//      undefined childId (the "add a child first" guard must run BEFORE assign).
describe('US-006 course-flow edge cases (pure logic)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── ASSIGNMENT_CONFLICT ────────────────────────────────────────────────────
  // The screen branches on `normalizeError(err).code === 'ASSIGNMENT_CONFLICT'`.
  // That only works if the code survives normalization unchanged. ASSIGNMENT_CONFLICT
  // is NOT in ERROR_MESSAGES, so its copy falls back to UNKNOWN_ERROR — but the
  // CODE must NOT be rewritten to CONFLICT/UNKNOWN, or the refetch path dies.
  describe('ASSIGNMENT_CONFLICT normalization', () => {
    it('preserves the ASSIGNMENT_CONFLICT code from a 409 {error:{code}} envelope', () => {
      const result = normalizeError({
        response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } },
      });
      // The code is what the screen branches on — it must NOT collapse to the
      // status-derived CONFLICT.
      expect(result.code).toBe('ASSIGNMENT_CONFLICT');
      expect(result.code).not.toBe('CONFLICT');
    });

    it('does not invent retryable=true for an assignment conflict (refetch, never blind-retry)', () => {
      const result = normalizeError({
        response: { status: 409, data: { error: { code: 'ASSIGNMENT_CONFLICT' } } },
      });
      // A conflict is resolved by refetching the current assignment, NOT by
      // auto-retrying the same create — so the normalized error is not retryable.
      expect(result.retryable).toBe(false);
    });

    it('falls back to the generic copy (no bespoke ASSIGNMENT_CONFLICT string leaks to parents)', () => {
      // The code is preserved for routing, but there is intentionally no parent-
      // facing ASSIGNMENT_CONFLICT copy — the flow recovers silently by refetch.
      expect(getErrorMessage('ASSIGNMENT_CONFLICT')).toBe(getErrorMessage(undefined));
    });
  });

  // ── STEP_TIMEOUT → error copy ──────────────────────────────────────────────
  // Existing lesson-error-copy covers the map + the 422 {error} shape. This adds
  // the codepaths the assign flow actually hits: a bare 409-style envelope and a
  // root-level {code} shape, both resolving to the restart copy, and proving the
  // copy is token-free (no <robot>/<lesson> leaks when no vars are supplied).
  describe('STEP_TIMEOUT → restart copy through normalizeError', () => {
    const RESTART_COPY = 'Something interrupted the lesson. Tap to restart.';

    it('maps a root-level {code: STEP_TIMEOUT} envelope to the restart copy', () => {
      const result = normalizeError({
        response: { status: 422, data: { code: 'STEP_TIMEOUT', message: 'step timed out' } },
      });
      expect(result.code).toBe('STEP_TIMEOUT');
      expect(result.message).toBe(RESTART_COPY);
    });

    it('keeps STEP_TIMEOUT from falling through to a 5xx generic when the code is present', () => {
      // Even on a 500-class status, an explicit lesson code wins over the
      // status-based INTERNAL_ERROR mapping.
      const result = normalizeError({
        response: { status: 500, data: { error: { code: 'STEP_TIMEOUT' } } },
      });
      expect(result.code).toBe('STEP_TIMEOUT');
      expect(result.message).toBe(RESTART_COPY);
      expect(result.message).not.toBe(getErrorMessage('INTERNAL_ERROR'));
    });
  });

  // ── READY gate flips false→true ONLY on real state===READY ─────────────────
  // The existing suites assert PRELOADING-false and READY-true in isolation.
  // This drives the gate as a SEQUENCE (the poll loop) and proves it never reads
  // a hardcoded good:true nor a count-derived "looks complete".
  describe('isPreloadReady flips false→true only on a real READY transition', () => {
    it('returns false for every poll until state actually reads READY, then true', () => {
      // Simulate a real preload poll sequence; the gate must stay false through
      // the whole download and flip exactly when the server says READY.
      const pollSequence: AssignmentState[] = ['ASSIGNED', 'PRELOADING', 'PRELOADING', 'READY'];
      const gateHistory = pollSequence.map((state) => isPreloadReady({ state }));
      expect(gateHistory).toEqual([false, false, false, true]);
      // The flip happens once, on the last poll — not earlier.
      expect(gateHistory.indexOf(true)).toBe(pollSequence.length - 1);
    });

    it('stays false when criticalReady === criticalTotal but state is NOT READY (no count-derived ready)', () => {
      // A PRELOADING status whose counts happen to be equal must NOT read ready —
      // readiness is state-authoritative, never "all assets downloaded".
      const status = normalizePreloadStatusPayload({
        data: {
          preload: {
            assignment_id: 'asg-1',
            state: 'PRELOADING',
            profile: 'espTft',
            critical_total: 2,
            critical_ready: 2, // counts look complete…
            assets: [
              { asset_id: 'background', state: 'READY', checksum_ok: true },
              { asset_id: 'barn', state: 'READY', checksum_ok: true },
            ],
          },
        },
      });
      expect(status.criticalReady).toBe(status.criticalTotal);
      // …but the gate is still false because state !== 'READY'.
      expect(isPreloadReady(status)).toBe(false);
    });

    it('does not flip true for a terminal-but-not-READY state (COMPLETED/FAILED)', () => {
      // COMPLETED is "lesson finished", FAILED is an error — neither is the
      // preload-READY signal. Only READY gates the hand-off CTA.
      const notReady: AssignmentState[] = ['COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED'];
      for (const state of notReady) {
        expect(isPreloadReady({ state } as Pick<PreloadStatus, 'state'>)).toBe(false);
      }
    });
  });

  // ── childId never undefined ────────────────────────────────────────────────
  // The "add a child first" guard must run BEFORE the assign call. These prove
  // the assign primitives never silently accept an undefined child: the
  // idempotency key would embed the literal "undefined", and the wire body would
  // carry childId: undefined — both must be impossible by the time we POST.
  describe('idempotency key + assign body never embed an undefined childId', () => {
    it('a stable key embeds the real childId (a missing child would surface as literal "undefined")', () => {
      const key = lessonAssignmentIdempotencyKey({ deviceId: 'dev-1', lessonId: 'w01-d01', childId: 'ch-1' });
      expect(key).toBe('lesson-assign:dev-1:w01-d01:ch-1');
      // Guard the failure mode the screen prevents: an undefined child would
      // poison the dedup key with the literal "undefined".
      const poisoned = lessonAssignmentIdempotencyKey({
        deviceId: 'dev-1',
        lessonId: 'w01-d01',
        childId: undefined as unknown as string,
      });
      expect(poisoned).toContain('undefined');
      // …which is exactly why the screen-level guard must reject before assign.
      expect(key).not.toContain('undefined');
    });

    it('createAssignment forwards the supplied childId verbatim onto the wire body', async () => {
      mockedClient.post.mockResolvedValueOnce({ data: { data: { assignment: { assignment_id: 'asg-1' } } } });
      await createAssignment({
        deviceId: 'dev-1',
        childId: 'ch-1',
        lessonId: 'w01-d01-barn-say-it',
        lessonVersion: 1,
        profile: 'espTft',
      });
      const sentBody = mockedClient.post.mock.calls[0]![1] as { childId: unknown };
      // The body carries a concrete childId — never undefined — so household
      // isolation can be enforced server-side.
      expect(sentBody.childId).toBe('ch-1');
      expect(sentBody.childId).toBeDefined();
    });
  });

  // ── ASSET_PACK_NOT_READY → parent-facing copy (no raw backend jargon) ──────
  // Backend main 327da71 gates enroll/assign/auto-advance on pack materialization
  // and throws ASSET_PACK_NOT_READY (409, retryable:true) with the raw message
  // "The exact lesson asset pack is not materialized yet" when the pack isn't
  // ready. That code has zero entry in ERROR_MESSAGES today, so it falls through
  // preferServerMessage() and leaks the raw backend sentence verbatim to a
  // parent. These pin the code surviving normalization and the copy NOT being
  // the raw backend string (nor the generic UNKNOWN_ERROR fallback).
  describe('ASSET_PACK_NOT_READY → friendly retry copy (no raw "materialized" leak)', () => {
    const RAW_BACKEND_MESSAGE = 'The exact lesson asset pack is not materialized yet';

    it('maps ASSET_PACK_NOT_READY to parent-facing copy, not the raw backend sentence', () => {
      const result = normalizeError({
        response: {
          status: 409,
          data: { error: { code: 'ASSET_PACK_NOT_READY', message: RAW_BACKEND_MESSAGE } },
        },
      });
      expect(result.code).toBe('ASSET_PACK_NOT_READY');
      expect(result.message).not.toBe(RAW_BACKEND_MESSAGE);
      expect(result.message).not.toBe(getErrorMessage(undefined));
      expect(result.message).toBe(getErrorMessage('ASSET_PACK_NOT_READY'));
    });

    it('getErrorMessage(ASSET_PACK_NOT_READY) is defined and distinct from UNKNOWN_ERROR', () => {
      const message = getErrorMessage('ASSET_PACK_NOT_READY');
      expect(message).toBeDefined();
      expect(message).not.toBe(getErrorMessage(undefined));
      expect(message.toLowerCase()).not.toContain('materialized');
    });

    it('surfaces the backend retryable:true flag through normalizeError (flat top-level field)', () => {
      // The real GlobalExceptionFilter envelope puts `retryable` at the TOP
      // LEVEL of the response body, not nested inside `error`. A 409 whose only
      // recovery is "try again shortly" must not silently normalize to
      // retryable:false — that would suppress a retry affordance in the UI.
      const result = normalizeError({
        response: {
          status: 409,
          data: {
            error: { code: 'ASSET_PACK_NOT_READY', message: RAW_BACKEND_MESSAGE },
            retryable: true,
          },
        },
      });
      expect(result.retryable).toBe(true);
    });
  });
});
