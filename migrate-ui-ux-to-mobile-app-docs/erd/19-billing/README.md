# 19-billing — BillingService ERD

**System spec:** `docs/site/software/systems/19-billing-subscription.md`
**Sequences:** `docs/sequences/19-billing/*.sequence.mmd`
**Owning service(s):** `BillingService`
**Lane:** G (worker-6, Phase 2)

## Entities

| Entity | Purpose |
|---|---|
| `subscription_plans` | Billing tier catalog; maps to Stripe Price objects; defines entitlement parameters |
| `stripe_customers` | Bridges TBOT users to Stripe Customer objects (1:1) |
| `subscriptions` | Household recurring access; lifecycle trialing→active→past_due→canceled→expired |
| `entitlements` | Per-child access record derived from subscription; consumed by RealtimeService |
| `invoices` | Immutable financial record per billing period; retained 7 years |
| `stripe_webhook_events` | Idempotency log for Stripe webhook ingestion; `stripe_event_id` unique key |
| `orders` | One-time purchase or hardware bundle (distinct from subscriptions) |
| `order_items` | Line items within an order; immutable after creation |

## Cross-domain FKs

| Column | Target | Owner service |
|---|---|---|
| `stripe_customers.user_id` | `users.id` | IdentityService |
| `subscriptions.household_id` | `households.id` | IdentityService |
| `entitlements.child_id` | `children.id` | IdentityService |
| `orders.household_id` | `households.id` | IdentityService |

## Key conventions

- All money columns are `bigint` cents (never numeric/float).
- `stripe_webhook_events.stripe_event_id` has a UNIQUE constraint — Stripe at-least-once delivery deduplication.
- `invoices` are immutable once `status = paid`; retained 7 years minimum.
- `orders` and `subscriptions` coexist independently — orders = one-time purchases, subscriptions = recurring access.
