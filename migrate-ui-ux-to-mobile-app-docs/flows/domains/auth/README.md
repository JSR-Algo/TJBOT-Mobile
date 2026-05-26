<!-- HAND-CURATED. -->
# Auth Domain Flow

**Owner lane:** A
**States:** 3 (2 happy, 1 edge)

## Entry / exit

- **Entry:** `onb_login` — reached from onboarding's `onb_first_lesson` or from `onb_login_error` retry.
- **Exit to device:** `go('dv_pair_intro')` — successful authentication routes into robot pairing.
- **Exit to onboarding:** `go('onb_splash')` — user cancels login and returns to splash.

## Happy path — Login / sign-up

`onb_login` → `onb_child` → *(cross-domain)* → `dv_pair_intro`

The user either logs into an existing account or creates a new one on `onb_login`. After credentials are accepted, `onb_child` collects (or confirms) the child profile attached to the account. On success the app navigates to device pairing.

## Edge state — Login error

| State | Templates | Trigger |
|---|---|---|
| `onb_login_error` | error, retry, unauthorized | Bad credentials, network failure, or expired token. User can retry (returns to `onb_login`) or cancel (returns to `onb_splash`). |

`onb_login_error` MUST have at least one outbound edge to recover or exit — both are present: retry → `onb_login`, cancel → `onb_splash`.

## Notes

- State IDs use the `onb_` prefix (matching onboarding prefix convention) because auth was historically part of the onboarding funnel. Ownership lives in `src/features/auth/` and is Lane A exclusive.
- No validation edge state is declared here; inline field errors on `onb_login` are handled in-component without a separate screen.
