---
entity: orders
domain: 19-billing
service_owner: BillingService
state_machine: "@inline"
api_endpoints:
  - GET /v1/billing/orders
  - POST /v1/billing/orders
sequences_referenced_in:
  - docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd
retention: "7y"
---

# orders

## Business purpose

Represents a one-time purchase or hardware bundle order — distinct from recurring subscriptions. Orders capture the purchase of physical products (e.g. replacement parts, gift sets) or one-time digital add-ons. Both orders and subscriptions can coexist for the same household: subscriptions grant ongoing content access; orders represent discrete transactions.

## Ownership rules

- Owner service: `BillingService`
- Writers: `BillingService` (creates on Stripe PaymentIntent confirmation; updates on fulfillment, cancellation, refund)
- Readers: `BillingService` (order history API), `ParentApp` (order history screen)

## Lifecycle

- Create: on `payment_intent.succeeded` Stripe webhook for one-time purchase checkout sessions.
- Update: `status` updated on fulfillment (`fulfilled_at`), cancellation (`canceled_at`), or refund (`refunded_at`).
- Delete: never deleted — retained 7 years for financial audit. `status = canceled` or `refunded` represents terminal states.
- State machine: `@inline`
  - `pending` → `paid` (payment succeeds)
  - `pending` → `canceled` (payment failed or user cancels before payment)
  - `paid` → `fulfilled` (hardware shipped or digital entitlement granted)
  - `paid` → `refunded` (refund issued)
  - `fulfilled` → `refunded` (post-fulfillment refund)

## Related APIs

- `GET /v1/billing/orders` — paginated order history for the authenticated household
- `POST /v1/billing/orders` — initiate a new one-time purchase (creates Stripe PaymentIntent)

## Related sequences

- `docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd` — `payment_intent.succeeded` webhook event triggers order creation / status update

## Validation rules

- `total_amount_cents` must be ≥ 0.
- `total_amount_cents` must equal the sum of all `order_items.unit_price_cents * quantity` (validated by BillingService, not a DB constraint).
- `stripe_payment_intent_id` unique — enforced by DB unique index.

## Edge cases

- **Coexistence with subscriptions**: a household may have both active subscriptions and orders simultaneously; BillingService manages these independently.
- **Partial refunds**: not modeled at row level — Stripe handles partial refund amounts; this row tracks the terminal state only.
- **Hardware fulfillment**: order status transitions to `fulfilled` when the physical fulfillment system (external) confirms shipment. BillingService receives a webhook or internal callback.
