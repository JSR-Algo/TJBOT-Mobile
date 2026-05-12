---
entity: safety_investigations
domain: 12-admin
service_owner: SafetyInvestigationService
state_machine: '@inline'
api_endpoints:
  - POST /admin/safety/investigations
  - PATCH /admin/safety/investigations/:id
retention: hard
sequences_referenced_in:
  - docs/sequences/12-admin/safety-investigation-w2.sequence.mmd
---

# safety_investigations

## Business purpose

Admin case file recording a safety-filter miss reported by parents or surfaced by `SafetyService`. One row per incident; lifecycle is forward-only (`open → investigating → resolved | escalated`).

## Ownership rules

- Owner service: `SafetyInvestigationService`
- Writers: admin tooling on report; investigators on status update / resolution.
- Readers: support tooling, compliance dashboards, sys-11 telemetry consumers.

## Lifecycle

- Create: admin opens a case (either parent-report intake or upstream `safety_events` escalation).
- Update: status transitions; `resolution` text on close; `escalated_to` on hand-off.
- Delete: hard-deleted by sys-14 after compliance retention window.
- State machine (inline): `open → investigating → resolved`, or `open → investigating → escalated → resolved` (no back-edges).

## Related APIs

- `POST /admin/safety/investigations` — open case.
- `PATCH /admin/safety/investigations/:id` — update / resolve.

## Related sequences

- `docs/sequences/12-admin/safety-investigation-w2.sequence.mmd` — full workflow.

## Validation rules

- `severity` immutable after open (escalation changes status, not severity).
- `resolved_at` required when `status='resolved'`.
- `escalated_to` required when `status='escalated'`.

## Edge cases

- Cross-domain FKs (`device_id`, `session_id`, `turn_id`) point at other lanes' tables. Phase 3 reconciles every Ref into `_shared/cross-domain-data-flow.md`.
- Re-open after `resolved` is forbidden by state machine — open a new case.
