---
entity: config_push_events
domain: 08-config
service_owner: ConfigService
state_machine: '@inline'
api_endpoints:
  - GET /admin/fleet/propagation-status
retention: 30d
sequences_referenced_in:
  - docs/sequences/08-config/mqtt-push-and-fetch.sequence.mmd
  - docs/sequences/08-config/assembly-and-signing.sequence.mmd
---

# config_push_events

## Business purpose

One row per discrete event in the notify → fetch → apply pipeline (or its failure modes). Powers the propagation-status dashboard, the 5-minute reconciliation job, and the `config_mqtt_push_failure_total` / `config_signature_failure_total` metrics.

## Ownership rules

- Owner service: `ConfigService`.
- Writers: `ConfigService` MQTT publisher (`notify_published`), `GET /v1/config/fetch` handler (`device_fetched`), `POST /v1/config/applied` (`device_applied`), device-side telemetry pipe via sys-11 ingest (`device_rejected_signature`), reconciliation job (`reconciliation_repaired`).
- Readers: admin propagation-status view, reconciliation cron, alerting.

## Lifecycle

- Create: events are produced by the writers listed above.
- Update: never — append-only. **Lifecycle.update = never.**
- Delete: short retention (`retention: 30d`) via sys-14 retention sweep. Older events are no longer actionable for reconciliation.

State machine (inline): no state on the row itself; each row is a single event. The conceptual "push lifecycle" advances by appending rows of different `event_kind`.

## Related APIs

- `GET /admin/fleet/propagation-status` — surfaces stale devices and per-device timelines

## Related sequences

- `docs/sequences/08-config/mqtt-push-and-fetch.sequence.mmd` — every event path
- `docs/sequences/08-config/assembly-and-signing.sequence.mmd` — `notify_published` originates here after a new version is committed

## Validation rules

- `version_id` MUST exist in `config_versions` (FK).
- `event_kind` enum exhaustively covers the propagation pipeline; new kinds require an enum migration.
- `mqtt_message_id` populated only when `event_kind='notify_published'`.

## Edge cases

- Best-effort: MQTT publish failure writes a `notify_skipped_offline` row but does NOT block assembly — device catches up on next 6h periodic poll.
- Duplicate notify (broker QoS-1 redelivery) generates multiple `notify_published` rows; reconciliation uses the latest by `emitted_at`.
- Reconciliation `reconciliation_repaired` event MUST cite the prior failure event in `error_detail.repaired_event_id` for audit.
- Cross-domain ingestion: `device_rejected_signature` events arrive via sys-11 telemetry batch ingest; the `error_detail` carries the device fault code for sys-13 incident review.
