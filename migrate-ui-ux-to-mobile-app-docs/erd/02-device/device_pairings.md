---
entity: device_pairings
domain: 02-device
service_owner: DeviceService
state_machine: "@inline"
api_endpoints:
  - POST /v1/devices/provision/start
  - POST /v1/device/provisioning/status
  - POST /v1/devices/provision/complete
sequences_referenced_in:
  - docs/sequences/02-device/consumer-provisioning.sequence.mmd
retention: hard
---

# device_pairings

## Business purpose

Records each provisioning attempt initiated by a parent app. Tracks the multi-step BLE pairing + device authentication + assignment handshake. Provides idempotency key (`id`) that guards re-submissions of `provision/complete`. One active attempt per device at a time (enforced by status guard).

## Ownership rules

- Owner service: `DeviceService`
- Writers: `DeviceService` (status transitions via provision/start, provisioning/status, provision/complete endpoints)
- Readers: `DeviceService`, `ParentApp` (via status polling)

## Lifecycle

- Create: `POST /v1/devices/provision/start` — `status=started`, `expires_at` set to 10 min from now.
- Update:
  - Device posts `POST /v1/device/provisioning/status` → `status` advances (`ble_paired`, `device_authenticated`).
  - Parent posts `POST /v1/devices/provision/complete` → `status=completed`, `completed_at` set.
  - Failure: `status=failed`, `failure_code` set.
- Delete: hard — expired/failed rows retained for audit; a background sweep may hard-delete rows older than 30 days.
- State machine (`@inline`): `started` → `ble_paired` → `device_authenticated` → `completed`; any step → `failed`; no transition after `expires_at` reached (attempt treated as `expired`).

## Related APIs

- `POST /v1/devices/provision/start` — creates row
- `POST /v1/device/provisioning/status` — updates status (device-side)
- `POST /v1/devices/provision/complete` — finalizes and sets completed_at

## Related sequences

- `docs/sequences/02-device/consumer-provisioning.sequence.mmd` — full provisioning lifecycle including status guard

## Validation rules

- Only one active (non-terminal) attempt allowed per `device_id`; service enforces before INSERT.
- `status` transitions validated by service state machine — invalid transition → 409.
- `expires_at` must be in the future at create time; expired attempts rejected by service before processing.

## Edge cases

- Re-submit of `provision/complete` with same `id` while `status=completed` → 409 guarded by attempt-status check.
- Expired attempt: service checks `expires_at < now()` before any transition; returns 409 `provisioning_attempt_not_ready`.
- `assigned_child_id` set only on `provision/complete`; household mismatch check fires before UPDATE.
