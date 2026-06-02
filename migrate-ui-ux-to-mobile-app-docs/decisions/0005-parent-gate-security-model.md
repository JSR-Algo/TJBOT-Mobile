# 0005 Parent-Gate Security Model

Date: 2026-05-12

## Status

Accepted

> **Numbering note:** `docs/decisions/0005` is distinct from `docs/usecases/ADR-0005-usecase-model-structure.md` (different ADR namespaces). The usecases-tree ADR is locally scoped to use-case authoring; this ADR is repo-wide and governs every parent-gated surface.

## Context

The current prototype implements parent gating as **two independent client-side speed bumps**:

- `src/features/parent/screens/ParentGateScreen.tsx` — generates a random 3-digit number on mount; auto-advances to `ParentSummaryScreen` when the user types it. No server call. Source line 13: `const [target] = React.useState(() => 100 + Math.floor(Math.random() * 900));`.
- `src/features/course-library/UnlockConfirmModal.tsx` — hardcodes the 4-digit string `7351` (line 14). Used as the "confirm purchase" sanity check before sending a course to the robot.

Neither produces an audit record, neither emits a server event, neither establishes a session role. The on-screen disclaimer in `ParentGateScreen.tsx` line 59 is explicit: "This is a speed bump, not a password."

This model collides with multiple downstream concerns surfaced by the 2026-05-12 readiness audit and the 2026-05-11 state-machine audit:

- **COPPA exposure.** Anything labelled "parent confirmed" today is unverifiable server-side. Consent records, controls updates, and any sensitive view (purchase, child profile edit, safety override) cannot legally rely on the gate's claim.
- **Audit-trail absence.** `parent_auth_attempts` and `parent_lockouts` tables already designed in `state-machines-mobile-ux.md` §8.4 have no client to write into. The whole ParentApproval state machine in §2.4 (LOCKED → GATE_PROMPT → GATE_RETRY → GATE_LOCKED_OUT → AUTHENTICATED) is unwired.
- **Backend role enforcement gap.** Future `controls-update`, `subscription-cancel`, `child-profile-delete`, and `safety-override` endpoints have no way to distinguish a parent-issued request from a child-issued request — the same JWT covers both.
- **Sequence allow-list shows no `parent-gate-validate` flow** — the audit flagged this as a blocking gap before any sensitive mobile endpoint can ship safely.

The state-machine plan already specifies the server-validated design (bcrypt `parent_pins`, sliding-window rate limit, lockout cooldown, JWT with `jti` revocation, 4-step server order documented in C6). The choice in front of us is **whether to commit to that design now** or defer with client-only + per-endpoint workarounds.

## Decision

**Adopt server-validated parent PIN as the canonical parent-gate model — `state-machines-mobile-ux.md` §2.4 ParentApproval becomes the authoritative implementation contract.**

Concrete commitments:

| # | Commitment |
|---|---|
| D1 | The parent gate is a **real role check**, not a UX speed bump. Every `parent_*` route entry MUST hold a valid `parent_session` JWT (`jti` present in `parent_sessions`, not expired, not revoked). |
| D2 | PIN storage uses `parent_pins(user_id UUID PK, bcrypt_hash TEXT NOT NULL, failed_since TIMESTAMPTZ NULL, updated_at TIMESTAMPTZ NOT NULL)` per `state-machines-mobile-ux.md` §8.4. |
| D3 | Server auth order (§4.4 GATE_PROMPT→AUTHENTICATED, C6): (1) Redis token-bucket per `(user_id, ip_hash)` 10 attempts / 5 min → 429 without writing an attempt row; (2) lockout pre-check on `parent_lockouts.locked_until > now()` → 423; (3) bcrypt compare; (4) `parent_auth_attempts` row. |
| D4 | Lockout: 5 failed attempts within sliding window → `parent_lockouts.locked_until = now() + interval '15 min'`. Cleared via `POST /v1/parent/lockout/clear` (primary-parent-only action). |
| D5 | `parent_sessions` JWT carries `idle_until` (15 min sliding) and absolute `expires_at` (24 h). Idle re-prompt on any sensitive action; absolute expiry forces re-PIN regardless of activity. |
| D6 | Sensitive actions (purchase, controls-update, child-profile edit, safety override, subscription mutation, account delete) require **a fresh parent JWT within the last 60 s** — re-prompt on stale even when idle window is alive. |
| D7 | `UnlockConfirmModal.tsx` hardcoded `7351` is **removed** before commerce backend lands. Replaced with `POST /v1/parent/approvals` (kind=`course_unlock`) which creates a PENDING `parent_approvals` row that the parent decides via PIN-gated dashboard tile. |
| D8 | A new mobile-surface sequence `docs/sequences/07-parent/parent-gate-validate.sequence.mmd` documents the `POST /v1/parent/auth` flow end-to-end (ParentApp → Gateway → IdentityService → PostgreSQL with audit insert). |
| D9 | Use-case `UC-PR01 Authenticate Parent` (already exists in `parent-gate/use-cases.md`) is **promoted from speed-bump to RBAC use case**: actor = `Parent`, primary success records a `parent_auth_attempts` row + issues a `parent_sessions` JWT, primary failure increments lockout counter. |
| D10 | The parent-gate prototype UI (random 3-digit) is **retained as a development scaffold** — UI-only mode flagged via `__USE_SERVER_PIN__` env; production builds always go through server validation. |

