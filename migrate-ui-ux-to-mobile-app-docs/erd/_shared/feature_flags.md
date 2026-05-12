---
entity: feature_flags
domain: _shared
service_owner: PlatformGateway
state_machine: none
api_endpoints:
  - GET /flags
  - PUT /flags/:key
retention: hard
sequences_referenced_in: []
no_sequence: true
---

# feature_flags

## Business purpose

Simple, polymorphic, scope-aware feature toggle store. Powers gradual rollouts, A/B exclusion, and operational kill-switches across services. Distinct from sys-08 `config_documents` (which are signed device-fleet payloads).

## Ownership rules

- Owner service: `PlatformGateway` (read-mostly via cache); admin tooling writes.
- Writers: admin operators via flag-management endpoints (gated by `super_admin` role).
- Readers: every service via in-process cache that polls + invalidates on TTL or pub/sub message.

## Lifecycle

- Create: admin sets a flag for a scope.
- Update: change value, toggle enabled_at / disabled_at.
- Delete: hard-deleted when retired (no longer referenced in code).
- State machine: none — value is the state.

## Related sequences

`@no-sequence` — flag reads are too granular to motivate a dedicated sequence. The flag store is implicit infrastructure.

## Validation rules

- `key` is dotted-namespace: `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`.
- For `scope='global'`, `scope_target_id` MUST be null.
- For `scope != 'global'`, `scope_target_id` MUST be set.
- `value` JSON kind must match `value_kind`.

## Edge cases

- Cache coherence: services maintain an in-process cache with a 30s TTL; admin writes also broadcast invalidation via Redis pub/sub (best-effort).
- Resolution precedence: `device > user > household > cohort > global`. App layer walks the chain at lookup time.
- Cohort scope: `scope_target_id` is the cohort slug; cohort membership lives in sys-08 `config_cohorts` (read-only cross-reference from this side).
