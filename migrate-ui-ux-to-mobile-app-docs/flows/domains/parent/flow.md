<!-- HAND-CURATED. -->
# Parent Approval Flow

## Happy Path

`parent_gate` (PIN entry) → `parent_summary` → tabs: `parent_today`, `parent_history`, `parent_safety`, `parent_settings` → `home_hub_idle` (exit).

## Gate Lockout (`parent_locked_out`)

After 5 consecutive wrong PIN attempts, the server returns 423 and the app enters `parent_locked_out`. The lockout lasts 15 minutes or until the primary parent unlocks via `POST /v1/parent/lockout/clear`. An audit event and push notification are sent to the primary parent account. The lockout counter is account-scoped (not device-scoped) — attempts across multiple devices count together. From `parent_locked_out` the only exit is back to `home_hub_idle` (cooldown expired or primary parent action).

## Sign-Out Path

`parent_settings` → `onb_login`: full account sign-out. This clears the auth token and routes to `onb_login` (not to the child home). Implemented via `POST /v1/auth/logout`. The parent JWT is revoked server-side.

## Voice Consent Path

`parent_settings` contains the parent-controlled AI voice consent repair path. "Allow voice lessons" stays on `parent_settings` and calls `POST /v1/identity/ai-voice-consent`; "Pause voice lessons" stays on `parent_settings` and calls `POST /v1/identity/ai-voice-consent/withdraw`. Save success or failure is inline on the same screen. There is no separate voice setup route after onboarding.

## Session TTL

Parent sessions expire after 30 minutes total or 5 minutes of idle. The terminal transition fires when the server returns 401 on any privileged call — no client-side dual-timer. After expiry, the parent must re-authenticate via `parent_gate`.

## Edge Cases

| State | Scenario | Exit |
|---|---|---|
| `parent_gate` | Wrong PIN, attempts < 5 | Back to `parent_gate` (counter increments) |
| `parent_gate` | 5th wrong PIN | → `parent_locked_out` |
| `parent_locked_out` | 15-min cooldown / primary parent unlocks | → `home_hub_idle` |
| `parent_gate` | Cancel | → `home_hub_idle` |
| `parent_settings` | Sign out | → `onb_login` |
| `parent_settings` | AI voice consent save fails | Stay on `parent_settings` with inline retry copy |
