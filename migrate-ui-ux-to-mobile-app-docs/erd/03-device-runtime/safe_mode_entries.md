---
entity: safe_mode_entries
domain: 03-device-runtime
service_owner: DeviceService
state_machine: none
api_endpoints:
  - POST /v1/devices/runtime/safe-mode
sequences_referenced_in:
  - docs/sequences/03-device-runtime/safe-mode-entry.sequence.mmd
  - docs/sequences/03-device-runtime/boot.sequence.mmd
retention: 180d
---

# safe_mode_entries

## Business purpose

Records each safe-mode entry event uploaded by the device. Longer retention than boot reports (180 days) because safe-mode incidents are support diagnostics artifacts — parents contacting support may reference events weeks after they occurred. Tracks trigger type, fault code, device-side timestamps, and resolution outcome to support root-cause analysis and fleet health monitoring.

## Ownership rules

- Owner service: `DeviceService` (receives and persists upload)
- Writers: `DeviceService` (on device safe-mode upload endpoint)
- Readers: `DeviceService`, `AdminCommandService` (support investigations), fleet monitoring (safe-mode rate alerting)

## Lifecycle

- Create: device uploads safe-mode entry batch. One row per distinct safe-mode entry event. Device sets `safe_mode_until` NVS marker on entry; records are uploaded on next connectivity window.
- Update: `exited_at_device_ts` and `resolution` may be updated when device uploads the exit record in a subsequent batch.
- Delete: hard retention sweep at 180 days. Longer window than boot reports intentionally — support diagnostics need historical depth.

## Related APIs

- `POST /v1/devices/runtime/safe-mode` — device uploads safe-mode entry/exit batch

## Related sequences

- `docs/sequences/03-device-runtime/safe-mode-entry.sequence.mmd` — supervisor task triggers safe-mode; heartbeat includes `runtime.state=SAFE_MODE` and `faults.lastFaultCode`; fleet alert fires if rate > 1% over 30 min
- `docs/sequences/03-device-runtime/boot.sequence.mmd` — `boot_fail_window >= 3` path triggers `safe_mode_entered` boot result; linked by `device_id` and time range

## Validation rules

- `trigger` must match one of the defined enum values; unknown triggers rejected (not stored as raw string unlike `runtime_local_event_log`).
- `entered_at_device_ts` must not be in the future (clock skew tolerance: 5 min).
- `exited_at_device_ts` must be after `entered_at_device_ts` if provided.
- `support_token` is exactly 6–8 alphanumeric characters if set (matches device display format).

## Edge cases

- Still-active safe mode: `exited_at_device_ts=null`, `resolution=still_active`. Fleet monitoring queries for open incidents using `resolution=still_active` index.
- Multiple safe-mode entries in one boot cycle: each is a distinct row.
- Device never exits safe-mode before battery dies: `exited_at_device_ts` remains null; `resolution=unknown` after 30-day staleness check.
- Support bundle request: `AdminCommandService` queries by `device_id` + time range within 180-day retention window.
