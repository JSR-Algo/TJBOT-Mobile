---
entity: orders
domain: 19-billing
service_owner: BillingService
state_machine: "@inline"
api_endpoints:
  - POST /v1/billing/orders
  - GET /v1/billing/orders
  - GET /v1/billing/orders/:id
sequences_referenced_in:
  - docs/sequences/19-billing/checkout-initiate-mobile.sequence.mmd
  - docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd
  - docs/sequences/19-billing/dunning-past-due.sequence.mmd
retention: 7y
---

# orders

## Business purpose

Represents a one-time purchase order for physical hardware (TBot device, accessories) or digital add-ons. Distinct from recurring subscriptions. Tracks the full fulfillment lifecycle from initial checkout through to product activation, including shipping and carrier tracking. Both orders and subscriptions can coexist for the same user.

## Ownership rules

- Owner service: `BillingService`
- Writers: `BillingService` (creates on checkout initiation; advances state on Stripe webhooks and fulfillment callbacks), fulfillment integration (sets shipping_address, tracking_number, state=shipped)
- Readers: `BillingService` (order history API), `ParentApp` (order history + tracking screen), `ControlsService` (content entitlement activation on state=activated)

## Lifecycle

- Create: on `POST /v1/billing/orders` — BillingService creates Stripe Checkout Session, writes row with state=created.
- Update: state transitions + metadata fields (stripe_payment_intent_id, tracking_number, etc.) updated on Stripe webhooks and fulfillment events.
- Delete: never hard-deleted. Retained 7 years per financial compliance. `state = cancelled` or `refunded` are terminal with no further mutations.
- State machine: `@inline`

  | From | To | Trigger | Fields set |
  |---|---|---|---|
  | created | paid | `payment_intent.succeeded` Stripe webhook | `stripe_payment_intent_id`, `paid_at` |
  | created | cancelled | `payment_intent.payment_failed` or user cancels before payment | `cancelled_at` |
  | paid | fulfilling | fulfillment system picks up order (internal event) | — |
  | fulfilling | shipped | fulfillment system ships; provides tracking number | `tracking_number`, `shipped_at` |
  | shipped | arrived | carrier delivery confirmed (webhook or polling) | — |
  | arrived | activated | TBot device powers on + links to account | — |
  | paid | cancelled | cancellation before fulfillment | `cancelled_at` |
  | paid | refunded | refund issued before fulfillment | — |
  | fulfilling | refunded | refund issued during fulfillment | — |
  | shipped | refunded | refund issued after ship (return initiated) | — |
  | arrived | refunded | return confirmed received | — |

## Notes

### Partial index on active orders

The ideal `idx_orders_state_active` index has partial predicate `WHERE state IN ('created', 'paid', 'fulfilling', 'shipped')` to skip terminal rows in the hot-path sweep. DBML cannot express this natively. The migration adds:

```sql
CREATE INDEX idx_orders_state_active_partial
  ON orders(state, created_at)
  WHERE state IN ('created', 'paid', 'fulfilling', 'shipped');
```

### `stripe_payment_intent_id` uniqueness

The column is UNIQUE per the index. `NULL` values (order not yet paid) are excluded from the uniqueness scope by DB standard (NULLs are distinct). Once set, it cannot change.

### `shipping_address` shape

`jsonb` column with schema `{line1: string, line2?: string, city: string, state: string, postal_code: string, country: string}`. Snapshot taken at order creation time so address changes in the user profile do not affect in-flight orders.

## Related APIs

- `POST /v1/billing/orders` — initiate purchase; creates Stripe Checkout Session + order row
- `GET /v1/billing/orders` — paginated order history for authenticated user
- `GET /v1/billing/orders/:id` — single order detail + tracking info

## Related sequences

- `docs/sequences/19-billing/checkout-initiate-mobile.sequence.mmd` — order creation + checkout flow
- `docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd` — payment confirmation + state transitions
- `docs/sequences/19-billing/dunning-past-due.sequence.mmd` — references order context for dunning decisions

## Validation rules

- `quantity` ≥ 1 (app-layer).
- `amount_cents` ≥ 0.
- `currency` must be in BillingService supported currency list (app-layer).
- `state_version` monotonically increasing; stale-state writes rejected with 409.
- `stripe_payment_intent_id` set exactly once; subsequent attempts to change it rejected.

## Edge cases

- **Duplicate webhook delivery**: idempotency handled via `stripe_payment_intent_id` uniqueness — second `payment_intent.succeeded` for same PI finds existing row and is a no-op.
- **Coexistence with subscriptions**: independent lifecycle; a user may have both.
- **Digital-only orders**: `shipping_address` and `tracking_number` NULL; `arrived` and `activated` transitions may fire immediately after `paid`.
- **Partial refunds**: not modeled at row level — Stripe handles amounts; this row tracks terminal state.
