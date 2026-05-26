---
entity: device_decommissions
domain: 02-device
service_owner: DeviceService
state_machine: none
api_endpoints:
  - POST /v1/devices/:deviceId/decommission
sequences_referenced_in:
  - docs/sequences/02-device/decommission.sequence.mmd
retention: hard
---

# device_decommissions

## Business purpose

Immutable audit record created once per device decommission event. Captures who decommissioned the device, which household owned it, and when the DecommissionWorker finalized the operation. Provides permanent audit trail for support diagnostics and GDPR/COPPA deletion compliance verification.

## Ownership rules

- Owner service: `DeviceService`
- Writers: `DecommissionWorker` (creates row on finalization)
- Readers: `DeviceService`, `AdminCommandService` (support investigations), audit pipeline

## Lifecycle

- Create: `DecommissionWorker` creates exactly one row per device decommission on finalization after `devices.lifecycle_state` transitions to `decommissioned`.
- Update: **never** — this record is immutable. `updated_at` equals `created_at`.
- Delete: hard — retained indefinitely per security control requirement (decommission audit must not be erasable).

## Related APIs

- `POST /v1/devices/:deviceId/decommission` — triggers the decommission flow; DecommissionWorker creates this record asynchronously

## Related sequences

- `docs/sequences/02-device/decommission.sequence.mmd` — DecommissionWorker finalizes by writing this record alongside closing `device_ownership_history`

## Validation rules

- Exactly one record per decommission event; service enforces idempotency — if `devices.lifecycle_state=decommissioned` already, no second record created.
- `decommissioned_at` must match the timestamp set on `devices.decommissioned_at` (same txn or near-identical).
- `household_id` and `initiated_by_user_id` captured at time of decommission (not updated if identity changes later).

## Edge cases

- Immutability: no `UPDATE` SQL path exists for this table. Any mutation is a bug.
- COPPA: even if household or user is later deleted under COPPA/GDPR, the decommission record is retained (references nulled on identity side, not this side).
- Duplicate decommission call: idempotent API returns 200 with current `devices.lifecycle_state` without re-inserting this record.
