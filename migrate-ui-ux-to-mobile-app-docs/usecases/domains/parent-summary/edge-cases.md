# Edge Cases — `parent-summary`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).

---

## UC-PR02

- **error**: `getParentSummary` failure must show a non-blocking error state with a retry CTA; navigation to sub-sections must remain available.
- **timeout**: Request exceeding SLO must surface a retry affordance without navigating away from the summary page.
- **unauthorized**: If parent-gate session has expired (user backgrounded app for extended period), navigating back to parent surfaces must re-trigger UC-PR01 rather than showing stale data.

## UC-PR03

- **error**: `getParentToday` failure must show a graceful empty-state ("Today's data unavailable") rather than a crash or blank screen.
- **timeout**: Request exceeding SLO must surface a retry CTA and preserve back navigation to UC-PR02.
- **cancel**: Parent can tap back at any time to return to UC-PR02 without side effects.

## UC-PR04

- **error**: `getParentHistory` failure must show a graceful chart-unavailable state with a retry CTA; partial data (fewer days) is acceptable over a crash.
- **timeout**: Request exceeding SLO must surface a retry affordance; day-detail expansion must not be available until data loads.
- **n/a**: No user input that requires validation — parent taps only expand/collapse and back (view-only read screen).

## UC-PR05

- **error**: `getSafetyConfig` fetch failure must show current-config-unavailable message; toggles must be disabled until data loads to prevent unintended mutations.
- **validation**: `updateSafetyConfig` must reject conflicting safety settings (e.g. enabling a filter that conflicts with another) with an inline explanation.
- **timeout**: Update request exceeding SLO must surface a retry CTA and revert the optimistic toggle state.
- **retry**: Parent must be able to retry a failed `updateSafetyConfig` call without re-entering the page.

## UC-PR06

- **error**: `getSettings` fetch failure must show a settings-unavailable state; editable fields must be disabled until data loads.
- **timeout**: `updateSettings` call exceeding SLO must surface a retry CTA and show the unsaved state clearly.
- **validation**: Invalid notification settings (e.g. no frequency selected when notifications are enabled) must block save with inline error.

## UC-PR07

- **n/a**: Help & FAQ is static content — no async call, no user input, no state mutation (no-async, view-only).

## UC-PR08

- **cancel**: Biometric prompt cancelled by user → no state change; falls back to PIN screen.
- **error**: New biometric enrollment (parent adds 2nd fingerprint) → next biometric unlock fails → falls back to PIN per ADR-0009 D6.
- **timeout**: OS biometric prompt timeout → falls back to PIN.
- **retry**: 31st refresh in 24h → 429; client surfaces "Try the PIN this time" toast.
- **unauthorized**: JWT absolute expiry passed → biometric unlock cannot extend; user must full re-PIN.

> Ref: `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`, `docs/flows/edge-cases/retry.flow.mmd`, `docs/flows/edge-cases/unauthorized.flow.mmd`

## UC-PR09

- **unauthorized**: Non-primary attempts → 403 `requires_role=primary`; UI explainer.
- **validation**: Email already in this household → 409 with `already_household_member`.
- **error**: Invitee already in another household → 409; offer to leave existing first (UC-PR12).
- **timeout**: Invite expires after 7 days unused; primary can re-invite.

> Ref: `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/validation.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`

## UC-PR10

- **unauthorized**: Non-primary attempts → 403 `requires_role=primary`.
- **cancel**: Primary attempts to revoke self → 403 `revoke_self_forbidden`; must transfer primary first.
- **n/a**: Already revoked → 200 idempotent — single-step terminal action with no error path.

> Ref: `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/cancel.flow.mmd`

## UC-PR11

- **unauthorized**: Non-primary attempts → 403; target not in household → 404.
- **timeout**: 7-day confirmation window expires → state='expired'; primary can re-initiate.
- **cancel**: Target declines → state='cancelled'; no role change.
- **validation**: In-flight transfer exists → 409; must cancel first.

> Ref: `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`, `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/validation.flow.mmd`

## UC-PR12

- **unauthorized**: User is primary → 409 `cannot_leave_as_primary`; must transfer primary first.
- **error**: User is last household member → 409 `last_member_cannot_leave`; must delete household via account-delete.
- **n/a**: Self-revocation is single-step + non-reversible (terminal action, single-step).

> Ref: `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`
