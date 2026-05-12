---
entity: password_reset_tokens
domain: 01-identity
service_owner: IdentityService
state_machine: '@inline'
api_endpoints:
  - POST /v1/auth/forgot-password
  - POST /v1/auth/reset-password
retention: hard
sequences_referenced_in:
  - docs/sequences/01-identity/password-reset.sequence.mmd
---

# password_reset_tokens

## Business purpose

Single-use, time-bounded nonce that lets an out-of-band recipient (verified email) reset their password without supplying the prior one. Token material exists only in the recipient's email; this row stores the hash.

## Ownership rules

- Owner service: `IdentityService`
- Writers: `IdentityService` (issue, consume, expire-cron, invalidate on new request).
- Readers: `IdentityService` only.

## Lifecycle

- Create: `POST /v1/auth/forgot-password`.
- Update: `status='consumed' + used_at` on successful reset; `expired` by cron; `invalidated` when superseded.
- Delete: hard-delete by `auth.maintenance.expire_tokens` cron (per spec §6.3).
- State machine (inline): `pending → consumed | expired | invalidated`.

## Related APIs

- `POST /v1/auth/forgot-password` — issue.
- `POST /v1/auth/reset-password` — consume.

## Related sequences

- `docs/sequences/01-identity/password-reset.sequence.mmd` — out-of-band recovery.

## Validation rules

- `token_hash` unique.
- `expires_at = created_at + 1h` (policy default).
- At most one `pending` token per user; new issuance invalidates older pending rows.

## Edge cases

- Reset attempt with mismatched `requested_ip` does NOT block the reset (recipient might switch networks) but is logged in `account_security_events` for sys-13.
- Consumed token replay returns generic 400 to avoid disclosing prior token existence.
