---
entity: entitlements
domain: 19-billing
service_owner: BillingService
state_machine: none
api_endpoints:
  - GET /internal/v1/entitlements/:householdId
sequences_referenced_in:
  - docs/sequences/19-billing/entitlement-check-session-start.sequence.mmd
  - docs/sequences/_cross/billing-entitlement-session-start.sequence.mmd
retention: coppa-on-deletion
---

# entitlements

## Business purpose

Represents what content a specific child profile can access, derived from the household's active subscription. Entitlements are the read-side projection that RealtimeService checks on every session start. They are computed by BillingService from the subscription and cached in Redis; this table is the authoritative DB-side record.

## Ownership rules

- Owner service: `BillingService`
- Writers: `BillingService` (creates/updates on subscription lifecycle events — new subscription, renewal, upgrade, cancellation)
- Readers: `BillingService` (entitlement resolution cache-miss fallback), `RealtimeService` (indirectly via entitlement API), `ContentService` (feature-gated content filtering)

## Lifecycle

- Create: when a household completes checkout; one entitlement row per child in the household.
- Update: on subscription renewal (extend `valid_until`), plan upgrade/downgrade (update `tier` and `features`), and on child profile addition to the household.
- Delete: hard-deleted when the child is deleted (COPPA compliance); cascades from child deletion in IdentityService.
- State machine: none — validity window (`valid_from` / `valid_until`) serves as implicit state.

## Related APIs

- `GET /internal/v1/entitlements/:householdId` — internal-RPC used by RealtimeService; returns all active entitlements for the household

## Related sequences

- `docs/sequences/19-billing/entitlement-check-session-start.sequence.mmd` — entitlement check resolves from this table on Redis cache miss
- `docs/sequences/_cross/billing-entitlement-session-start.sequence.mmd` — cross-system narrative showing entitlement check in session-start critical path

## Validation rules

- `valid_until` must be after `valid_from`.
- `tier` must match a known value in `subscription_plans` (validated by BillingService, not a FK — decoupled for plan evolution).
- `features` JSON must be an object with boolean values.

## Edge cases

- **Cross-domain FKs**: `child_id` references `children` in IdentityService (Lane B). BillingService receives child-created events via outbox to create entitlement rows.
- **COPPA deletion**: when a child is deleted, all entitlement rows for that child must be purged immediately (hard delete, not soft delete).
- **Subscription expiry**: when `subscriptions.status` transitions to `expired`, entitlement rows for that subscription are not deleted but `valid_until` is left as-is; `BillingService` checks `valid_until < now()` to deny access.
- **Multi-child households**: each child in the household gets a separate entitlement row; all share the same `subscription_id`.
