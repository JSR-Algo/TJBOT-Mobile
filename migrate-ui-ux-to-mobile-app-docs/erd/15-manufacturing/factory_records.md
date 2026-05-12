---
entity: factory_records
domain: 15-manufacturing
service_owner: FactoryCLI
state_machine: none
api_endpoints:
  - "@no-api"
sequences_referenced_in:
  - docs/sequences/15-manufacturing/factory-provision-and-test.sequence.mmd
retention: hard
---

# factory_records

## Business purpose

Immutable summary record of each device's factory provisioning and test run. Created by FactoryCLI after Phase 4 (production finalize) on pass, or after Phase 3 (hardware validation) on critical test failure. One record per serial number. Provides manufacturing yield tracking, batch quality reporting, and the audit trail linking a physical device to its factory operator, workstation, and test date.

## Ownership rules

- Owner service: `FactoryCLI` (writes directly to PostgreSQL via factory-internal credentials)
- Writers: `FactoryCLI` (at end of provisioning workflow)
- Readers: `FactoryCLI`, `AdminCommandService` (support + RMA investigations), manufacturing analytics

## Lifecycle

- Create: `FactoryCLI` inserts one row at the end of the factory workflow — after `factory_test_results` rows are inserted.
- Update: **never** — immutable once written. If a device is re-tested (re-run on transient failure), the unique constraint on `serial_number` prevents duplicate records; re-runs must use a new `factory_records` row (prior record retained for audit).
- Delete: hard — retained indefinitely. Manufacturing and warranty audit requirements preclude deletion.

## Related APIs

- `@no-api` — FactoryCLI writes directly to PostgreSQL; no REST endpoint exposes this table for creation.

## Related sequences

- `docs/sequences/15-manufacturing/factory-provision-and-test.sequence.mmd` — Phase 4 success path: `INSERT factory_test_results {overall_result='pass', ...}` then parent record here

## Validation rules

- `serial_number` UNIQUE — one record per physical unit.
- `overall_result=fail` or `quarantine` requires `notes` to be non-null (operator must document reason).
- `device_id` nullable — backend registration (`POST /v1/devices/register`) may fail transiently; device still gets a factory record; retry of registration links `device_id` later.
- `test_duration_ms` must be positive.

## Edge cases

- Backend register fails after test pass: factory record is created with `device_id=null`. Operator retries register (idempotent on `serial_number`); `device_id` set in a subsequent UPDATE (sole permitted update path).
- Label printer failure: factory record is still written as PASS; re-print is manual. No record update.
- Quarantine: `overall_result=quarantine` — device routed to repair queue; no `devices` row created.
