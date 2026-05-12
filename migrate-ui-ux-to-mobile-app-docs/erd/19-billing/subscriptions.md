---
entity: subscriptions
domain: 19-billing
service_owner: BillingService
state_machine: "@inline"
api_endpoints:
  - GET /v1/billing/subscription
  - POST /v1/billing/checkout
  - POST /v1/billing/cancel
sequences_referenced_in:
  - docs/sequences/19-billing/entitlement-check-session-start.sequence.mmd
  - docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd
  - docs/sequences/_cross/billing-entitlement-session-start.sequence.mmd
retention: soft
---

# subscriptions

## Business purpose

Represents a household's recurring access entitlement to TBOT. Each subscription links a household to a billing plan via Stripe and tracks the subscription lifecycle (trialing → active → past_due → canceled → expired). The subscription row is the authoritative source for entitlement resolution when the Redis cache misses.

## Ownership rules

- Owner service: `BillingService`
- Writers: `BillingService` (creates on checkout; updates on every Stripe webhook — status, period dates, cancellation flags)
- Readers: `BillingService` (entitlement resolution), `RealtimeService` (indirectly via entitlement check), `ParentApp` (subscription management screen)

## Lifecycle

- Create: on successful Stripe checkout session (`checkout.session.completed` webhook).
- Update: on every Stripe subscription lifecycle webhook (`customer.subscription.updated`, `invoice.payment_failed`, `invoice.payment_succeeded`).
- Delete: soft — row is never deleted; `status` transitions to `canceled` or `expired`. Retained for billing history queries.
- State machine: `@inline`
  - `trialing` → `active` (trial ends, payment succeeds)
  - `trialing` → `canceled` (user cancels during trial)
  - `active` → `past_due` (payment fails)
  - `active` → `canceled` (`cancel_at_period_end = true`, period ends)
  - `past_due` → `active` (payment retried successfully)
  - `past_due` → `canceled` (payment retries exhausted)
  - `canceled` → `expired` (period ends after cancellation)

## Related APIs

- `GET /v1/billing/subscription` — returns current subscription and status for the authenticated household
- `POST /v1/billing/checkout` — creates checkout session; subscription row created on webhook completion
- `POST /v1/billing/cancel` — sets `cancel_at_period_end = true`

## Related sequences

- `docs/sequences/19-billing/entitlement-check-session-start.sequence.mmd` — reads `status` and resolves `turnsRemaining` / `sessionsRemaining`
- `docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd` — writes status transitions from Stripe events
- `docs/sequences/_cross/billing-entitlement-session-start.sequence.mmd` — cross-system flow consuming this table via entitlement cache

## Validation rules

- A household may have at most one `active` or `trialing` subscription at a time (enforced by BillingService logic, not a DB constraint — historical rows for past subscriptions are retained).
- `current_period_end` must be after `current_period_start`.
- `canceled_at` must be set when `status = canceled`.

## Edge cases

- **Idempotency**: Stripe webhooks may be delivered multiple times. The `stripe_subscription_id` unique index plus `stripe_webhook_events` deduplication ensures at-most-once processing.
- **past_due grace**: entitlement check returns `200 entitled grace` during `past_due` state — session is allowed but UI shows payment warning.
- **mid-turn expiration**: entitlement re-checked on long sessions (>15 min); if subscription transitions to `canceled` mid-session, the session is allowed to complete but a new session is blocked.
- **Cross-domain consistency**: entitlement cache in Redis is invalidated by BillingService after any status change. Cache TTL is 60 s — brief inconsistency window is acceptable per plan §11.
