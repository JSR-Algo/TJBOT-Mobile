---
entity: parent_notifications_outbox
domain: 07-parent
service_owner: ControlsService
state_machine: '@inline'
api_endpoints:
  - '@no-api'
retention: coppa-180d
sequences_referenced_in:
  - docs/sequences/07-parent/daily-summary-generation.sequence.mmd
  - docs/sequences/07-parent/weekly-summary-generation.sequence.mmd
---

# parent_notifications_outbox

## Business purpose

Outbound notification event records produced by sys-07 (`ControlsService`, `SummaryWorker`). Each row represents a notification event (e.g. daily/weekly summary generated, cap reached) to be enqueued on the `tbot-notifications` SQS queue for delivery by `NotificationService` (sys-10). **Not the same as `notification_dispatches` (sys-10)** which is the delivery-side record. May contain child references — COPPA retention applies.

## Ownership rules

- Owner service: `ControlsService`
- Writers: `SummaryWorker` (daily/weekly events), `ControlsService` (cap_reached events).
- Readers: `ControlsService` outbox sweeper (enqueues to SQS).

## Lifecycle

- Create: on daily/weekly summary completion or cap enforcement.
- Update: `status` → `enqueued` on SQS enqueue; `status` → `failed` on permanent failure.
- Delete: soft-delete via `deleted_at`; COPPA hard-delete at 180 days via sys-14 when `child_profile_id` is set.
- State machine (inline): `pending → enqueued` (SQS ACK), `pending → failed` (permanent SQS failure).

## Related APIs

- No direct API — outbox pattern; consumed by internal outbox sweeper.

## Related sequences

- `docs/sequences/07-parent/daily-summary-generation.sequence.mmd` — `SummaryWorker->>NotificationQueue: enqueue {event: summary.daily.generated}`
- `docs/sequences/07-parent/weekly-summary-generation.sequence.mmd` — `SummaryWorker->>NotificationQueue: enqueue {event: summary.weekly.generated}`

## Validation rules

- `event_type` must be a known enum value.
- `payload` shape validated per `event_type` in app layer.

## Edge cases

- SQS DLQ: events remaining `pending` after 3 enqueue failures are flagged via PagerDuty via sys-07 monitoring.
- Naming: `parent_notifications_outbox` (this table) vs `notification_dispatches` (sys-10) — distinct tables, distinct concerns. Do not merge.
- COPPA: `child_profile_id` is nullable; retention sweep checks non-null child references only.
- Cross-domain refs: `device_id` → `devices.id` (DeviceService), `child_profile_id` → `children.id` (IdentityService); FKs enforced in app, not DB.
