---
entity: config_cohorts
domain: 08-config
service_owner: ConfigService
state_machine: none
api_endpoints:
  - POST /admin/fleet/cohorts
  - PUT /admin/fleet/cohorts/:id
  - GET /admin/fleet/cohorts
retention: hard
sequences_referenced_in:
  - docs/sequences/08-config/assembly-and-signing.sequence.mmd
  - docs/sequences/08-config/mqtt-push-and-fetch.sequence.mmd
---

# config_cohorts

## Business purpose

Named device group used both by sys-08 (for config template targeting) and sys-09 (for OTA staged rollout targeting). Resolution order during assembly: explicit membership → criteria match → default cohort. Exactly one row has `is_default = true`.

## Ownership rules

- Owner service: `ConfigService` (specifically `CohortResolver`).
- Writers: admin console via `POST /admin/fleet/cohorts` and `PUT /admin/fleet/cohorts/:id`.
- Readers: `CohortResolver` on every assembly, `OtaService` for cohort filtering on `/v1/ota/check` (sys-09 device-check-and-download).

## Lifecycle

- Create: admin defines a new cohort with selection_criteria and optional template_id.
- Update: criteria edits, template binding edits.
- Delete: hard delete (admin removes a cohort that has no live memberships). Default cohort is undeletable while it carries the `is_default` flag.

## Related APIs

- `POST /admin/fleet/cohorts` — create
- `PUT /admin/fleet/cohorts/:id` — update criteria or template binding
- `GET /admin/fleet/cohorts` — list

## Related sequences

- `docs/sequences/08-config/assembly-and-signing.sequence.mmd` — `CohortResolver` resolves cohort
- `docs/sequences/08-config/mqtt-push-and-fetch.sequence.mmd` — `POST /admin/fleet/cohorts/:id/push` triggers rebuild for members

## Validation rules

- `name` uniqueness enforced by `idx_config_cohorts_name_unique`.
- `selection_criteria` keys ∈ {`hw_revision`, `fw_version_gte`, `fw_version_lt`, `household_country`}; empty `{}` matches no devices (per spec).
- Partial unique index ensures exactly one `is_default = true` row.

## Edge cases

- Cohort resolution failure (`CohortResolutionError`): if no explicit membership, no criteria match, and **no default cohort exists**, assembly fails with 500 (sys-08 assembly-and-signing failure path `cohort_resolution_failure`). Default cohort is a hard requirement.
- Shared with sys-09 OTA rollouts: `firmware_releases.rollout_cohort_id` (Lane F sys-09) consumes `config_cohorts.id` — sys-08 owns the cohort definition.
- Criteria-based resolution is non-deterministic across overlaps; **most recently created** matching cohort wins (per spec §Fleet Cohort Resolution).
