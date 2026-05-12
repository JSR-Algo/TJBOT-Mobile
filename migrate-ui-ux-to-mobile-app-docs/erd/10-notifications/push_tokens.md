---
entity: push_tokens
domain: 10-notifications
service_owner: NotificationService
state_machine: '@inline'
api_endpoints:
  - POST /v1/me/push-tokens
  - DELETE /v1/me/push-tokens/:id
  - GET /v1/me/push-tokens
retention: hard
sequences_referenced_in:
  - docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd
---

# push_tokens

## Business purpose

Per-user FCM / APNs token registry. Lets a parent receive notifications on multiple devices, supports parent-facing device list, and tracks invalidation so the worker can prune dead tokens. Multiple `active` rows per user are allowed (phone + tablet).

## Ownership rules

- Owner service: `NotificationService`.
- Writers: mobile app `POST /v1/me/push-tokens` on app launch / token refresh; worker pipeline UPDATEs `status='invalidated'` on FCM `token_invalid`; parent `DELETE /v1/me/push-tokens/:id` to sign out a device.
- Readers: SQS worker (load active tokens for the recipient parent).

## Lifecycle

- Create: app launches and posts the current token; INSERT.
- Update: `status` transitions only — `active → invalidated` (FCM error), `active → revoked` (user removes from device list), `last_used_at` on every successful send.
- Delete: hard delete on user account deletion (sys-14 cascade) or after 90 days of `status='invalidated'` (worker cleanup; future plan).

State machine (inline): `active → invalidated` (FCM token_invalid), `active → revoked` (user sign-out / device deletion), `invalidated → active` (reissued token re-INSERTs as a new row, not a transition — old row stays for audit).

## Related APIs

- `POST /v1/me/push-tokens` — register / refresh token
- `DELETE /v1/me/push-tokens/:id` — revoke token
- `GET /v1/me/push-tokens` — list parent's devices

## Related sequences

- `docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd` — read at every push send

## Validation rules

- `token` opaque — uniqueness enforced by `idx_push_tokens_token_unique` so a token cannot be claimed by two users.
- `status` transitions guarded in app code; no DB trigger.
- `platform` derived from app-side OS detection; immutable after INSERT.

## Edge cases

- FCM rotates tokens; the same physical device may produce a new token over its lifetime — that produces a new row (old one keeps `status='active'` until FCM returns `token_invalid` on a send attempt and the worker invalidates it).
- Token collision (rare; FCM guarantees uniqueness but tests may collide): unique index blocks the second INSERT — surface a 409 at the app layer.
- Cross-domain FK to sys-01 `users` (`user_id`): owning side carries the FK; sys-01 holds the producer-side `Ref:` line per CONVENTIONS §3. Phase 3 documents the back-reference.
- COPPA: no child data — push tokens identify parent devices only. No retention sweep beyond user-deletion cascade.
