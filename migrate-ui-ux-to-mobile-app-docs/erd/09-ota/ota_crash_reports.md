---
entity: ota_crash_reports
domain: 09-ota
service_owner: OtaService
state_machine: none
api_endpoints:
  - POST /v1/ota/result
retention: 365d
sequences_referenced_in:
  - docs/sequences/09-ota/crash-rate-auto-pause.sequence.mmd
  - docs/sequences/09-ota/device-check-and-download.sequence.mmd
---

# ota_crash_reports

## Business purpose

Triage detail for every firmware-attributable crash collected during an OTA rollout. One row per crash; tied 1:1 to the `ota_assignments` row that captured the `failure` / `rollback` status transition. Powers the SEV-2 auto-pause dashboard.

## Ownership rules

- Owner service: `OtaService`.
- Writers: `POST /v1/ota/result` handler when the device reports a crash code; sys-11 telemetry ingest pipe forwards `device.error` events tagged with the active `release_id`.
- Readers: `CrashMonitorWorker` (auto-pause logic), admin dashboards, sys-13 incident post-mortems.

## Lifecycle

- Create: at crash report time.
- Update: never — immutable. **Lifecycle.update = never.**
- Delete: 1-year retention via sys-14 `ota_attempts_cleanup` companion sweep.

## Related APIs

- `POST /v1/ota/result` — INSERT path when `status ∈ {failed, rollback}`

## Related sequences

- `docs/sequences/09-ota/crash-rate-auto-pause.sequence.mmd` — drives the auto-pause decision
- `docs/sequences/09-ota/device-check-and-download.sequence.mmd` — feeds crash detail at result-report time

## Validation rules

- `assignment_id` MUST reference a row whose `status ∈ {failed, rollback}` (enforced in app code).
- `failure_code` is a structured string; the crash-rate aggregate counts only codes in the spec's "crash" set (`E-SAFE-901`, `E-SAFE-902`).
- `stack_trace` is opaque text — no parsing in this ERD, only persistence.

## Edge cases

- A single `ota_assignments` row should have at most one crash report; if a device reports multiple crashes for the same offer, ALL crashes share `assignment_id` but each gets its own row — uniqueness NOT enforced (some devices may report multiple times during rollback retries).
- Devices that crash so hard they cannot reach `POST /v1/ota/result` are detected by absence of result within 24h of `offered`; sys-09 device-check-and-download skips them via stuck-device threshold (3 failures in 7d).
- COPPA: no child data — crash reports carry only device-level fields. Safe for 1-year retention.
- `device_id` is denormalised for fast crash-rate queries; the canonical FK is via `assignment_id → ota_assignments.device_id`.
