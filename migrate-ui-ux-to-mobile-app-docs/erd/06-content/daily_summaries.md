---
entity: daily_summaries
domain: 06-content
service_owner: ContentService
state_machine: none
api_endpoints:
  - '@no-api'
retention: coppa-180d
sequences_referenced_in:
  - docs/sequences/07-parent/daily-summary-generation.sequence.mmd
  - docs/sequences/07-parent/weekly-summary-generation.sequence.mmd
---

# daily_summaries

## Business purpose

Derived daily engagement aggregate per (device, child) pair. Rebuilt nightly by the `SummaryWorker` (sys-07 cron) from `session_transcripts`. Consumed by the weekly summary worker and the parent-facing summary view. Contains child-linked data — COPPA retention applies.

## Ownership rules

- Owner service: `ContentService` (table definition); `SummaryWorker` (sys-07) is the sole writer.
- Writers: `SummaryWorker` (upsert-on-conflict per day).
- Readers: `SummaryWorker` (weekly aggregate), `ControlsService` (parent API read).

## Lifecycle

- Create: `SummaryWorker` nightly cron upserts one row per (device_id, child_profile_id, summary_date). No row created for inactive days.
- Update: upsert ON CONFLICT DO UPDATE — idempotent replay safe.
- Delete: soft-delete via `deleted_at`; COPPA hard-delete at 180 days via sys-14 RetentionWorker.
- Derived from: `session_transcripts` (sys-04) — rebuilt by `SummaryWorker`.

## Related APIs

- No direct write API — produced by cron worker.
- Consumed indirectly via parent summary endpoints in sys-07.

## Related sequences

- `docs/sequences/07-parent/daily-summary-generation.sequence.mmd` — `INSERT daily_summaries ... ON CONFLICT (device_id,child_profile_id,summary_date) DO UPDATE`
- `docs/sequences/07-parent/weekly-summary-generation.sequence.mmd` — `SELECT daily_summaries WHERE summary_date IN week`

## Validation rules

- `summary_date` in UTC; never in future.
- `total_minutes` ≥ 0; `activities_count` ≥ 0; `words_introduced` ≥ 0.

## Edge cases

- Missing daily rows for inactive days are treated as zero by the weekly aggregator (not an error).
- Upsert idempotency: SQS worker re-delivery after crash replays without duplicates.
- Cross-domain refs: `device_id` → `devices.id` (DeviceService), `child_profile_id` → `children.id` (IdentityService); FKs enforced in app, not DB.
