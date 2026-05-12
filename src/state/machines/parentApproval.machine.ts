// ParentApproval XState v5 machine — plan §2.4 / §3.4 / §4.4 / §5 / §7
//
// Design invariants (plan §0 Principle 1, §4.4 Architect fix):
//   SESSION_EXPIRED fires ONLY on SERVER_401_PARENT event — never on a
//   client timer.  WARN_IDLE is a UI-only flag, not a state transition.
//   GATE_LOCKED_OUT → LOCKED only on LOCKOUT_CLEARED (server-driven).
//   GATE_LOCKED_OUT → AUTHENTICATED is a forbidden transition (plan §5).

import { setup, assign } from 'xstate';
import type {
  ParentApprovalContext,
  ParentApprovalEvent,
  DashboardSubState,
} from './parentApproval.types';

// ─── Service stubs — callers wire real implementations via input/actors ───────
// All endpoints per plan §4.4 / §8.4.

export const ParentApprovalServices = {
  /** POST /v1/parent/auth — bcrypt compare, rate-limited, resets counter on ok */
  authenticate: async (_args: { pin: string }): Promise<never> => {
    throw new Error('ParentApprovalServices.authenticate not implemented');
  },
  /** POST /v1/parent/lockout/clear — server-driven; only called on server push */
  clearLockout: async (_args: { userId: string }): Promise<never> => {
    throw new Error('ParentApprovalServices.clearLockout not implemented');
  },
  /** POST /v1/parent/approvals/{id}/decide — first decision wins (plan §7) */
  decideApproval: async (_args: { id: string; decision: 'confirm' | 'cancel' }): Promise<never> => {
    throw new Error('ParentApprovalServices.decideApproval not implemented');
  },
  /** POST /v1/auth/logout — clears auth tokens */
  signOut: async (): Promise<never> => {
    throw new Error('ParentApprovalServices.signOut not implemented');
  },
};

// ─── Machine ─────────────────────────────────────────────────────────────────

const INITIAL_CONTEXT: ParentApprovalContext = {
  attemptCount: 0,
  parentJti: null,
  sessionExpiresAt: null,
  idleUntil: null,
  lockoutClearedAt: null,
  pendingApprovalId: null,
  dashboardTab: 'SUMMARY',
  idleWarning: false,
};

