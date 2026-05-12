---
entity: ota_cohorts
domain: 09-ota
service_owner: OtaService
state_machine: none
api_endpoints:
  - POST /admin/ota/cohorts
  - PUT /admin/ota/cohorts/:id
retention: hard
sequences_referenced_in:
  - docs/sequences/09-ota/device-check-and-download.sequence.mmd
  - docs/sequences/09-ota/upload-and-signing.sequence.mmd
---

# ota_cohorts

## Business purpose

OTA-only cohort definitions (e.g. internal beta devices, partner devices) that are not appropriate to expose in `config_cohorts`. Lets admins target firmware rollouts to a subset of a fleet cohort or to wholly distinct OTA-test groups.

## Ownership rules

- Owner service: `OtaService`.
- Writers: admin OTA console.
- Readers: `OtaService` device-check handler; `CrashMonitorWorker` for cohort-scoped crash-rate calculations.

## Lifecycle

- Create: admin defines OTA-specific cohort (e.g. "canary-internal").
- Update: criteria edits, canary toggle.
- Delete: hard delete when no active OTA release references this cohort.

## Related APIs

- `POST /admin/ota/cohorts` — create
- `PUT /admin/ota/cohorts/:id` — update

## Related sequences

- `docs/sequences/09-ota/device-check-and-download.sequence.mmd` — cohort filter
- `docs/sequences/09-ota/upload-and-signing.sequence.mmd` — release links to cohort via `ota_releases.rollout_cohort_id`

## Validation rules

- `name` unique.
- `selection_criteria` keys ⊂ {`hw_revision`, `fw_version_gte`, `fw_version_lt`}.
- If `base_cohort_id` is set, the OTA cohort cannot enrol a device not already in the base cohort (enforced at assignment time by `OtaService`).

## Edge cases

- `canary_only=true` blocks `POST /admin/ota/:id/increase` past 25% without an explicit override flag (defends against accidentally rolling a canary to GA).
- Cross-system: `base_cohort_id` cross-domain FK to sys-08 `config_cohorts`. Phase 3 records this FK in `_shared/cross-domain-data-flow.md`. The OTA cohort is **logically a subset** of the config cohort, not a parallel taxonomy.
- A release's `rollout_cohort_id` (in `ota_releases`) may point at *either* a sys-08 `config_cohorts` row or a sys-09 `ota_cohorts` row — the FK is declared against sys-08 in the current ERD; sys-09 cohorts are referenced as a "subset filter" applied AFTER cohort resolution.
