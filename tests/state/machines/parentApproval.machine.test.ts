import { createActor } from 'xstate';
import { parentApprovalMachine } from '../../../src/state/machines/parentApproval.machine';

function makeActor() {
  const actor = createActor(parentApprovalMachine);
  actor.start();
  return actor;
}

describe('ParentApproval machine', () => {
  // ── Happy path ────────────────────────────────────────────────────────
  describe('happy path', () => {
    it('LOCKED → GATE_PROMPT → AUTHENTICATED → VIEWING_DASHBOARD.SUMMARY', () => {
      const actor = makeActor();
      expect(actor.getSnapshot().value).toBe('LOCKED');

      actor.send({ type: 'TAP_PARENT_ICON' });
      expect(actor.getSnapshot().value).toBe('GATE_PROMPT');

      actor.send({
        type: 'PIN_OK',
        jti: 'jti-abc',
        expiresAt: '2026-05-11T01:00:00Z',
        idleUntil: '2026-05-11T00:35:00Z',
      });
      // AUTHENTICATED is an always-transition passthrough to VIEWING_DASHBOARD
      const snap = actor.getSnapshot();
      expect(snap.value).toEqual({ VIEWING_DASHBOARD: 'SUMMARY' });
      expect(snap.context.parentJti).toBe('jti-abc');
      expect(snap.context.sessionExpiresAt).toBe('2026-05-11T01:00:00Z');
      expect(snap.context.attemptCount).toBe(0);
    });
  });

  // ── PIN failure / lockout path ────────────────────────────────────────
  describe('5 wrong PINs → GATE_LOCKED_OUT', () => {
    it('tracks attempts across GATE_PROMPT ↔ GATE_RETRY and locks out on 5th', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_PARENT_ICON' });

      // Attempts 1-4: server returns 401 + attempts_remaining
      for (let remaining = 4; remaining >= 1; remaining--) {
        expect(actor.getSnapshot().value).toBe('GATE_PROMPT');
        actor.send({ type: 'PIN_WRONG', attemptsRemaining: remaining });
        expect(actor.getSnapshot().value).toBe('GATE_RETRY');
        expect(actor.getSnapshot().context.attemptCount).toBe(5 - remaining);
        actor.send({ type: 'TRY_AGAIN' });
      }

      // 5th attempt: server returns 423
      expect(actor.getSnapshot().value).toBe('GATE_PROMPT');
      actor.send({ type: 'LOCKOUT_TRIGGERED', lockedUntil: '2026-05-11T01:15:00Z' });
      expect(actor.getSnapshot().value).toBe('GATE_LOCKED_OUT');
      expect(actor.getSnapshot().context.lockoutClearedAt).toBe('2026-05-11T01:15:00Z');
      // parentJti must be null — lockout clears session
      expect(actor.getSnapshot().context.parentJti).toBeNull();
    });

    it('GATE_LOCKED_OUT → LOCKED only on LOCKOUT_CLEARED (never on client timer)', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_PARENT_ICON' });
      actor.send({ type: 'LOCKOUT_TRIGGERED', lockedUntil: '2026-05-11T01:15:00Z' });
      expect(actor.getSnapshot().value).toBe('GATE_LOCKED_OUT');

      // LOCKOUT_CLEARED is the only exit from GATE_LOCKED_OUT
      actor.send({ type: 'LOCKOUT_CLEARED' });
      expect(actor.getSnapshot().value).toBe('LOCKED');
      expect(actor.getSnapshot().context.attemptCount).toBe(0);
      expect(actor.getSnapshot().context.lockoutClearedAt).toBeNull();
    });

    it('GATE_LOCKED_OUT → AUTHENTICATED is forbidden', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_PARENT_ICON' });
      actor.send({ type: 'LOCKOUT_TRIGGERED', lockedUntil: '2026-05-11T01:15:00Z' });
      expect(actor.getSnapshot().value).toBe('GATE_LOCKED_OUT');

      // Attempt forbidden transition by sending PIN_OK — should be ignored
      actor.send({
        type: 'PIN_OK',
        jti: 'jti-bypass',
        expiresAt: '2026-05-11T01:00:00Z',
        idleUntil: '2026-05-11T00:35:00Z',
      });
      // Must remain in GATE_LOCKED_OUT
      expect(actor.getSnapshot().value).toBe('GATE_LOCKED_OUT');
    });
  });

  // ── Course approval sub-flow ──────────────────────────────────────────
  describe('course approval sub-flow', () => {
    function inDashboard() {
      const actor = makeActor();
      actor.send({ type: 'TAP_PARENT_ICON' });
      actor.send({
        type: 'PIN_OK',
        jti: 'jti-123',
        expiresAt: '2026-05-11T01:00:00Z',
        idleUntil: '2026-05-11T00:35:00Z',
      });
      return actor;
    }

    it('VIEWING_DASHBOARD → COURSE_APPROVAL_PENDING → VIEWING_DASHBOARD on confirm', () => {
      const actor = inDashboard();
      actor.send({ type: 'CROSS_DOMAIN_PURCHASE_REQUEST', approvalId: 'appr-1' });
      expect(actor.getSnapshot().value).toBe('COURSE_APPROVAL_PENDING');
      expect(actor.getSnapshot().context.pendingApprovalId).toBe('appr-1');

      actor.send({ type: 'CONFIRM_APPROVAL' });
      expect(typeof actor.getSnapshot().value).toBe('object'); // { VIEWING_DASHBOARD: ... }
      expect(actor.getSnapshot().context.pendingApprovalId).toBeNull();
    });

    it('VIEWING_DASHBOARD → COURSE_APPROVAL_PENDING → VIEWING_DASHBOARD on cancel', () => {
      const actor = inDashboard();
      actor.send({ type: 'CROSS_DOMAIN_PURCHASE_REQUEST', approvalId: 'appr-2' });
      expect(actor.getSnapshot().value).toBe('COURSE_APPROVAL_PENDING');

      actor.send({ type: 'CANCEL_APPROVAL' });
      expect(typeof actor.getSnapshot().value).toBe('object');
      expect(actor.getSnapshot().context.pendingApprovalId).toBeNull();
    });
  });

  // ── SESSION_EXPIRED — server-authoritative only ───────────────────────
  describe('SESSION_EXPIRED fires only on SERVER_401_PARENT', () => {
    it('SERVER_401_PARENT in VIEWING_DASHBOARD → SESSION_EXPIRED', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_PARENT_ICON' });
      actor.send({
        type: 'PIN_OK',
        jti: 'jti-expire',
        expiresAt: '2026-05-11T01:00:00Z',
        idleUntil: '2026-05-11T00:35:00Z',
      });
      expect(typeof actor.getSnapshot().value).toBe('object'); // VIEWING_DASHBOARD

      actor.send({ type: 'SERVER_401_PARENT' });
      expect(actor.getSnapshot().value).toBe('SESSION_EXPIRED');
      expect(actor.getSnapshot().context.parentJti).toBeNull();
    });

    it('machine stays in AUTHENTICATED/VIEWING_DASHBOARD without SERVER_401_PARENT (no client timer)', () => {
      // This test asserts that the machine has no `after:` transitions that
      // would fire SESSION_EXPIRED on a client timer.
      // We inspect the machine's state node config directly.
      const dashNode =
        parentApprovalMachine.states?.VIEWING_DASHBOARD;

      // There must be no `after` (delay) transitions on VIEWING_DASHBOARD
      const afterTransitions = dashNode?.after;
      expect(afterTransitions == null || Object.keys(afterTransitions).length === 0).toBe(true);

      // Also verify AUTHENTICATED has no after-transitions
      const authNode = parentApprovalMachine.states?.AUTHENTICATED;
      const authAfter = authNode?.after;
      expect(authAfter == null || Object.keys(authAfter).length === 0).toBe(true);
    });

    it('WARN_IDLE does not terminate the session', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_PARENT_ICON' });
      actor.send({
        type: 'PIN_OK',
        jti: 'jti-idle',
        expiresAt: '2026-05-11T01:00:00Z',
        idleUntil: '2026-05-11T00:35:00Z',
      });

      actor.send({ type: 'WARN_IDLE' });
      // Still in VIEWING_DASHBOARD — idleWarning is a UI flag, not a terminal
      expect(typeof actor.getSnapshot().value).toBe('object');
      expect(actor.getSnapshot().context.idleWarning).toBe(true);
    });

    it('SESSION_EXPIRED → GATE_PROMPT on RE_AUTH', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_PARENT_ICON' });
      actor.send({
        type: 'PIN_OK',
        jti: 'jti-re',
        expiresAt: '2026-05-11T01:00:00Z',
        idleUntil: '2026-05-11T00:35:00Z',
      });
      actor.send({ type: 'SERVER_401_PARENT' });
      expect(actor.getSnapshot().value).toBe('SESSION_EXPIRED');

      actor.send({ type: 'RE_AUTH' });
      expect(actor.getSnapshot().value).toBe('GATE_PROMPT');
    });
  });

  // ── SIGN_OUT terminal ─────────────────────────────────────────────────
  describe('SIGN_OUT → SIGNED_OUT terminal', () => {
    it('reaches SIGNED_OUT and machine is done', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_PARENT_ICON' });
      actor.send({
        type: 'PIN_OK',
        jti: 'jti-so',
        expiresAt: '2026-05-11T01:00:00Z',
        idleUntil: '2026-05-11T00:35:00Z',
      });
      actor.send({ type: 'SIGN_OUT' });
      expect(actor.getSnapshot().value).toBe('SIGNED_OUT');
      expect(actor.getSnapshot().status).toBe('done');
    });

    it('no transitions out of SIGNED_OUT', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_PARENT_ICON' });
      actor.send({
        type: 'PIN_OK',
        jti: 'jti-so2',
        expiresAt: '2026-05-11T01:00:00Z',
        idleUntil: '2026-05-11T00:35:00Z',
      });
      actor.send({ type: 'SIGN_OUT' });
      expect(actor.getSnapshot().value).toBe('SIGNED_OUT');

      // Sending any event from SIGNED_OUT must not change state
      actor.send({ type: 'TAP_PARENT_ICON' });
      expect(actor.getSnapshot().value).toBe('SIGNED_OUT');
    });
  });

  // ── Forbidden transitions ─────────────────────────────────────────────
  describe('invalid transitions forbidden', () => {
    it('LOCKED → AUTHENTICATED bypass is impossible (no PIN_OK in LOCKED)', () => {
      const actor = makeActor();
      expect(actor.getSnapshot().value).toBe('LOCKED');
      actor.send({
        type: 'PIN_OK',
        jti: 'bypass',
        expiresAt: '2026-05-11T01:00:00Z',
        idleUntil: '2026-05-11T00:35:00Z',
      });
      // Must remain LOCKED
      expect(actor.getSnapshot().value).toBe('LOCKED');
    });

    it('SESSION_EXPIRED → VIEWING_DASHBOARD without re-auth is impossible', () => {
      const actor = makeActor();
      actor.send({ type: 'TAP_PARENT_ICON' });
      actor.send({
        type: 'PIN_OK',
        jti: 'jti-expire2',
        expiresAt: '2026-05-11T01:00:00Z',
        idleUntil: '2026-05-11T00:35:00Z',
      });
      actor.send({ type: 'SERVER_401_PARENT' });
      expect(actor.getSnapshot().value).toBe('SESSION_EXPIRED');

      // Attempt to navigate without re-auth
      actor.send({ type: 'NAV_TAB', tab: 'TODAY' });
      expect(actor.getSnapshot().value).toBe('SESSION_EXPIRED');
    });
  });
});