export const parentApprovalMachine = setup({
  types: {
    context: {} as ParentApprovalContext,
    events: {} as ParentApprovalEvent,
  },
  actions: {
    storeSession: assign((_ctx, params: { jti: string; expiresAt: string; idleUntil: string }) => ({
      parentJti: params.jti,
      sessionExpiresAt: params.expiresAt,
      idleUntil: params.idleUntil,
      attemptCount: 0,
      idleWarning: false,
    })),
    incrementAttempts: assign(
      (_ctx, params: { attemptsRemaining: number }) => ({
        // Server is authoritative; we mirror for UI display.
        // 5 total attempts → first failure = 4 remaining, etc.
        attemptCount: 5 - params.attemptsRemaining,
      }),
    ),
    storeLockout: assign((_ctx, params: { lockedUntil: string }) => ({
      lockoutClearedAt: params.lockedUntil,
    })),
    clearSession: assign(() => ({
      parentJti: null,
      sessionExpiresAt: null,
      idleUntil: null,
      idleWarning: false,
    })),
    clearLockout: assign(() => ({
      lockoutClearedAt: null,
      attemptCount: 0,
    })),
    storePendingApproval: assign((_ctx, params: { approvalId: string }) => ({
      pendingApprovalId: params.approvalId,
    })),
    clearPendingApproval: assign(() => ({
      pendingApprovalId: null,
    })),
    setDashboardTab: assign((_ctx, params: { tab: DashboardSubState }) => ({
      dashboardTab: params.tab,
    })),
    setIdleWarning: assign(() => ({ idleWarning: true })),
    clearIdleWarning: assign(() => ({ idleWarning: false })),
  },
}).createMachine({
  id: 'parentApproval',
  context: INITIAL_CONTEXT,
  initial: 'LOCKED',
  states: {
    // ── Default child mode — no parent JWT in scope ──────────────────────
    LOCKED: {
      on: {
        TAP_PARENT_ICON: { target: 'GATE_PROMPT' },
      },
    },

    // ── PIN entry ────────────────────────────────────────────────────────
    // POST /v1/parent/auth (audit row written per §8.4)
    GATE_PROMPT: {
      on: {
        PIN_OK: {
          target: 'AUTHENTICATED',
          actions: {
            type: 'storeSession',
            params: ({ event }) => ({
              jti: event.jti,
              expiresAt: event.expiresAt,
              idleUntil: event.idleUntil,
            }),
          },
        },
        PIN_WRONG: {
          target: 'GATE_RETRY',
          actions: {
            type: 'incrementAttempts',
            params: ({ event }) => ({ attemptsRemaining: event.attemptsRemaining }),
          },
        },
        // Server returns 423 — 5th failure arrives directly to GATE_PROMPT
        // (server increments before responding; plan §4.4)
        LOCKOUT_TRIGGERED: {
          target: 'GATE_LOCKED_OUT',
          actions: {
            type: 'storeLockout',
            params: ({ event }) => ({ lockedUntil: event.lockedUntil }),
          },
        },
        CANCEL: { target: 'LOCKED' },
      },
    },

    // ── Between failed PIN attempts (UI shows "wrong PIN, try again") ────
    GATE_RETRY: {
      on: {
        TRY_AGAIN: { target: 'GATE_PROMPT' },
        // Also accept LOCKOUT_TRIGGERED here (race: server 423 arrives while
        // in retry UI)
        LOCKOUT_TRIGGERED: {
          target: 'GATE_LOCKED_OUT',
          actions: {
            type: 'storeLockout',
            params: ({ event }) => ({ lockedUntil: event.lockedUntil }),
          },
        },
      },
    },

    // ── 5 failures; 15-min cooldown or primary-parent unlock ─────────────
    // plan §5: GATE_LOCKED_OUT → AUTHENTICATED is FORBIDDEN.
    // Only LOCKOUT_CLEARED (server event) unblocks this state.
    // No client timer transition.
    GATE_LOCKED_OUT: {
      entry: { type: 'clearSession' },
      on: {
        LOCKOUT_CLEARED: {
          target: 'LOCKED',
          actions: { type: 'clearLockout' },
        },
      },
    },

    // ── Parent JWT active — routes to dashboard ──────────────────────────
    AUTHENTICATED: {
      always: { target: 'VIEWING_DASHBOARD' },
    },

    // ── Composite dashboard ───────────────────────────────────────────────
    VIEWING_DASHBOARD: {
      initial: 'SUMMARY',
      entry: { type: 'clearIdleWarning' },
      states: {
        SUMMARY: {},
        TODAY: {},
        HISTORY: {},
        SAFETY: {},
        SETTINGS: {},
      },
      on: {
        NAV_TAB: {
          actions: {
            type: 'setDashboardTab',
            params: ({ event }) => ({ tab: event.tab }),
          },
          target: 'VIEWING_DASHBOARD',
          internal: true,
        },
        CROSS_DOMAIN_PURCHASE_REQUEST: {
          target: 'COURSE_APPROVAL_PENDING',
          actions: {
            type: 'storePendingApproval',
            params: ({ event }) => ({ approvalId: event.approvalId }),
          },
        },
        // SERVER_401_PARENT: the ONLY event that leads to SESSION_EXPIRED.
        // plan §4.4 Architect fix: no `after:` timer here.
        SERVER_401_PARENT: {
          target: 'SESSION_EXPIRED',
          actions: { type: 'clearSession' },
        },
        WARN_IDLE: {
          // UI-only — does NOT terminate session (plan §4.4)
          actions: { type: 'setIdleWarning' },
        },
        TAP_EXIT: { target: 'LOCKED', actions: { type: 'clearSession' } },
        SIGN_OUT: { target: 'SIGNED_OUT', actions: { type: 'clearSession' } },
      },
    },

    // ── Cross-domain purchase confirm sheet ───────────────────────────────
    // POST /v1/parent/approvals/{id}/decide (first decision wins, plan §7)
    COURSE_APPROVAL_PENDING: {
      on: {
        CONFIRM_APPROVAL: {
          target: 'VIEWING_DASHBOARD',
          actions: { type: 'clearPendingApproval' },
        },
        CANCEL_APPROVAL: {
          target: 'VIEWING_DASHBOARD',
          actions: { type: 'clearPendingApproval' },
        },
        // Server 401 can arrive during pending approval too
        SERVER_401_PARENT: {
          target: 'SESSION_EXPIRED',
          actions: [{ type: 'clearSession' }, { type: 'clearPendingApproval' }],
        },
      },
    },

    // ── Session expired — re-auth required ────────────────────────────────
    // Entered ONLY via SERVER_401_PARENT (plan §4.4, Architect fix).
    // No after-timer transition from AUTHENTICATED or VIEWING_DASHBOARD.
    SESSION_EXPIRED: {
      on: {
        RE_AUTH: { target: 'GATE_PROMPT' },
      },
    },

    // ── Terminal — clears auth tokens, routes to Onboarding.LOGIN ────────
    SIGNED_OUT: {
      type: 'final',
    },
  },
});
