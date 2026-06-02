---
entity: runtime_boot_reports
domain: 03-device-runtime
service_owner: DeviceService
state_machine: none
api_endpoints:
  - POST /v1/devices/runtime/boot-report
sequences_referenced_in:
  - docs/sequences/03-device-runtime/boot.sequence.mmd
retention: 30d
---

# runtime_boot_reports

## Business purpose

Upload-batch records of device boot events. The device (RuntimeApp) generates a boot report on each boot and uploads it to the backend once connectivity is established. Provides fleet-level visibility into boot success rates, safe-mode entry frequency, firmware signature failures, and config-apply failures. Backend state is the upload record; the authoritative boot state lives on-device in NVS.

## Ownership rules

- Owner service: `DeviceService` (receives and persists upload)
- Writers: `DeviceService` (on device upload endpoint)
- Readers: `DeviceService`, `AdminCommandService` (support diagnostics), telemetry/fleet dashboards

## Lifecycle

- Create: device uploads boot report batch after achieving connectivity. One row per boot event.
- Update: never — each boot is a distinct event row.
- Delete: hard retention sweep at 30 days (rows deleted, not soft-deleted). Support bundle requests must be within window.

## Related APIs

- `POST /v1/devices/runtime/boot-report` — device uploads boot report batch

## Related sequences

- `docs/sequences/03-device-runtime/boot.sequence.mmd` — describes boot sequence; `last_boot_reason`, `result`, `boot_fail_window` fields derive from NVS counters described in §14

## Validation rules

- `boot_count` must be monotonically increasing per device; service rejects out-of-order uploads (duplicate or stale).
- `boot_fail_window` must be 0–15 (max failures tracked in 15-min window).
- `duration_ms` must be positive; capped at 120000 (2 min) per spec timeout.

## Edge cases

- Offline boot: device may not upload report until connectivity is restored; uploaded_at will lag created_at on device by hours.
- `result=safe_mode_entered` triggers fleet alert if rate > 1% over 30 min (monitoring reads this table).
- Multiple boots before connectivity: device buffers and uploads as a batch; service inserts multiple rows.
