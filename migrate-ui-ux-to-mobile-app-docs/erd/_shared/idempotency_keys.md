---
entity: idempotency_keys
domain: _shared
service_owner: PlatformGateway
state_machine: '@inline'
api_endpoints:
  - "*"
retention: 24h
sequences_referenced_in:
  - docs/sequences/01-identity/signup.sequence.mmd
  - docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd
---

# idempotency_keys

## Business purpose

Platform-wide request-idempotency dedup. Every service that accepts a client-supplied `X-Request-Id` (signup, billing webhook, device pairing, etc.) writes a row at request entry and reads on retry to short-circuit duplicate side effects.

Per plan §3 Q-5: this lives in `_shared/` (not in `17-gateway/`) because the dedup is performed at the service layer, not the gateway — the gateway only forwards the header.

## Ownership rules

- Owner service: each producing service (the row is service-scoped). `PlatformGateway` is the conceptual umbrella for the convention.
- Writers: every idempotent endpoint handler (insert at entry, update at completion).
- Readers: the same endpoint on every replay.

## Lifecycle

- Create: at endpoint entry with `status='in_flight'`.
- Update: `status='succeeded' | 'failed'` + cached `response_status` + `response_body` at completion.
- Delete: hard-deleted by sys-14 retention sweep after `expires_at` (default `created_at + 24h`).
- State machine (inline): `in_flight → succeeded | failed`.

## Related sequences

- `docs/sequences/01-identity/signup.sequence.mmd` — `X-Request-Id` 24h dedup.
- `docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd` — Stripe `event.id` as natural idempotency key.

## Validation rules

- `(service_name, request_key)` unique.
- `request_key` length 1..120 (RFC-7807-ish bound; varies per service convention).
- `response_body` redacted per service privacy convention (no PII echoed in cached responses).

## Edge cases

- In-flight collision: two concurrent requests with the same `(service, key)` — second one waits / returns 409 / returns the in-flight 202 stub per service convention (documented in each consumer's sequence file).
- Long-running async endpoints: `in_flight` rows persist until the async worker completes; the sweep skips them via the partial index condition.
- Replay after expiry: the dedup window has lapsed; service treats request as new (acceptable for the 24h default; longer windows are case-by-case).
