---
entity: admin_sessions
domain: 12-admin
service_owner: AdminAuthService
state_machine: '@inline'
api_endpoints:
  - POST /admin/auth/login
  - POST /admin/auth/logout
retention: hard
sequences_referenced_in:
  - docs/sequences/12-admin/login-and-mfa.sequence.mmd
---

# admin_sessions

## Business purpose

Active admin sessions. Deleted on logout or expiry — short-lived (12h max). MFA is required at issuance.

## Ownership rules

- Owner service: `AdminAuthService`
- Writers: `AdminAuthService` (issue on login, revoke on logout / admin force, expire by cron).
- Readers: admin auth middleware on every admin endpoint.

## Lifecycle

- Create: successful MFA-verified login.
- Update: revoke on logout / force-revoke; expire on TTL.
- Delete: hard-deleted on revoke / expiry per spec §3 (`DELETE FROM admin_sessions WHERE id = $1`).
- State machine (inline): `active → revoked | expired`.

## Related APIs

- `POST /admin/auth/login` — create.
- `POST /admin/auth/logout` — revoke.

## Related sequences

- `docs/sequences/12-admin/login-and-mfa.sequence.mmd`.

## Validation rules

- `expires_at` ≤ `created_at + 12h`.
- `ip_address` required; subsequent requests must come from same `/24` (sys-12 §3 Session Rules) or session is force-revoked.

## Edge cases

- Hard-delete-on-expiry differs from `auth_sessions` (which soft-deletes). Audit lives in `admin_commands` (immutable), so admin session rows are disposable.
- Force-logout by `super_admin` updates `status='revoked'` then deletes the row in the same transaction.
