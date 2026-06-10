---
entity: config_documents
domain: 08-config
service_owner: ConfigService
state_machine: none
api_endpoints:
  - GET /v1/config/fetch
  - POST /v1/config/applied
  - POST /admin/fleet/cohorts/:id/push
  - GET /admin/fleet/propagation-status
retention: hard
sequences_referenced_in:
  - docs/sequences/08-config/assembly-and-signing.sequence.mmd
  - docs/sequences/08-config/mqtt-push-and-fetch.sequence.mmd
  - docs/sequences/_cross/config-propagation-controls-to-device.sequence.mmd
---

# config_documents

## Business purpose

One row per device pointing at the active signed config blob. The 1:1 handle every
device fetches at boot and after every controls / template change. Version history
lives in `config_versions`; this table answers only "what config should device X be
running right now?".

## Ownership rules

- Owner service: `ConfigService` (specifically `ConfigAssembler`).
- Writers: `ConfigAssembler` (assemble + sign), device runtime via `POST /v1/config/applied` (sets `applied_at`).
- Readers: every device on every `GET /v1/config/fetch`, `MqttBroker` push pipeline, admin propagation-status console, reconciliation job (sys-08 §Failure Modes "stale_count").

## Lifecycle

- Create: first config assembly after initial provisioning (sys-02 `initial_provision` trigger).
- Update: every rebuild (parent controls change, template update, cohort change, admin push, rollback) advances `current_version_id` and emits a new `config_versions` row.
- Delete: hard delete on device decommission (sys-02). No COPPA scope — this row contains no child data.

## Related APIs

- `GET /v1/config/fetch` — device pulls latest signed blob (mTLS)
- `POST /v1/config/applied` — device acks apply (sets `applied_at`)
- `POST /admin/fleet/cohorts/:id/push` — admin triggers rebuild for cohort members
- `GET /admin/fleet/propagation-status` — admin sees stale devices

## Related sequences

- `docs/sequences/08-config/assembly-and-signing.sequence.mmd` — pipeline that writes here
- `docs/sequences/08-config/mqtt-push-and-fetch.sequence.mmd` — MQTT notify + HTTPS pull
- `docs/sequences/_cross/config-propagation-controls-to-device.sequence.mmd` — parent-controls → device fan-out

## Validation rules

- `schema_version` matches `^\\d+\\.\\d+$` (RFC subset of semver major.minor).
- `current_version_id` must reference a `config_versions` row for the same `device_id`.
- `applied_at` ≥ corresponding `config_versions.issued_at` (set by device ack).

## Edge cases

- `applied_at` may lag `current_version_id` by hours when a device is offline; reconciliation job (5-min) raises `config_propagation_stale_count` alert if delta > 2 hours.
- Race: device may receive MQTT notify for an older version after a fast subsequent rebuild; device-side `config_version` delta check (sys-08 mqtt-push-and-fetch step 7) drops the stale notify.
- 1:1 invariant: insert / upsert MUST be keyed by `device_id` (unique index enforces).
