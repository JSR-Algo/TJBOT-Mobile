---
entity: auth_sessions
domain: 01-identity
service_owner: IdentityService
state_machine: '@inline'
api_endpoints:
  - POST /v1/auth/login
  - POST /v1/auth/refresh
  - POST /v1/auth/logout
  - POST /v1/auth/logout-all
retention: soft
sequences_referenced_in:
  - docs/sequences/01-identity/login.sequence.mmd
  - docs/sequences/01-identity/token-refresh.sequence.mmd
---

# auth_sessions

## Business purpose

Server-side session record per (user, client). Tracks issuance, last-use, expiry, and revocation for refresh-token rotation and forced logout. The actual rotating refresh-token material is stored in `refresh_tokens` (one row per generation).

## Ownership rules

- Owner service: `IdentityService`
- Writers: `IdentityService` on login (create), refresh (touch `last_used_at`), logout, logout-all, replay-detection auto-revoke; `auth.maintenance.expire_sessions` cron.
- Readers: auth middleware on every request; admin tooling for forced logout.

## Lifecycle

- Create: successful `POST /v1/auth/login`.
- Update: `last_used_at` on every accepted refresh; `status='revoked'` on user logout / admin revoke / replay; `status='expired'` by cron after `expires_at`.
- Delete: hard-deleted by sys-14 after `revoked_at` / `expires_at` + retention window.
- State machine (inline): `active → revoked` (logout / admin / replay-detected), `active → expired` (cron).

## Related APIs

- `POST /v1/auth/login` — creates session.
- `POST /v1/auth/refresh` — touches session.
- `POST /v1/auth/logout` / `logout-all` — revokes.

## Related sequences

- `docs/sequences/01-identity/login.sequence.mmd` — creation
- `docs/sequences/01-identity/token-refresh.sequence.mmd` — rotation + replay detection

## Validation rules

- One active session per `(user_id, client_type)` is **not** enforced — concurrent devices are explicitly allowed.
- `expires_at` > `issued_at`; bounded by policy (parent_app=30d, admin_console=12h).
- `client_type` immutable for the row's lifetime.

## Edge cases

- Refresh-token replay: spec §7.4 — detecting a re-used refresh forces the session to `revoked` + emits `account_security_events`. The session row stays for audit until retention sweep.
- `last_used_at` may be NULL until first refresh.
- Concurrent refresh attempts must serialize on `id` (app layer); validator emits no DB-side guard.
