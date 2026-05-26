---
entity: config_assignments
domain: 08-config
service_owner: ConfigService
state_machine: none
api_endpoints:
  - POST /admin/fleet/cohorts/:id/members
  - DELETE /admin/fleet/cohorts/:id/members/:deviceId
retention: hard
sequences_referenced_in:
  - docs/sequences/08-config/assembly-and-signing.sequence.mmd
  - docs/sequences/_cross/config-propagation-controls-to-device.sequence.mmd
---

# config_assignments

## Business purpose

Explicit `(cohort_id, device_id)` membership rows. Highest-precedence path in `CohortResolver`: presence here short-circuits the criteria + default fallback chain.

## Ownership rules

- Owner service: `ConfigService`.
- Writers: admin console (`POST /admin/fleet/cohorts/:id/members`), beta/test programs.
- Readers: `CohortResolver` during every assembly pipeline run.

## Lifecycle

- Create: admin adds device to cohort.
- Update: rare — `config_version_id` updated after each assembly to record the latest issued version under this assignment.
- Delete: admin removes membership; assembly triggers `cohort_membership_changed` to issue a new config based on the next-matching path (criteria → default).

## Related APIs

- `POST /admin/fleet/cohorts/:id/members` — add device
- `DELETE /admin/fleet/cohorts/:id/members/:deviceId` — remove device

## Related sequences

- `docs/sequences/08-config/assembly-and-signing.sequence.mmd` — read by `CohortResolver`
- `docs/sequences/_cross/config-propagation-controls-to-device.sequence.mmd` — full propagation chain

## Validation rules

- `(cohort_id, device_id)` unique — a device belongs to at most one explicit cohort.
- `device_id` cross-domain FK to `devices` (Lane C, sys-02). The producing side (DeviceService) owns the column. Phase 3 will document the back-reference.
- `assigned_by` is a free-form actor id; admins use email, internal systems use `system:<service>` slug.

## Edge cases

- Removing the **only** assignment for a device falls back to criteria-based resolution; if no criteria match, default cohort applies.
- A device may have multiple `config_assignments` historically (after re-binding) — uniqueness applies to *current* membership only. For history use `cohort_membership_changed` rows in `config_versions.change_source`.
- Cross-domain consistency: removing a device (sys-02 decommission) cascades — sys-02 DELETE on `devices` MUST be preceded by membership cleanup, or DB FK constraints will fail.
