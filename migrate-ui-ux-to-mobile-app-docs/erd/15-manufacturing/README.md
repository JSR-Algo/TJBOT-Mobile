# 15-manufacturing — Factory provisioning + test

**System spec:** `docs/site/software/systems/15-manufacturing-provisioning-factory-test.md`
**Sequences:** `docs/sequences/15-manufacturing/*.sequence.mmd`
**Owning service(s):** `FactoryCLI`, manufacturing workflows
**Lane:** C (worker-2, Phase 2)
**Status:** complete (Phase 2 Lane C).

## Entities

| Entity | Role |
|---|---|
| `factory_records` | Immutable per-unit provisioning summary (overall pass/fail/quarantine); one row per serial; retained indefinitely. |
| `factory_test_results` | Immutable per-test result rows (27 per device); yield analytics and RMA audit. |
| `factory_serial_assignments` | Global serial-number allocation registry; UNIQUE on serial_number; device_id linked after backend registration. |
