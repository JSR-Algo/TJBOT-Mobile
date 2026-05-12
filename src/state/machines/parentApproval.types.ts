// ParentApproval machine types — plan §2.4 / §3.4 / §4.4

export type ParentApprovalState =
  | 'LOCKED'
  | 'GATE_PROMPT'
  | 'GATE_RETRY'
  | 'GATE_LOCKED_OUT'
  | 'AUTHENTICATED'
  | 'VIEWING_DASHBOARD'
  | 'COURSE_APPROVAL_PENDING'
  | 'SESSION_EXPIRED'
  | 'SIGNED_OUT';

export type DashboardSubState = 'SUMMARY' | 'TODAY' | 'HISTORY' | 'SAFETY' | 'SETTINGS';

export interface ParentApprovalContext {
  /** Mirror of server-side attempt counter — UI only, server is authoritative */
  attemptCount: number;
  /** JWT `jti` from POST /v1/parent/auth — required on every privileged call */
  parentJti: string | null;
  /** ISO timestamp from parent_sessions.expires_at */
  sessionExpiresAt: string | null;
  /** ISO timestamp: client idle expiry hint (server is authoritative) */
  idleUntil: string | null;
  /** ISO timestamp when lockout cleared (for UI countdown display) */
  lockoutClearedAt: string | null;
  /** Pending approval id for COURSE_APPROVAL_PENDING */
  pendingApprovalId: string | null;
  /** Current dashboard sub-tab */
  dashboardTab: DashboardSubState;
  /** UI-only idle warning flag — does NOT trigger session expiry */
  idleWarning: boolean;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type ParentApprovalEvent =
  /** User taps parent icon from child mode */
  | { type: 'TAP_PARENT_ICON' }
  /** User submits PIN — server responds via PIN_OK or PIN_WRONG */
  | { type: 'SUBMIT_PIN'; pin: string }
  /** Server returned 200 from POST /v1/parent/auth */
  | { type: 'PIN_OK'; jti: string; expiresAt: string; idleUntil: string }
  /** Server returned 401 from POST /v1/parent/auth; attempts_remaining > 0 */
  | { type: 'PIN_WRONG'; attemptsRemaining: number }
  /** Server returned 423 — lockout triggered (attempts exhausted) */
  | { type: 'LOCKOUT_TRIGGERED'; lockedUntil: string }
  /** Server-driven: lockout cleared (cooldown elapsed or primary parent unlock)
   *  POST /v1/parent/lockout/clear confirmed */
  | { type: 'LOCKOUT_CLEARED' }
  /** User taps "try again" from GATE_RETRY */
  | { type: 'TRY_AGAIN' }
  /** User cancels gate prompt — returns to LOCKED */
  | { type: 'CANCEL' }
  /** User taps exit icon from dashboard */
  | { type: 'TAP_EXIT' }
  /** Cross-domain purchase/approval request event */
  | { type: 'CROSS_DOMAIN_PURCHASE_REQUEST'; approvalId: string }
  /** User confirms course approval */
  | { type: 'CONFIRM_APPROVAL' }
  /** User cancels course approval */
  | { type: 'CANCEL_APPROVAL' }
  /** Server returns 401 on a privileged parent endpoint — session expired.
   *  This is the ONLY trigger for SESSION_EXPIRED (plan §4.4, §0 Principle 1).
   *  No client timer leads to this event. */
  | { type: 'SERVER_401_PARENT' }
  /** Client idle warning — flips idleWarning flag only, does NOT expire session */
  | { type: 'WARN_IDLE' }
  /** User taps re-auth from SESSION_EXPIRED */
  | { type: 'RE_AUTH' }
  /** User taps sign out */
  | { type: 'SIGN_OUT' }
  /** Dashboard tab navigation */
  | { type: 'NAV_TAB'; tab: DashboardSubState };
