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
