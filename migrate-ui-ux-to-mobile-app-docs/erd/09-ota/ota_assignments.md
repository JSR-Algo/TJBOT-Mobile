---
entity: ota_assignments
domain: 09-ota
service_owner: OtaService
state_machine: '@inline'
api_endpoints:
  - GET /v1/ota/check
  - POST /v1/ota/result
  - GET /admin/ota/:id/attempts
retention: 365d
sequences_referenced_in:
  - docs/sequences/09-ota/device-check-and-download.sequence.mmd
  - docs/sequences/09-ota/crash-rate-auto-pause.sequence.mmd
---

# ota_assignments

## Business purpose

Per-`(device, release)` attempt row. Every time a device is offered firmware (via `GET /v1/ota/check`), exactly one row is created with `status='offered'`. The status field advances as the device reports back via `POST /v1/ota/result`. Drives crash-rate monitoring, stuck-device detection, and rollout-progress dashboards.

## Ownership rules

- Owner service: `OtaService`.
- Writers: `OtaService` (INSERT on offer, UPDATE on result report); `CrashMonitorWorker` reads but does not mutate.
- Readers: `CrashMonitorWorker`, admin dashboard, sys-11 cost / latency analytics, sys-14 retention `ota_attempts_cleanup` job.

## Lifecycle

- Create: device-check eligibility passes → INSERT `status='offered'`.
- Update: each `POST /v1/ota/result` transitions status (offered → downloading → downloaded → flashing → verifying → success | failed | rollback). `skipped` is set server-side when the device is filtered (stuck-device, cohort exclusion, rollout-not-eligible).
- Delete: 1-year retention via sys-14 `ota_attempts_cleanup` job.

State machine (inline): `offered → downloading → downloaded → flashing → verifying → success` (happy path); branches at any node to `failed` / `rollback`. `offered → skipped` for filtered devices.

## Related APIs

- `GET /v1/ota/check` — INSERT row
- `POST /v1/ota/result` — UPDATE row
- `GET /admin/ota/:id/attempts` — admin dashboard list

## Related sequences

- `docs/sequences/09-ota/device-check-and-download.sequence.mmd` — full lifecycle
- `docs/sequences/09-ota/crash-rate-auto-pause.sequence.mmd` — read by 5-min crash monitor

## Validation rules

- `(device_id, release_id)` is **not** unique — a device may retry a release (each retry is a new row). Stuck-device threshold is "3+ rows with status ∈ {failed, rollback} in trailing 7 days".
- `from_version` / `to_version` are semver strings frozen at offer time.
- `failure_code` enum is open-set (spec lists `E-SAFE-901`, `E-SAFE-902` for crash classification but does not enumerate all codes).

## Edge cases

- Race with auto-pause (sys-09 `rollout_id_mismatch`): a device may have a row in `status='downloading'` while `ota_releases.status` transitions to `paused`. Subsequent `GET /v1/ota/check` returns 304; in-flight download MAY complete (server cannot stop it), but the result-report path will record `failed` with `failure_code='rollout_paused_mid_flight'`.
- `skipped` rows count against stuck-device threshold (so a device permanently in a deprecated cohort eventually stops being polled).
- `download_duration_ms` and `flash_duration_ms` are reported by the device — sys-13 telemetry validates the values are non-negative.
- Cross-domain FK `device_id` → DeviceService `devices`; this lane keeps the column only.
