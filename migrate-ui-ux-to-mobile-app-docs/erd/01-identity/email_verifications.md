---
entity: email_verifications
domain: 01-identity
service_owner: IdentityService
state_machine: '@inline'
api_endpoints:
  - POST /v1/auth/signup
  - POST /v1/auth/verify-email
  - POST /v1/me/email
retention: hard
sequences_referenced_in:
  - docs/sequences/01-identity/signup.sequence.mmd
no_sequence: false
---

# email_verifications

## Business purpose

Single-use email-confirmation nonce. Issued at signup, on email-change, or for re-verify campaigns. Required before `users.email` is treated as verified (gates account recovery + sensitive notifications).

## Ownership rules

- Owner service: `IdentityService`
- Writers: `IdentityService` (issue, consume, expire-cron, invalidate-on-supersede).
- Readers: `IdentityService` only.

## Lifecycle

- Create: signup, email-change request, or admin re-verify.
- Update: `status='consumed' + consumed_at` on token presentation; `expired` by cron at `expires_at`; `invalidated` if a newer token issued for the same `(user_id, purpose)`.
- Delete: hard-delete by sys-14 after retention window.
- State machine (inline): `pending → consumed` (success), `pending → expired` (TTL), `pending → invalidated` (superseded).

## Related APIs

- `POST /v1/auth/signup` — emits first verification.
- `POST /v1/auth/verify-email` — consumes token.
- `POST /v1/me/email` — issues email-change verification.

## Related sequences

- `docs/sequences/01-identity/signup.sequence.mmd` — implicit via `auth.email.send_welcome` queue + verification email.

## Validation rules

- `token_hash` unique across all rows; original token sent only via email.
- `expires_at` enforced as `created_at + policy_ttl` (24h default).
- Only one `pending` row per `(user_id, purpose)`; new issues invalidate prior pending row.

## Edge cases

- Token consumed but email change conflicts with another user: status stays `consumed`, but the email-change transaction rolls back; user must restart flow.
- Replay of consumed token returns generic "invalid or expired" without leaking whether the token ever existed.
