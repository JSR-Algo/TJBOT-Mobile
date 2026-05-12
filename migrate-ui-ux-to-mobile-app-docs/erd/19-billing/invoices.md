---
entity: invoices
domain: 19-billing
service_owner: BillingService
state_machine: "@inline"
api_endpoints:
  - GET /v1/billing/invoices
  - GET /v1/billing/invoices/:id
sequences_referenced_in:
  - docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd
retention: "7y"
---

# invoices

## Business purpose

Immutable financial record for each billing period. Created from Stripe invoice events and retained for financial audit and customer billing history. Once an invoice reaches `paid` status it is never mutated (immutable financial record principle).

## Ownership rules

- Owner service: `BillingService`
- Writers: `BillingService` (synced from Stripe `invoice.*` webhook events — created on `invoice.created`, updated on `invoice.payment_succeeded` / `invoice.payment_failed` / `invoice.voided`)
- Readers: `BillingService` (billing history API), `ParentApp` (invoice list and PDF download via Stripe portal link)

## Lifecycle

- Create: on `invoice.created` Stripe webhook.
- Update: `status` and `amount_paid_cents` updated on `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.voided`.
- Delete: never deleted — retained 7 years for financial audit compliance. `status = void` or `uncollectible` represents terminal failure states.
- State machine: `@inline`
  - `draft` → `open` (invoice finalized by Stripe)
  - `open` → `paid` (payment succeeds)
  - `open` → `void` (manually voided)
  - `open` → `uncollectible` (payment retries exhausted, Stripe marks uncollectible)
  - `paid` → (immutable — no further transitions)

## Related APIs

- `GET /v1/billing/invoices` — paginated list of invoices for the authenticated household
- `GET /v1/billing/invoices/:id` — single invoice detail (links to Stripe-hosted PDF)

## Related sequences

- `docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd` — `invoice.payment_failed` / `invoice.payment_succeeded` webhook events update this table

## Validation rules

- `amount_due_cents` and `amount_paid_cents` must be ≥ 0.
- `paid_at` must be set when `status = paid`.
- `period_end` must be after `period_start`.
- Once `status = paid`, no further mutations are allowed (enforced by BillingService).

## Edge cases

- **Immutability after payment**: BillingService rejects any mutation to a `paid` invoice row. If Stripe sends a correcting event (rare), a new invoice is created; this row is voided.
- **Idempotency**: `stripe_invoice_id` unique index prevents duplicate rows from Stripe's at-least-once webhook delivery.
- **Financial retention**: 7-year retention required for accounting compliance — hard delete is prohibited; rows are archived to cold storage after 2 years but never erased.
