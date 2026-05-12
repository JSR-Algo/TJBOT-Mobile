---
entity: device_heartbeats
domain: 02-device
service_owner: DeviceService
state_machine: none
api_endpoints:
  - POST /v1/devices/heartbeat
sequences_referenced_in:
  - docs/sequences/02-device/heartbeat.sequence.mmd
retention: 30d
---

# device_heartbeats

## Business purpose

Time-series log of device heartbeat events. Each accepted heartbeat from a device writes one row capturing firmware version, battery level, connectivity metrics, and runtime state. Powers fleet health dashboards, offline detection, and safe-mode alerting. Declared as a TimescaleDB hypertable for efficient time-range queries and automated chunk retention.

## Ownership rules

- Owner service: `DeviceService`
- Writers: `DeviceService` (on accepted heartbeat — `ON CONFLICT (device_id) DO UPDATE` on snapshot; also inserts this time-series row)
- Readers: `DeviceService` (fleet health queries), `AdminCommandService` (support diagnostics), telemetry dashboards

## Lifecycle

- Create: one row per accepted heartbeat (`POST /v1/devices/heartbeat`). Rate-limited: subsequent heartbeats within the rate-limit window are short-circuited before DB write (202 `heartbeat_ignored`).
- Update: never — each heartbeat is a new time-series row; current state is mirrored to `devices.last_seen_at` / `devices.battery_level` / `devices.connectivity_metrics`.
- Delete: automated chunk expiry via TimescaleDB retention policy — rows older than 30 days dropped at chunk granularity.

## Related APIs

- `POST /v1/devices/heartbeat` — device posts metrics; accepted heartbeats create one row

## Related sequences

- `docs/sequences/02-device/heartbeat.sequence.mmd` — DeviceService writes `device_heartbeat_snapshots` (latest-state upsert on `devices`) and this time-series table on each accepted heartbeat

## Validation rules

- `battery_level` must be 0–100 inclusive if provided.
- `runtime_state` values validated against known enum set; unknown values stored as-is for forward-compatibility.
- Rate-limit window checked AFTER identity validation (404/403 never rate-throttled, per sequence spec).

## Edge cases

- TimescaleDB hypertable: `created_at` is chunk dimension with 1-day interval. Do not query without `created_at` range predicate in production — full scans will be expensive.
- Retention: chunk drop is irreversible. Support bundle requests for a device must be within the 30-day window.
- `fault_code` populated only when `runtime_state=SAFE_MODE`; null otherwise.
