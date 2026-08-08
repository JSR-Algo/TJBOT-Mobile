// ───────────────────────────────────────────────────────────────────────────
// Backend error codes with no mobile handler — the error-code half of the T5.2
// contract sync (F-T54-10).
//
// Sibling of `undocumented-api-routes.ts`. That file answers "may mobile call
// this route?"; this one answers "can mobile understand what the route says when
// it fails?". Both are enforced by `npm run api:contract-sync:check`.
//
// WHY THIS EXISTS
// The onboarding save-child failure that motivated it was pure contract drift:
// the backend threw `MAX_CHILDREN_REACHED` (one occurrence), the client tested
// for `MAX_CHILD_LIMIT_REACHED` (one occurrence), the two could never match, and
// the real 409 fell through to "Check your connection and try again" on a working
// network. Nothing failed — no test, no type, no gate — because a string literal
// on one side and a string literal on the other are not connected by anything.
// The same drift hid six of eight provisioning codes.
//
// HOW THE GATE READS THIS
// The checker scans the backend onboarding/pairing services for every code they
// can throw, then scans mobile `src/` for each code appearing either as a quoted
// literal (`Set` member, `code === 'X'`) or as an object key (an ERROR_MESSAGES /
// PAIRING_FINALIZE_MESSAGES entry). A backend code that appears in neither must
// have a row here, or the gate fails.
//
// WHAT A ROW DOES AND DOES NOT MEAN
// A row asserts only that a parent on the onboarding/pairing path cannot
// meaningfully act on this code, so the generic code-carrying copy is the right
// outcome. It never licenses a "check your connection" message: that copy is
// reserved for genuine transport failures and is wrong for every code here,
// because every code here means the server answered.
//
// ANTI-ROT
// The checker also fails when a row names a code the backend no longer throws
// (delete the row) or a code mobile now handles (delete the row). That is what
// stops this file outliving its reasons, exactly as with the route registry.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Why a backend error code has no bespoke mobile copy.
 *
 * - `not-parent-facing` — the code can only arise on a surface a parent never
 *   drives (factory registration, internal bootstrap-token minting,
 *   admin/household administration). It cannot appear during onboarding.
 * - `generic-copy-sufficient` — a parent CAN reach it, but there is no action
 *   specific to this code beyond retry/contact-support, which the generic
 *   code-carrying message already gives them.
 */
export type UnhandledErrorCodeReason = 'not-parent-facing' | 'generic-copy-sufficient';

export type UnhandledErrorCode = {
  /** The code exactly as the backend puts it on the wire. */
  readonly code: string;
  /** Backend source that throws it, relative to `tbot-backend/src/`. */
  readonly thrownBy: string;
  readonly reason: UnhandledErrorCodeReason;
  /** One sentence stating the backend-side fact that justifies the row. */
  readonly justification: string;
};

