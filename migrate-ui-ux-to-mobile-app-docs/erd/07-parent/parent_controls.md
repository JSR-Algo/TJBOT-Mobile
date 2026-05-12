---
entity: parent_controls
domain: 07-parent
service_owner: ControlsService
state_machine: none
api_endpoints:
  - GET /v1/controls/:deviceId
  - PUT /v1/controls/:deviceId
retention: hard
sequences_referenced_in:
  - docs/sequences/07-parent/controls-update.sequence.mmd
  - docs/sequences/07-parent/dst-rebuild.sequence.mmd
---

# parent_controls

## Business purpose

Stores parental control settings for a device: daily/per-session time limits, quiet hours, timezone, and per-topic content toggles. Versioned with an optimistic concurrency counter (`version`) to handle concurrent edits from multiple parent devices. One row per device.

## Ownership rules

- Owner service: `ControlsService`
- Writers: `ControlsService` (parent PUT), `ControlsService` (DST rebuild — updates timezone offset).
- Readers: `ControlsService`, `ConfigService` (async rebuild after settings change), `SummaryWorker` (reads device_id for summary grouping).

## Lifecycle

- Create: on device pairing (one row per device; created by `DeviceService` callback or `ControlsService` on first PUT).
- Update: `PUT /v1/controls/:deviceId` — increments `version`; ConfigService async rebuild triggered.
- Delete: hard on device decommission.
- State machine: none — no status enum; `version` field is a concurrency counter, not a state.

## Related APIs

- `GET /v1/controls/:deviceId` — read current settings + version
- `PUT /v1/controls/:deviceId` — update with expected_version for optimistic concurrency

## Related sequences

- `docs/sequences/07-parent/controls-update.sequence.mmd` — optimistic concurrency via `UPDATE ... WHERE device_id=$1 AND version=$expected`
- `docs/sequences/07-parent/dst-rebuild.sequence.mmd` — `SELECT DISTINCT timezone FROM parent_controls WHERE quiet_hours_enabled=true`

## Validation rules

- `daily_limit_minutes` ∈ [30, 480] or NULL.
- `per_session_limit_min` ∈ [5, 120] or NULL.
- `quiet_hours_start` < `quiet_hours_end` when `quiet_hours_enabled=true`.
- `timezone` must be a valid IANA timezone string.

## Edge cases

- Version conflict (0 rows affected): ControlsService returns 409 with `currentVersion`; client re-fetches + merges.
- ConfigService rebuild failure: 200 returned with `configPropagationStatus: "pending"`; reconciliation cron picks up within 5 minutes.
- DST transition: daily `dst-rebuild` cron fires at 00:00 UTC, rebuilds quiet-hours config for affected timezones only.
- Cross-domain refs: `device_id` → `devices.id` (DeviceService), `household_id` → `households.id` (IdentityService); FKs enforced in app, not DB.
