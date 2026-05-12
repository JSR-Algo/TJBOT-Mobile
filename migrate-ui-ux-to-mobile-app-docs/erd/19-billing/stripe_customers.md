---
entity: stripe_customers
domain: 19-billing
service_owner: BillingService
state_machine: none
api_endpoints:
  - POST /v1/billing/checkout (creates stripe_customer lazily)
sequences_referenced_in:
  - docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd
  - docs/sequences/_cross/billing-entitlement-session-start.sequence.mmd
retention: gdpr-30d
---

# stripe_customers

## Business purpose

Maps each TBOT user to their Stripe Customer object. Serves as the join point between TBOT identity (users.id) and Stripe's billing system. One user has at most one Stripe customer record.

## Ownership rules

- Owner service: `BillingService`
- Writers: `BillingService` (created lazily on first checkout; updated on email change)
- Readers: `BillingService` (subscription and invoice lookups via Stripe API), `ParentApp` (billing management portal)

## Lifecycle

- Create: lazily on first checkout session (`POST /v1/billing/checkout`); BillingService calls Stripe `POST /v1/customers` and stores the returned `cus_...` ID.
- Update: `email` synced when user updates their email address.
- Delete: soft-delete with `gdpr-30d` window on user account deletion; Stripe customer is cancelled before row removal.
- State machine: none — reference row, not state-bearing.

## Related APIs

- `POST /v1/billing/checkout` — triggers stripe_customer creation if absent
- `GET /v1/billing/portal` — Stripe billing portal session (reads `stripe_customer_id`)

## Related sequences

- `docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd` — webhook events reference Stripe customer ID to resolve the owning user
- `docs/sequences/_cross/billing-entitlement-session-start.sequence.mmd` — entitlement resolution resolves subscription via stripe_customer

## Validation rules

- `user_id` is unique — one stripe_customer per user enforced by DB unique index.
- `stripe_customer_id` is unique — enforced by DB unique index.
- `email` is max 254 characters (RFC 5321).

## Edge cases

- If Stripe customer creation fails mid-checkout, the row is not created; next checkout retries.
- `email` on this row may lag behind `users.email` briefly; BillingService reconciles on login if mismatch detected.
- GDPR deletion: BillingService cancels the Stripe subscription first, then deletes or anonymizes this row within 30 days of user deletion request.