export const UNHANDLED_ERROR_CODES = [
  // ── household administration — not reachable from onboarding ──────────────
  // These live on invite/membership screens that exist only after onboarding
  // completes, and are driven from ParentSettings, not the pairing flow.
  {
    code: 'INVITATION_NOT_FOUND',
    thrownBy: 'identity/household.service.ts',
    reason: 'not-parent-facing',
    justification: 'Thrown only by acceptInvitation, which is reachable from the household-invite deep link and never from the onboarding stack.',
  },
  {
    code: 'INVITATION_NOT_PENDING',
    thrownBy: 'identity/household.service.ts',
    reason: 'not-parent-facing',
    justification: 'Same acceptInvitation path as INVITATION_NOT_FOUND; onboarding never accepts an invitation.',
  },
  {
    code: 'INVITATION_RECIPIENT_MISMATCH',
    thrownBy: 'identity/household.service.ts',
    reason: 'not-parent-facing',
    justification: 'Same acceptInvitation path; requires an invite addressed to a different email, which onboarding cannot produce.',
  },
  {
    code: 'INVITE_EXPIRED_7D',
    thrownBy: 'identity/household.service.ts',
    reason: 'not-parent-facing',
    justification: 'Same acceptInvitation path; the 7-day invite TTL has no onboarding equivalent.',
  },
  {
    code: 'MEMBER_NOT_FOUND',
    thrownBy: 'identity/household.service.ts',
    reason: 'not-parent-facing',
    justification: 'Thrown by removeMember/updateMemberRole, both of which are household-management screens outside the onboarding stack.',
  },
  {
    code: 'NOT_PRIMARY_PARENT_ROLE',
    thrownBy: 'identity/household.service.ts',
    reason: 'not-parent-facing',
    justification: 'Role guard on household administration; onboarding creates the household and its caller is always the primary parent.',
  },
  {
    code: 'OWNER_CANNOT_LEAVE',
    thrownBy: 'identity/household.service.ts',
    reason: 'not-parent-facing',
    justification: 'Thrown by leaveHousehold, which has no entry point inside onboarding.',
  },
  {
    code: 'INVALID_DISPLAY_NAME',
    thrownBy: 'identity/household.service.ts',
    reason: 'not-parent-facing',
    justification: 'Thrown by updateMemberDisplayName on the household-members screen; the onboarding child form validates its own name field client-side.',
  },
  {
    code: 'CONSENT_NOT_OWNED',
    thrownBy: 'identity/coppa-consent.service.ts',
    reason: 'not-parent-facing',
    justification: 'Thrown only by consent revoke, which is a privacy-settings action; onboarding records consent and never revokes it.',
  },
  {
    code: 'NOT_FOUND',
    thrownBy: 'identity/coppa-consent.service.ts',
    reason: 'not-parent-facing',
    justification: 'Thrown only by consent revoke for an unknown consent id; onboarding holds the id it just created.',
  },

  // ── factory / device registry — not on the parent path ────────────────────
  {
    code: 'DEVICE_ALREADY_REGISTERED',
    thrownBy: 'devices/devices.service.ts',
    reason: 'not-parent-facing',
    justification: 'Thrown by factory registration (POST /v1/devices/register), which is authenticated by factory credentials and never called by the app.',
  },
  {
    code: 'INVALID_HARDWARE_REVISION',
    thrownBy: 'devices/devices.service.ts',
    reason: 'not-parent-facing',
    justification: 'Same factory-registration path; the hardware revision is supplied by the factory tool, not the phone.',
  },
  {
    code: 'DEVICE_NOT_CLAIMED',
    thrownBy: 'devices/devices.service.ts',
    reason: 'not-parent-facing',
    justification: 'Thrown by deregister and by heartbeat rejection; deregistering is a device-management action and heartbeats come from the robot, not the app.',
  },
  {
    code: 'DEVICE_NOT_OWNED',
    thrownBy: 'devices/devices.service.ts',
    reason: 'not-parent-facing',
    justification: 'Ownership guard on deregister/factory-reset, which are device-management actions outside onboarding.',
  },
  {
    code: 'DEVICE_OWNERSHIP_CHANGED',
    thrownBy: 'devices/devices.service.ts',
    reason: 'not-parent-facing',
    justification: 'Concurrency guard inside deregister only; onboarding never deregisters.',
  },

  // ── internal bootstrap-token minting — robot/server-to-server ─────────────
  // finalizeDevicePairing does call mintBootstrapToken, but only inside the
  // local-BLE handoff recovery, whose failures are swallowed on purpose so the
  // bounded device-auth poll continues. These codes therefore never reach copy.
  {
    code: 'ATTEMPT_NOT_READY_FOR_MINT',
    thrownBy: 'devices/bootstrap-token.service.ts',
    reason: 'not-parent-facing',
    justification: 'Mint-time state guard; the only mobile caller is the local-handoff recovery in finalizeDevicePairing, which catches and discards its failures.',
  },
  {
    code: 'PROVISIONING_ATTEMPT_NOT_MINTABLE',
    thrownBy: 'devices/bootstrap-token.service.ts',
    reason: 'not-parent-facing',
    justification: 'Same mint path and same swallowing caller as ATTEMPT_NOT_READY_FOR_MINT.',
  },
  {
    code: 'BOOTSTRAP_TOKEN_SCOPE_MISMATCH',
    thrownBy: 'devices/claim.service.ts',
    reason: 'not-parent-facing',
    justification: 'Validates a bootstrap token presented by the robot firmware; the phone never presents one on the claim path.',
  },
  {
    code: 'BOOTSTRAP_TOKEN_RACE',
    thrownBy: 'devices/claim.service.ts',
    reason: 'not-parent-facing',
    justification: 'Server-side concurrency guard between two firmware bootstrap redemptions; no mobile caller can observe it.',
  },
  {
    code: 'MAC_IN_USE',
    thrownBy: 'devices/claim.service.ts',
    reason: 'not-parent-facing',
    justification: 'Raised when firmware reports a MAC already bound to another device row; the report comes from the robot, not the app.',
  },

  // ── reachable, but no code-specific action exists ─────────────────────────
  {
    code: 'DEVICE_SECRET_ALREADY_ISSUED',
    thrownBy: 'devices/claim.service.ts',
    reason: 'generic-copy-sufficient',
    justification: 'Means the robot already holds its device secret, so the claim is effectively done; finalizeDevicePairing already treats the already-finalized family as idempotent success and returns before any copy is chosen.',
  },
] as const satisfies readonly UnhandledErrorCode[];

export function findUnhandledErrorCode(code: string): UnhandledErrorCode | undefined {
  return UNHANDLED_ERROR_CODES.find((row) => row.code === code);
}
