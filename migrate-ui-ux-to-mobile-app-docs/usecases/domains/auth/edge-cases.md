# Edge Cases — `auth`

> Phase 0.5 dry-run sample. Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).

---

## UC-A01

- **n/a**: Splash is view-only with auto-advance — no user input, no async work that can fail.

## UC-A02

- **validation**: Email format and password strength must be checked before submit; failure returns to the form with field-level error messaging.
- **error**: Network failure during signup must surface a recoverable error and preserve form input.
- **timeout**: Signup request must surface a retry affordance after a bounded wait (e.g. 8 s) without losing form state.

## UC-A03

- **validation**: Empty email or password must block submit with inline messaging; surface required-field markers.
- **unauthorized**: Bad credentials must route to `onb_login_error` (UC-A07) without revealing which field was wrong.
- **timeout**: Login request that exceeds the SLO must surface a retry CTA with the form still populated.
- **error**: Generic backend failure must show a non-blaming message and keep the user on `onb_login`.

## UC-A04

- **error**: Google OAuth provider failure must surface a recoverable error with a fallback to email login.
- **cancel**: User dismissing the Google sheet must return to `onb_login` with no state change.
- **unauthorized**: Provider returning a denied/scopes-missing response must explain what was denied without security-jargon.

## UC-A05

- **error**: Apple OAuth provider failure must surface a recoverable error with a fallback to email login.
- **cancel**: User dismissing the Apple sheet must return to `onb_login` with no state change.
- **unauthorized**: Provider returning a denied/scopes-missing response must explain the deny reason in plain language.

## UC-A06

- **n/a**: Reset Password is currently a no-async, single-step navigation — no API call, no state change. (KD1, KD13: pending `BACKLOG-UC-A06` decision.)

## UC-A07

- **retry**: User must be able to retry login from this screen with edited credentials at least 3 times before being throttled.
- **validation**: The screen must keep field-level errors visible while the user re-types so they know what to fix.

## UC-A08

- **validation**: Both buddy and level must be selected before "Save and meet Robot" is enabled.
- **error**: Backend save failure must keep the form populated and surface a recoverable error.
- **timeout**: Save request that exceeds SLO must surface a retry CTA with the selection preserved.

## UC-A09

- **error**: Refresh API failure must demote status to `expired` and trigger re-auth flow on the next protected call.
- **timeout**: Refresh that exceeds SLO must transition to `expired` to avoid hung `expiring` state.
- **unauthorized**: Server-side revocation during refresh must call `revoke()` and force a hard logout to `onb_login`.

## UC-A10

- **n/a**: Logout is single-step, terminal — clears local state and routes to `onb_login`. No async call must be allowed to block the return-to-login path.

## UC-A11

- **cancel**: Confirm sheet "Sign out this device?" must allow back-out without revoking; no `parent_sessions.revoked_at` written on cancel.
- **error**: `session_not_found` 404 (already revoked by another device) must auto-refresh the list rather than surface an error.
- **unauthorized**: 401 on the DELETE must force re-PIN per ADR-0005 D6; UI must not silently fail.

> Ref: `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/unauthorized.flow.mmd`

## UC-A12

- **cancel**: Cancel during 30-day grace must mark `deletion_jobs.state='cancelled'`; subsequent app state must reflect the cancellation immediately without requiring full app restart.
- **error**: `pending_subscription_cancel_required` 409 must navigate the parent to UC-SUB02 with explainer toast; primary CTA must not block forever.
- **unauthorized**: Stale parent JWT (< 60s freshness) must force re-PIN before the deletion request is sent; never send with stale token.
- **timeout**: Async pipeline progress lookup timeout must fall back to email notification path; client must not poll indefinitely.

> Ref: `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`

## UC-A13

- **error**: Export job failure must surface "We had trouble preparing your archive — try again in 24h" without exposing internal job ID; admins re-run from job table.
- **retry**: Rate-limit 429 must show clear "Available again on YYYY-MM-DD" with `Retry-After` header value; no silent silently-discarded retries.
- **timeout**: Pipeline taking > 30min must continue async and fall back to SES email link; UI must close loop gracefully.

> Ref: `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/retry.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`

## UC-A14

- **error**: SES delivery failure must surface "If you don't see the email in 5 minutes, request a new link" — no silent failure.
- **retry**: 4th request in same hour → 429 + "Contact support" CTA per ADR-0008 D6.
- **timeout**: Token expired (>15min) → 410 with "Request a new link" — never silent.
- **validation**: New PIN < 4 digits OR != confirm-PIN → inline validation, no submission.
- **unauthorized**: Token already used → 410 "This link was already used"; no second-use replay possible.

> Ref: `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/retry.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`, `docs/flows/edge-cases/validation.flow.mmd`, `docs/flows/edge-cases/unauthorized.flow.mmd`

## UC-A15

- **validation**: Nickname collision in household → inline error on name field, never server 500.
- **error**: COPPA consent flow declined mid-add → return to ParentChildrenScreen without persisting; partial child row never written.
- **timeout**: Server unreachable during POST → optimistic local add deferred until reconnection, with explicit "Sync pending" badge.
- **unauthorized**: Hard cap (10 children) → 409 with `hard_cap_reached`; CTA disabled with explainer.

> Ref: `docs/flows/edge-cases/validation.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`, `docs/flows/edge-cases/unauthorized.flow.mmd`

## UC-A16

- **cancel**: Switch initiated mid-lesson → blocked with "Finish or cancel the current lesson first" toast; no half-switch state.
- **error**: Server POST failure → switch persists locally; deferred server-sync on next foreground; user sees no error.
- **n/a**: No validation needed — switch is single-step, no-async at the user-action layer (single-step view-only style action).

> Ref: `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`

## UC-A17

- **cancel**: Confirm sheet allows back-out with no state change.
- **error**: Child has active lesson → 409 `lesson_in_progress`; prompt to end lesson first.
- **n/a**: Suspend is reversible single-step — no retry semantics needed (no-async + reversible).

> Ref: `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`

## UC-A18

- **unauthorized**: Secondary parent attempts → 403 with `requires_role=primary` + clear explainer.
- **validation**: "Type child's name to confirm" gate blocks impulsive deletion.
- **cancel**: Cancel during 30-day grace via PATCH back to `status='active'`; data fully restored.
- **error**: Stripe subscription continues normally; deletion is child-scoped not account-scoped.
- **timeout**: Network failure during initiate → no row written; safe to retry.

> Ref: `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/validation.flow.mmd`, `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`
