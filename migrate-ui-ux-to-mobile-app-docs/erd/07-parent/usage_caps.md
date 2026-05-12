---
entity: usage_caps
domain: 07-parent
service_owner: ControlsService
state_machine: none
api_endpoints:
  - '@no-api'
retention: coppa-180d
sequences_referenced_in:
  - docs/sequences/07-parent/controls-update.sequence.mmd
---

# usage_caps

## Business purpose

Records how many minutes a child has consumed on a given device for a given calendar day, enforcing the parent-configured `daily_limit_minutes` from `parent_controls`. `capped_at` is set when the limit is hit, preventing new session starts for that day. Contains child-linked data — COPPA retention applies.

## Ownership rules

- Owner service: `ControlsService`
- Writers: `ControlsService` (increments on session close), `RealtimeService` (checks before session open).
- Readers: `ControlsService`, `RealtimeService`.

## Lifecycle

- Create: upsert on first session close for the day.
- Update: `consumed_minutes` incremented; `capped_at` set when limit reached.
- Delete: soft-delete via `deleted_at`; COPPA hard-delete at 180 days via sys-14.

## Related APIs

- No direct API — internal enforcement table.

## Related sequences

- `docs/sequences/07-parent/controls-update.sequence.mmd` — daily limit checked at session open via this table

## Validation rules

- `consumed_minutes` ≥ 0; never decremented.
- `(device_id, child_profile_id, cap_date)` unique — one row per child per device per day.

## Edge cases

- Parent raises limit mid-day: `capped_at` cleared, child can resume.
- Cross-domain refs: `device_id` → `devices.id` (DeviceService), `child_profile_id` → `children.id` (IdentityService); FKs enforced in app, not DB.