## Drivers

In priority order:

1. **COPPA-grade child safety.** Anything that ships to families with under-13 users must have a defensible parent-identity boundary. A "speed bump" disclaimer in production source code is unacceptable to legal.
2. **Audit-trail completeness.** Every sensitive write must be attributable to a parent identity event. The full `parent_auth_attempts → parent_sessions → action` chain is the canonical audit path.
3. **Backend symmetry.** The state-machine plan §2.4 has already designed for server-validation; client-only would force the backend to re-design every sensitive endpoint with bespoke per-endpoint checkpoints.
4. **Single source of truth for parent identity.** One server-validated session beats N client-side speed bumps for testability and incident-response (one revocation cancels all parent power).
5. **Forward compatibility with biometric / push-approval upgrades.** A real PIN field can later be augmented with FaceID / Android BiometricPrompt + parent-app-push-approval. A speed bump cannot evolve cleanly.

## Alternatives Considered

1. **Client-only speed bump + per-endpoint server checkpoint.** REJECTED. Every sensitive endpoint (estimated 12–18 routes across purchase, controls, child-profile, safety, subscription, account-delete, push-prefs, consent-revoke) would need a bespoke re-auth challenge (biometric / 3DS / fresh-token). Total surface area for review and pen-test is larger than one PIN flow. Worse: child-on-device threat model collapses (child taps "decline biometric" → endpoint still gets a token-bearing call from the kid's session).

2. **Hybrid: speed bump for nav, server PIN for writes.** REJECTED. Two parallel parent-identity affordances confuse users ("which PIN screen?") and audit log ("which click counted?"). The state-machine plan §2.4 also doesn't natively support a two-tier model — would require either widening `parent_session` JWT or adding a second `parent_write_session` JWT. Net complexity > D1's "one PIN, one JWT".

3. **OS biometric only (FaceID / TouchID / BiometricPrompt).** REJECTED as the primary mechanism. Biometric is a great second factor and a great UX accelerator, but: (a) shared family devices undermine "this is parent's biometric"; (b) recovery flow when biometric fails still requires a PIN; (c) Android `BiometricPrompt` is not a server-verifiable assertion. Will revisit as **D6 enhancement** — store biometric-unlock locally to cache the PIN entry for the JWT idle window.

4. **Push-approval to a parent's other device.** REJECTED for now. Pushing approval requests to a logged-in second device is a 2027 feature once a real multi-device session inventory exists. Adds asynchrony and a network-dependent failure mode to every parent action.

5. **Defer the decision; ship the speed bump.** REJECTED. The audit explicitly tagged parent-gate as **NEEDS MAJOR REWORK** with a Critical security severity. Backend cannot land sensitive endpoints safely without this contract; deferring means deferring the entire commerce + controls slice.

## Consequences

### Positive

- **Backend can land all parent-write endpoints with a single auth check** (`require_parent_jwt` middleware) instead of per-route bespoke logic.
- **Audit log is automatic.** Every `parent_auth_attempts` row + every action with the `parent_session.jti` claim creates a tamper-evident chain.
- **COPPA review is straightforward.** "How does the system know the actor is a parent?" → answer: PIN, bcrypt-stored, rate-limited, lockout-enforced, JWT-signed, revocable.
- **State machine plan §2.4 stops being design-only.** Wiring the UX to the documented FSM closes audit anomaly AN-14 and unblocks ParentApproval as a real entity.
- **`UC_LOCKED_OUT_SCREEN` (one of the 6 audit-flagged unreachable states) gains a real backing event.** Wiring the `parent_locked_out` screen in `parent/index.js` becomes a concrete P3.B task.
- **`UnlockConfirmModal` hardcoded `7351` is removed** — closes audit anomaly AN-14 second sub-issue.

### Negative

- **PIN-entry UX cost.** Parents will hit a PIN entry on first parent-area entry per session + on every sensitive action older than 60 s. Mitigated by D6 biometric-cache enhancement (Phase 2).
- **PIN recovery flow needed.** "Forgot PIN" must be designed (email magic link, or knowledge-based, or device-reset). Tracked as follow-up P5 task.
- **Single point of UX failure.** If the PIN flow has a UX bug, all parent actions are blocked. Mitigated by D10 (development scaffold mode) and rigorous integration testing.
- **State machine `GATE_LOCKED_OUT → AUTHENTICATED` 15-min cooldown** locks parents out of their own dashboard during incidents. Mitigated by D4 (primary-parent reset action) but requires a "primary parent" notion not yet modeled.
- **Multi-parent households** (two adults sharing one account) need either a shared PIN or per-parent PIN — out of scope for v1, but design must not preclude per-parent PINs later.

### Neutral

- Existing prototype screens (`ParentGateScreen.tsx`, `UnlockConfirmModal.tsx`) need rewrite, not deletion. The bones (numeric input, lock icon, disclaimer text) carry over; backing logic changes.
- `docs/sequences/07-parent/` gains one new file (`parent-gate-validate.sequence.mmd`); use-case `UC-PR01` body changes type from "UI speed bump" to "RBAC authentication".

## Implementation Pointers (informational, not part of the ADR commitment)

| Layer | Change |
|---|---|
| `state-machines-mobile-ux.md` | No new design — §2.4 + §4.4 + §8.4 already encode D1–D6. Add a single forward-link from §2.4 intro to "Authoritative ADR: `docs/decisions/0005`". |
| `src/store/auth.store.js` + new `src/store/parent.store.js` | Add `parentSession: { jti, idle_until, expires_at } | null` and `parent.authenticate(pin) → promise`, `parent.logout()`. Subscribe to refresh events. |
| `src/features/parent/screens/ParentGateScreen.tsx` | Replace random 3-digit logic with PIN input + server call. Add lockout / try-again states matched to FSM. |
| `src/features/course-library/UnlockConfirmModal.tsx` | Replace `7351` match with `POST /v1/parent/approvals` (kind=`course_unlock`) pending-state UX. |
| `src/services/api/parent.api.js` | Stub the four endpoints in D3/D7 (rename existing stubs if needed). |
| `docs/sequences/07-parent/parent-gate-validate.sequence.mmd` | New file, surface=`mobile`, actors=`ParentApp Gateway IdentityService PostgreSQL`. |
| `docs/usecases/domains/parent-gate/use-cases.md` | Promote UC-PR01 from speed-bump to RBAC. Update trigger, postconditions, actor capabilities. |

## Verification

After implementation (P3.B + later):

- `state-machines-mobile-ux.md` §2.4 unit tests cover all 5 transitions including lockout edge.
- Integration test: 5-attempt brute force → 6th attempt returns 423 with `Retry-After` header.
- Integration test: stale parent JWT (60 s + 1 ms) on `POST /v1/parent/controls` returns 401 + force re-PIN.
- Security review: `parent_auth_attempts` table cannot be filled by an unauthenticated brute force (C6 ordering test).
- COPPA review: every action audit-loggable to a parent identity event within the same session.

## Follow-ups

- **P3.B authoring tasks** (already listed in `.omc/plans/flow-system-immediate-fixes.md`): write `parent-gate-validate.sequence.mmd`, wire `parent_locked_out` screen, update UC-PR01 body, build `parent.store.js`.
- **PIN recovery flow** — design email-magic-link path; ADR follow-up if non-obvious.
- **Multi-parent / primary-parent designation** — needed for D4 lockout reset; defer to a future ADR.
- **Biometric cache layer (D6 enhancement)** — Phase 2 UX accelerator; OS biometric unlocks the local copy of the parent JWT until idle_until expires.
- **Sensitive-action freshness threshold** — 60 s in D6 is a starting point; tune based on user-research findings.
- **Subscription / billing mutation** — confirm that Stripe-side checkout already enforces parent identity at the payment-method-bound level, or whether D6 freshness gate is required in addition. Resolve when commerce ADR lands (P3.C).
