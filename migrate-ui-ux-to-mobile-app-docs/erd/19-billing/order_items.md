---
entity: order_items
domain: 19-billing
service_owner: BillingService
state_machine: none
api_endpoints:
  - GET /v1/billing/orders/:id
sequences_referenced_in:
  - docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd
retention: "7y"
---

# order_items

## Business purpose

Line items within a one-time order. Each row records a single product SKU, the quantity purchased, and the unit price at the time of purchase (price is captured immutably — future price changes do not retroactively alter historical order lines).

## Ownership rules

- Owner service: `BillingService`
- Writers: `BillingService` (created at order creation time; immutable after creation)
- Readers: `BillingService` (order detail API), `ParentApp` (order receipt display)

## Lifecycle

- Create: at order creation, one row per distinct product SKU in the basket.
- Update: immutable after the order is created. If an order is refunded, the parent `orders` row status changes but line items are not modified.
- Delete: never deleted — retained with the parent order for 7 years (financial audit).
- State machine: none — immutable reference data once created.

## Related APIs

- `GET /v1/billing/orders/:id` — returns order detail including all line items

## Related sequences

- `docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd` — order creation triggered by Stripe webhook; line items created from the PaymentIntent's line_items

## Validation rules

- `quantity` must be ≥ 1.
- `unit_price_cents` must be ≥ 0.
- `unit_price_cents` is captured at purchase time and never updated — price changes do not affect existing order items.

## Edge cases

- **Immutability**: once created, line items are never mutated. Amendments (e.g. operator correction) require a new order and refund of the original.
- **SKU evolution**: `product_sku` is a snapshot of the SKU at purchase time; BillingService does not FK this to a products catalog table — avoids reference data coupling for historical records.
