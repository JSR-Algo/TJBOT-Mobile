---
entity: telemetry_events
domain: 11-telemetry
service_owner: TelemetryService
state_machine: none
api_endpoints:
  - POST /v1/telemetry/batch
  - GET /admin/devices/:id/telemetry
retention: 90d
sequences_referenced_in:
  - docs/sequences/11-telemetry/device-batch-ingest.sequence.mmd
  - docs/sequences/11-telemetry/session-cost-attribution.sequence.mmd
---

# telemetry_events

## Business purpose

TimescaleDB hypertable backing the in-Postgres telemetry mirror. Raw events flow into Firehose → S3 for analytics; the same events are ALSO inserted here for low-latency operational queries (live device-health drill-downs, alert evaluation, support tickets). Daily partitions ensure retention sweep stays cheap.

## Ownership rules

- Owner service: `TelemetryService`.
- Writers: `POST /v1/telemetry/batch` handler after PII scan + Firehose hand-off. **Append-only.**
- Readers: support dashboards, admin device drill-down, sys-04 retro session timing, sys-10 health-based notification triggers (low_battery, device_offline), sys-09 ota crash correlation, sys-14 retention sweep.

## Lifecycle

- Create: per-event INSERT after the batch passes ingest gates (cert match, batch size, idempotency, rate-limit, PII scan).
- Update: never — append-only. **Lifecycle.update = never.**
- Delete: 90-day retention via sys-14 (S3 Glacier expire + hypertable `drop_chunks` job). The hypertable is the in-Postgres canonical for the 90-day window; older data lives only in S3.

## Hypertable declaration

```
Note: '@timescaledb-hypertable column=created_at interval=1d'
```

Emission tooling (Phase 4+) translates this to `SELECT create_hypertable('telemetry_events', 'created_at', chunk_time_interval => INTERVAL '1 day')`. The `id` PK is composite-compatible with hypertable PK rules.

## Related APIs

- `POST /v1/telemetry/batch` — device-facing (mTLS)
- `GET /admin/devices/:id/telemetry` — admin

## Related sequences

- `docs/sequences/11-telemetry/device-batch-ingest.sequence.mmd` — INSERT path
- `docs/sequences/11-telemetry/session-cost-attribution.sequence.mmd` — read path for cost calc (turn timing events)

## Validation rules

- `id` MUST be the device-supplied `event_id` (UUIDv4) — duplicates within a batch are rejected at ingest.
- `batch_id` is the idempotency key — REPLAYED batches return cached response (per spec §Processing Pipeline step 3).
- `payload` schema is event-type-specific; ingest validator enforces required keys per event type.
- `pii_scan_passed=false` rows are NEVER inserted (defensive — flag exists for forensics if a row appears).
- `event_type` ∈ {`device.boot`, `device.wake`, `device.session.start`, `device.session.end`, `device.turn.latency`, `device.error`, `device.ota.result`, `device.health`}.

## Edge cases

- COPPA scope: `child_id` and `session_id` fields make a subset of rows child-data; 90-day retention applies uniformly (spec §Data Retention table) but COPPA-driven account deletion (sys-14) cascades immediate hard-delete of all rows for the affected child / device irrespective of age.
- Hypertable + retention sweep: sys-14 `retention_policies` references this entity by name; the cleanup job calls `drop_chunks` rather than per-row DELETE to keep TimescaleDB performance.
- Clock skew: `client_timestamp_ms` may be hours off (devices that lose NTP); analytics use `server_received_at` / `created_at` exclusively.
- Sampling: `device.turn.latency` is 10% sampled (`sampling_rate=10`) unless `total_ms > 3000` (then 100%). Sampling decision happens device-side; backend honours the rate as-reported.
- Cross-domain FKs (`device_id`, `child_id`, `session_id`) — declared on producer side (DeviceService, IdentityService, RealtimeService). This lane carries only the columns.
