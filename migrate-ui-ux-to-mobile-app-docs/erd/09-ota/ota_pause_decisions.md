---
entity: ota_pause_decisions
domain: 09-ota
service_owner: OtaService
state_machine: none
api_endpoints:
  - GET /admin/ota/:id/events
  - POST /admin/ota/:id/pause
  - POST /admin/ota/:id/resume
  - POST /admin/ota/:id/recall
retention: hard
sequences_referenced_in:
  - docs/sequences/09-ota/crash-rate-auto-pause.sequence.mmd
  - docs/sequences/09-ota/upload-and-signing.sequence.mmd
  - docs/sequences/09-ota/device-check-and-download.sequence.mmd
---

# ota_pause_decisions

## Business purpose

Immutable audit log of every state transition + admin / auto decision against a release. Each row corresponds to one event the spec enumerates in `ota_rollout_events.event_type`. The name `pause_decisions` reflects the operational priority of pause/recall — but the table also records `created`, `staged`, `started`, `percentage_increased`, `resumed`, `completed`.

## Ownership rules

- Owner service: `OtaService`.
- Writers: upload handler (`created`); admin handlers (`staged`, `started`, `percentage_increased`, `paused_manual`, `resumed`, `recalled`); `CrashMonitorWorker` (`paused_auto`); completion handler (`completed`).
- Readers: admin lifecycle dashboard, sys-12 admin auditor, sys-13 security incident correlator, SLA-tracking reports.

## Lifecycle

- Create: one row per state transition / admin action.
- Update: never — append-only. **Lifecycle.update = never.**
- Delete: never — these rows are the legal + operational record of safety-gate decisions and remain indefinitely (no retention sweep applies).

## Related APIs

- `GET /admin/ota/:id/events` — read timeline
- `POST /admin/ota/:id/pause` → `paused_manual`
- `POST /admin/ota/:id/resume` → `resumed`
- `POST /admin/ota/:id/recall` → `recalled` + SNS SEV-1

## Related sequences

- `docs/sequences/09-ota/upload-and-signing.sequence.mmd` — `created`
- `docs/sequences/09-ota/crash-rate-auto-pause.sequence.mmd` — `paused_auto`, `resumed`, `recalled`
- `docs/sequences/09-ota/device-check-and-download.sequence.mmd` — indirectly (rollout status check)

## Validation rules

- `details` JSON schema varies by `decision_kind`. For `paused_auto`: `{crash_count, total_attempts, crash_rate}`. For `percentage_increased`: `{prior_percentage, new_percentage}`. For `paused_manual` / `recalled`: `{reason, admin_note}`.
- `admin_user_id` MUST be set for `paused_manual`, `resumed`, `recalled` (the human-in-the-loop decisions); MUST be null for `paused_auto`.
- `sns_message_id` + `sns_severity` populated only when an SNS alert is publishable (paused_auto = SEV-2, recalled = SEV-1).

## Edge cases

- Auto-pause exactly-once invariant: a single (`release_id`, monitor_cycle) tuple MUST produce at most one `paused_auto` row. Idempotency lives in the `CrashMonitorWorker` query that UPDATEs `ota_releases.status='paused'` with the guard `WHERE status='rolling_out'`.
- SNS publish failure (`sns_publish_failure`) does NOT block the row write — the SNS path is retried separately. The row's `sns_message_id` is updated when the publish eventually succeeds (the **only** field that may be filled later).
- Cross-domain FK to sys-12 `admin_users` (`admin_user_id`): declared on **producer side** (sys-12) per CONVENTIONS §3. This row carries the column only; Phase 3 records the FK in `_shared/cross-domain-data-flow.md`.
- Recalled rollouts MAY be followed by a successor release's `created` row; the chain is reconstructable via shared `version` semver and admin notes.
