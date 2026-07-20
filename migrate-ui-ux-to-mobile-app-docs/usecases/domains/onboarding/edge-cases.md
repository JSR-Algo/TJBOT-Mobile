# Edge Cases — `onboarding`

> Phase 1A. Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5). This file: 1 n/a out of 4 UCs = 25%.
>
> Referenced flow templates are informational: `docs/flows/edge-cases/*.flow.mmd`.

---

## UC-O01

- **n/a**: Intro tutorial is a view-only, no-async carousel — no network calls, no form input, no mutable state.

## UC-O02

- **cancel**: Guest tapping the back arrow on `TrustScreen` must return to the final intro slide with no state lost; the trust content must be fully re-rendered on re-entry.
- **error**: If the screen fails to render (asset load error on promise-card icons), the shell must fall back gracefully and the "Continue" CTA must remain accessible.

> Ref: `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`

## UC-O03

- **cancel**: Guest tapping "Not now" must route to `onb_login` with mic permission ungranted and without displaying any pressure messaging or re-prompt.
- **error**: OS permission API returning an unexpected error must surface a recoverable message and keep tjtjboth CTA options ("Continue" / "Not now") visible.
- **unauthorized**: OS returning a permanently-denied permission status must inform the guest that mic can be re-enabled in device Settings, without blocking progress to `onb_login`.

> Ref: `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/unauthorized.flow.mmd`

## UC-O04

- **error**: Navigation to `lesson_ready` failing (e.g. lesson-session domain not ready) must surface a retry CTA without losing the child profile setup completed in UC-A08.
- **timeout**: If the lesson-session handoff does not resolve within the SLO, the screen must surface a "Try again" option and not leave the child on a spinner with no exit path.

> Ref: `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`

## UC-O05

- **cancel**: Parent declining COPPA consent must route back to `onb_login` with a toast; no `coppa_consents` row written and no child profile creation allowed (FK gate).
- **validation**: `invalid_payload` (locale not in supported set, version mismatch) must surface field-level errors and allow re-submit; client must not allow submission without the consent checkbox checked.
- **error**: Network failure on POST must retry idempotently via X-Request-Id — repeated submission returns the existing row, never a duplicate.
- **timeout**: Policy fetch timeout must show a retry banner; consent submission cannot proceed without current policy text being rendered first.

> Ref: `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/validation.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`
