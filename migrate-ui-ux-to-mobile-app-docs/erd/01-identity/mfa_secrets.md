---
entity: mfa_secrets
domain: 01-identity
service_owner: IdentityService
state_machine: '@inline'
api_endpoints:
  - POST /v1/me/mfa/enroll
  - POST /v1/me/mfa/verify
  - DELETE /v1/me/mfa/:id
retention: soft
sequences_referenced_in: []
no_sequence: true
---

# mfa_secrets

## Business purpose

Stores second-factor enrolment material for parent accounts (TOTP, WebAuthn, recovery codes). Not currently exercised by any sys-01 sequence diagram — listed in plan §3 to reserve the table for the MFA rollout phase (admin MFA in sys-12 lives in `admin_users.mfa_*` columns).

## Ownership rules

- Owner service: `IdentityService`
- Writers: `IdentityService` (enrol / disable / revoke).
- Readers: `IdentityService` at login challenge; never leaves the service boundary.

## Lifecycle

- Create: enrol flow after fresh-auth recheck.
- Update: `status='disabled'` (user disables); `revoked` (admin or security event).
- Delete: hard-deleted on user account hard-delete.
- State machine (inline): `active → disabled | revoked`.

## Related APIs

- `POST /v1/me/mfa/enroll` / `verify` / `DELETE /v1/me/mfa/:id` — proposed surface, not yet in spec.

## Related sequences

`@no-sequence` — annotated because MFA flow for parent app is forward-looking. Phase 3 may add an MFA sequence under `docs/sequences/01-identity/`.

## Validation rules

- `secret_hash` encrypted with KMS envelope (`kms_keys.id` referenced by app layer; not a FK).
- One `active` row per `(user_id, method)` (app-layer; not DB unique because recovery_code can stash multiple).

## Edge cases

- Recovery-code: each code is a separate row with `method='recovery_code'`; used codes go to `revoked` on consumption to make replay obvious.
- Account hard-delete cascades — sys-14 retention sweep deletes alongside `users`.
