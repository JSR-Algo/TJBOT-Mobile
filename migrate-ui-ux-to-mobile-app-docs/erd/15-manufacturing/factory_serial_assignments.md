---
entity: factory_serial_assignments
domain: 15-manufacturing
service_owner: FactoryCLI
state_machine: none
api_endpoints:
  - "@no-api"
sequences_referenced_in:
  - docs/sequences/15-manufacturing/factory-provision-and-test.sequence.mmd
  - docs/sequences/02-device/factory-registration.sequence.mmd
retention: hard
---

# factory_serial_assignments

## Business purpose

Global serial number registry — the unique allocation ledger that prevents duplicate serials across all factory batches and operators. Each row represents one serial number assigned to one physical unit. `device_id` is linked after backend registration succeeds. Provides batch inventory audit capability and the canonical authority for answering "is this serial already used?".

## Ownership rules

- Owner service: `FactoryCLI` (allocates serial before provisioning; links `device_id` after backend registration)
- Writers: `FactoryCLI` (INSERT on serial allocation; UPDATE to link `device_id` after registration)
- Readers: `FactoryCLI`, `DeviceService` (cross-check during `POST /v1/devices/register`), `AdminCommandService` (RMA serial lookup)

## Lifecycle

- Create: `FactoryCLI` allocates serial before physical provisioning begins. `device_id` is null; `registered_at` is null.
- Update: `device_id` and `registered_at` set after `POST /v1/devices/register` succeeds. This is the only permitted update.
- Delete: hard — retained indefinitely. Serial allocation history must never be erased (duplicate prevention + RMA).

## Related APIs

- `@no-api` — FactoryCLI manages directly via PostgreSQL; `DeviceService` reads via `uq_devices_serial_number` constraint cross-check on `POST /v1/devices/register`.

## Related sequences

- `docs/sequences/15-manufacturing/factory-provision-and-test.sequence.mmd` — serial extracted via `AT+SERIAL`; registry row allocated before Phase 3 tests
- `docs/sequences/02-device/factory-registration.sequence.mmd` — `ON CONFLICT (serial_number)` in `devices` table maps to uniqueness enforced here

## Validation rules

- `serial_number` UNIQUE globally — `uq_factory_serial_assignments_serial_number` prevents duplicate allocation.
- `serial_number` format must match `TBT-YYYY-{6digits}` (enforced by FactoryCLI before INSERT).
- `device_id` must be null at INSERT; only set via explicit UPDATE after registration.
- `registered_at` must accompany `device_id` update (both set together or both null).

## Edge cases

- Duplicate serial attempt: `ON CONFLICT (serial_number)` → FactoryCLI receives unique violation and quarantines the unit for investigation.
- Registration retry after transient backend failure: `device_id` and `registered_at` updated idempotently — if already set, no-op update.
- Unregistered serials (backend register failed + not retried): rows with `device_id=null` after batch close are flagged by manufacturing audit job.
