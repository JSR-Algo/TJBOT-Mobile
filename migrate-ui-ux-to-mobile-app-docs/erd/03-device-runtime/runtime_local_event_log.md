---
entity: runtime_local_event_log
domain: 03-device-runtime
service_owner: DeviceService
state_machine: none
api_endpoints:
  - POST /v1/devices/runtime/events
sequences_referenced_in:
  - docs/sequences/03-device-runtime/offline-fallback.sequence.mmd
  - docs/sequences/03-device-runtime/safe-mode-entry.sequence.mmd
retention: 30d
---

# runtime_local_event_log

## Business purpose

Upload-batch table for on-device runtime events. The RuntimeApp buffers events locally (e.g. audio overruns, WS disconnects, config changes, fault codes) and uploads them as batches once connectivity is available. Provides backend visibility into on-device behavior that cannot be observed in real time — especially offline periods, fault storms, and reconnect patterns.

## Ownership rules

- Owner service: `DeviceService` (receives and persists upload)
- Writers: `DeviceService` (on device upload endpoint)
- Readers: `DeviceService`, `AdminCommandService` (support diagnostics), fleet monitoring (fault rate aggregation)

## Lifecycle

- Create: device uploads event batch. One row per event. Batch may contain events from offline period (device_ts will lag uploaded_at).
- Update: never — each event is immutable once uploaded.
- Delete: hard retention sweep at 30 days. Fleet alert queries must use time-bounded indexes.

## Related APIs

- `POST /v1/devices/runtime/events` — device uploads event batch

## Related sequences

- `docs/sequences/03-device-runtime/offline-fallback.sequence.mmd` — reconnect events and deferred job completions appear here
- `docs/sequences/03-device-runtime/safe-mode-entry.sequence.mmd` — fault events (E-BOT-801, E-THM-601, E-MEM-701, E-AUD-102) uploaded in safe-mode heartbeat batch

## Validation rules

- `severity` must be one of: `info`, `warning`, `critical`.
- `device_ts` must not be in the future (clock skew tolerance: 5 min).
- `payload` shape validated per `event_type` — unknown event_type stores raw payload without validation (forward-compatibility).

## Edge cases

- Offline events: `device_ts` may predate `uploaded_at` by hours if device was offline. Queries must use `device_ts` for chronological ordering, not `created_at`.
- Deferred jobs that exceed 8KB heap budget are dropped on device; no corresponding upload row (gap is expected).
- Batch upload idempotency: service uses `(device_id, event_type, device_ts)` composite as a natural dedup key — duplicates silently ignored.
