---
entity: devices
domain: 02-device
service_owner: DeviceService
state_machine: "@inline"
api_endpoints:
  - POST /v1/devices/register
  - POST /v1/devices/provision/start
  - POST /v1/devices/provision/complete
  - POST /v1/devices/heartbeat
  - POST /v1/devices/:deviceId/decommission
  - POST /v1/devices/:deviceId/transfer/start
sequences_referenced_in:
  - docs/sequences/02-device/factory-registration.sequence.mmd
  - docs/sequences/02-device/consumer-provisioning.sequence.mmd
  - docs/sequences/02-device/heartbeat.sequence.mmd
  - docs/sequences/02-device/decommission.sequence.mmd
  - docs/sequences/02-device/transfer.sequence.mmd
retention: hard
---

# devices

## Business purpose

Central registry for every physical TBOT device unit. Created at factory registration and tracks the device's full lifecycle from factory-new through assignment to a household child profile through decommissioning. Authoritative source of device identity, ownership, and connectivity state for all other backend systems.

## Ownership rules

- Owner service: `DeviceService`
- Writers: `DeviceService` (status/lifecycle transitions, heartbeat updates), `DecommissionWorker` (decommission finalization), `TransferWorker` (transfer finalization + household re-assignment)
- Readers: `DeviceService`, `ConfigService` (device config pull), `RealtimeService` (session connect), `AdminCommandService`, `ParentApp` (via API)

## Lifecycle

- Create: factory registration via `POST /v1/devices/register` (FactoryCLI over mTLS). `status=factory_new`, `lifecycle_state=unassigned`.
- Update:
  - Consumer provisioning: `status=provisioning` → `status=active`, `lifecycle_state=assigned`, `owner_user_id` + `current_household_id` + `assigned_child_id` set.
  - Heartbeat: `last_seen_at`, `firmware_version`, `battery_level`, `connectivity_metrics` updated. `status` transitions `offline→active` or `active` maintained.
  - Offline sweep: `status=offline` when `last_seen_at < now() - threshold`.
  - Decommission: `lifecycle_state=decommission_pending` (sync), then `lifecycle_state=decommissioned`, `status=decommissioned`, `decommissioned_at` set (async via DecommissionWorker).
  - Transfer: `lifecycle_state=transfer_pending` (sync), then `current_household_id=NULL`, `lifecycle_state=unassigned`, `status=factory_new` (TransferWorker reset), then re-provisioned by target household.
- Delete: hard — no row deletion; lifecycle reaches `decommissioned` terminal state.
- State machine (`@inline`):
  - `status`: `factory_new` → `provisioning` → `active` ↔ `offline` → `decommissioned`; `factory_new` → `quarantined` (factory fail path)
  - `lifecycle_state`: `unassigned` → `provisioning` → `assigned` → `transfer_pending` → `unassigned` (after transfer reset) or `assigned` → `decommission_pending` → `decommissioned`

## Related APIs

- `POST /v1/devices/register` — factory creates row (mTLS, FactoryCLI)
- `POST /v1/devices/provision/start` — parent app starts provisioning attempt
- `POST /v1/devices/provision/complete` — parent app finalizes assignment
- `POST /v1/devices/heartbeat` — device updates last_seen_at + metrics
- `POST /v1/devices/:deviceId/decommission` — owner initiates decommission
- `POST /v1/devices/:deviceId/transfer/start` — owner initiates transfer

## Related sequences

- `docs/sequences/02-device/factory-registration.sequence.mmd` — INSERT on factory registration
- `docs/sequences/02-device/consumer-provisioning.sequence.mmd` — UPDATE on provision/complete; lock + ownership assignment
- `docs/sequences/02-device/heartbeat.sequence.mmd` — UPDATE last_seen_at, status transitions; offline sweep
- `docs/sequences/02-device/decommission.sequence.mmd` — lifecycle_state transition + DecommissionWorker finalization
- `docs/sequences/02-device/transfer.sequence.mmd` — lifecycle_state=transfer_pending; TransferWorker resets household

## Validation rules

- `serial_number` UNIQUE enforced at DB (`uq_devices_serial_number`); format `TBT-YYYY-{6digits}` enforced by service.
- `status=quarantined` set only by FactoryCLI on critical test failure; cannot be unset via consumer API.
- `lifecycle_state` transitions enforced by DeviceService state machine (invalid transitions → 409).
- Decommission rejected if `lifecycle_state in {decommission_pending, decommissioned}` (idempotent return) or if OTA pending (409).
- `battery_level` must be 0–100 inclusive.

## Edge cases

- Duplicate serial registration: `ON CONFLICT (serial_number)` → 409 `serial_already_registered`.
- Heartbeat rate-limited: service short-circuits BEFORE DB write if within rate-limit window.
- Transfer broken midway: integrity job detects unclosed ownership history → freezes `transfer_pending` + alerts support.
- Cross-domain consistency: `owner_user_id`, `current_household_id`, `assigned_child_id` are eventually consistent with identity service — device service does not join across domain; identity deletion triggers `DecommissionWorker` via event.
