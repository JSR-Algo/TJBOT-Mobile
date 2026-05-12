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
