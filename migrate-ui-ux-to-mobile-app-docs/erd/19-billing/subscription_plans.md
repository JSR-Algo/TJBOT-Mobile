---
entity: subscription_plans
domain: 19-billing
service_owner: BillingService
state_machine: none
api_endpoints:
  - GET /v1/billing/plans
sequences_referenced_in:
  - docs/sequences/19-billing/entitlement-check-session-start.sequence.mmd
retention: hard
---

# subscription_plans

## Business purpose

Catalog of purchasable billing tiers (e.g. TBOT Plus Monthly, TBOT Plus Annual). Each plan maps 1:1 to a Stripe Price object and defines the entitlement parameters (turn limits, session limits, feature flags) granted to subscribing households.

## Ownership rules

- Owner service: `BillingService`
- Writers: `BillingService` (on plan creation or Stripe Price sync)
- Readers: `BillingService` (entitlement resolution), `ParentApp` (pricing page display)

## Lifecycle

- Create: populated at launch by BillingService seed or Stripe webhook `product.created` / `price.created`.
- Update: `active` toggled when a plan is retired; `amount_cents` updated on Stripe price change.
- Delete: hard — plans are never deleted; set `active = false` to retire them. Existing subscriptions referencing retired plans continue until expiry.
- State machine: none — plans are reference data, not state-bearing.

## Related APIs

- `GET /v1/billing/plans` — returns active plans for pricing page

## Related sequences

- `docs/sequences/19-billing/entitlement-check-session-start.sequence.mmd` — entitlement resolution reads `daily_turn_limit`, `daily_session_limit`, `features` from this table via the active subscription

## Validation rules

- `amount_cents` must be ≥ 0.
- `currency` must be a valid ISO 4217 code.
- `stripe_price_id` must be unique — enforced by DB unique index.
- `features` JSON must be an object with boolean values; validated by BillingService on write.

## Edge cases

- A plan can be retired (`active = false`) while existing subscriptions reference it; subscriptions continue to resolve entitlements from the plan row.
- Plan changes (price/limits) only affect new subscribers — existing subscriptions require explicit upgrade/downgrade via `subscriptions.plan_id` update.
