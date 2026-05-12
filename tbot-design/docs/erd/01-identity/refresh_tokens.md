---
entity: refresh_tokens
domain: 01-identity
service_owner: IdentityService
state_machine: '@inline'
api_endpoints:
  - POST /v1/auth/login
  - POST /v1/auth/refresh
  - POST /v1/auth/logout
retention: soft
sequences_referenced_in:
  - docs/sequences/01-identity/login.sequence.mmd
  - docs/sequences/01-identity/token-refresh.sequence.mmd
---

# refresh_tokens

## Business purpose

Rotating refresh-token generations bound to an `auth_session`. Every refresh produces a new row; the predecessor is marked `rotated`. A re-use of an already-rotated token signals replay and forces session revocation.

## Ownership rules

- Owner service: `IdentityService`
- Writers: `IdentityService` (login → first generation; refresh → next; replay → mark `replayed`).
- Readers: `IdentityService` only; never leaves the service boundary.

## Lifecycle

- Create: on every successful login or refresh.
- Update: `rotated → rotated_to_id` when successor issued; `revoked` on logout / admin revoke; `replayed` if presented after rotation.
- Delete: hard-deleted with parent `auth_sessions` row via sys-14 retention.
- State machine (inline): `active → rotated` (next gen issued), `active → revoked` (logout), `rotated → replayed` (re-use after rotation), `active → revoked` (TTL passed and cron-collected).

## Related APIs

Inherits from `auth_sessions`.

## Related sequences

- `docs/sequences/01-identity/token-refresh.sequence.mmd` — rotation + replay logic.

## Validation rules

- `token_hash` is a non-reversible hash; constant-time comparison at auth time.
- `expires_at` ≤ parent `auth_sessions.expires_at`.
- Only one row per session can be in `active` state at a time (app-layer constraint; covered by `idx_refresh_tokens_session_status`).

## Edge cases

- Replay: if a token whose status is already `rotated` is presented again, the row transitions to `replayed`, the parent session is forced to `revoked`, and an `account_security_events` row is appended (per spec §7.4).
- Clock skew across refreshes: app layer compares against `expires_at` with a small grace window — never trust client time.
