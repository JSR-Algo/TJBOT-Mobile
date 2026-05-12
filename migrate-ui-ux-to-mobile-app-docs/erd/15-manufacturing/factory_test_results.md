---
entity: factory_test_results
domain: 15-manufacturing
service_owner: FactoryCLI
state_machine: none
api_endpoints:
  - "@no-api"
sequences_referenced_in:
  - docs/sequences/15-manufacturing/factory-provision-and-test.sequence.mmd
retention: hard
---

# factory_test_results

## Business purpose

Immutable per-test result rows for each factory provisioning run. The factory test suite runs 27 tests per device (mic SNR, speaker SPL, servo, display, wifi, BLE, battery, NVS, flash, heap, thermal, etc.). FactoryCLI inserts one row per test per device. Provides per-test yield analytics, failure pattern detection, and warranty/RMA audit capability.

## Ownership rules

- Owner service: `FactoryCLI` (writes directly to PostgreSQL in batch after Phase 3 completion)
- Writers: `FactoryCLI` (at end of hardware validation phase)
- Readers: `FactoryCLI`, `AdminCommandService` (RMA / support investigations), manufacturing analytics

## Lifecycle

- Create: `FactoryCLI` batch-inserts one row per test after Phase 3 (hardware validation). Inserted before `factory_records` summary row.
- Update: **never** — immutable once written.
- Delete: hard — retained indefinitely alongside `factory_records`.

## Related APIs

- `@no-api` — FactoryCLI writes directly to PostgreSQL.

## Related sequences

- `docs/sequences/15-manufacturing/factory-provision-and-test.sequence.mmd` — Phase 3: loop over 27 tests; `INSERT factory_test_results {overall_result=fail, ...} then INSERT factory_test_items[]`; Phase 4 pass path: `INSERT factory_test_results {overall_result=pass, ...} then INSERT factory_test_items[] (27 rows)`

## Validation rules

- `result` must be one of `pass`, `fail`, `skip`.
- `is_critical=true` — a single `result=fail` in this row triggers overall `factory_records.overall_result=fail` + quarantine routing.
- `serial_number` denormalized — must match `factory_records.serial_number` for the parent `factory_record_id`.
- `measured_value` and `pass_threshold` stored as text (test-specific format); service does not reparse after insert.

## Edge cases

- Partial insert failure: if FactoryCLI crashes mid-batch, orphan rows may exist without a `factory_records` parent. Integrity check queries for `factory_record_id` with no parent are run at batch close.
- Skip: `result=skip` for tests that cannot run on a given hardware revision (e.g. older jig missing a fixture); `is_critical=false` implied.
- Re-test: a re-run creates a new `factory_records` row and a new set of `factory_test_results` rows; prior rows retained for audit. `serial_number` uniqueness enforced only on `factory_records`, not here.
