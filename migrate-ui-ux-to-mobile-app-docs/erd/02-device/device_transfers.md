---
entity: device_transfers
domain: 02-device
service_owner: DeviceService
state_machine: "@inline"
api_endpoints:
  - POST /v1/devices/:deviceId/transfer/start
sequences_referenced_in:
  - docs/sequences/02-device/transfer.sequence.mmd
retention: hard
---

# device_transfers

## Business purpose

Records each household-to-household device transfer request. Tracks the multi-phase lifecycle: initiated by source owner → source device factory-resets → target household claims the device. One active transfer per device enforced. Provides audit trail and integrity-job anchor for detecting broken transfers.

## Ownership rules

- Owner service: `DeviceService`
- Writers: `DeviceService` (initiation, status sync), `TransferWorker` (async finalization: factory-reset confirmation, target claim, completion)
- Readers: `DeviceService`, `ParentApp` (via transfer status polling), `AdminCommandService` (support investigations)

## Lifecycle

- Create: `POST /v1/devices/:deviceId/transfer/start` — `status=initiated`. `devices.lifecycle_state` set to `transfer_pending` in same txn.
- Update:
  - Source device sends factory-reset signal → TransferWorker sets `status=awaiting_factory_reset` → `factory_reset_confirmed_at`, then closes `device_ownership_history`.
  - Target household completes `provision/start` → `status=awaiting_target_claim`.
  - Target completes provisioning → `status=completed`, `completed_at`, `target_household_id` set.
  - Failure: `status=failed`, `failure_code` set.
  - Expired: integrity job detects stale non-terminal rows → freeze + support alert.
- Delete: hard — terminal rows retained for audit.
- State machine (`@inline`): `initiated` → `awaiting_factory_reset` → `awaiting_target_claim` → `completed`; any step → `failed` or `expired`; `initiated` → `cancelled` (source owner cancels before reset).

## Related APIs

- `POST /v1/devices/:deviceId/transfer/start` — creates row, sets device lifecycle_state

## Related sequences

- `docs/sequences/02-device/transfer.sequence.mmd` — full transfer lifecycle including TransferWorker steps and broken-midway detection

## Validation rules

- Only one non-terminal transfer allowed per `device_id`; service enforces before INSERT (409 `transfer_already_in_progress`).
- Transfer blocked if `devices.lifecycle_state` has pending OTA (409 `device_busy_pending_ota`).
- Requesting user must have `owner` role for the device (403 `not_owner_role`).
- `expires_at` enforced; integrity job fires alerts if `status` non-terminal after `expires_at`.

## Edge cases

- Transfer broken midway (device reset but target never claims): integrity job detects `lifecycle_state=transfer_pending` with `factory_reset_confirmed_at` set but no `awaiting_target_claim` transition after threshold → freezes and alerts support.
- Source household FK (`source_household_id`) remains after transfer; `target_household_id` set only once target provisioning completes.
- Cancelled transfer: `devices.lifecycle_state` must be rolled back to `assigned` in same txn.
