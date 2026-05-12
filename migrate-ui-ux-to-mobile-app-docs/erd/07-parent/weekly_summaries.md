---
entity: weekly_summaries
domain: 07-parent
service_owner: ControlsService
state_machine: none
api_endpoints:
  - GET /v1/summaries/:deviceId/weekly
retention: coppa-180d
sequences_referenced_in:
  - docs/sequences/07-parent/weekly-summary-generation.sequence.mmd
---

# weekly_summaries

## Business purpose

Derived weekly engagement aggregate per (device, child) pair. Built by the `SummaryWorker` Monday cron from `daily_summaries`. Includes an `engagement_trend` field computed from the previous week delta. Surfaced to parents via the weekly summary view. Contains child-linked data — COPPA retention applies.

## Ownership rules

- Owner service: `ControlsService`
- Writers: `SummaryWorker` (upsert-on-conflict per ISO week).
- Readers: `ControlsService` (parent API), `SummaryWorker` (prev-week trend delta).

## Lifecycle

- Create: `SummaryWorker` Monday 04:00 UTC upserts one row per (device, child, iso_week).
- Update: upsert ON CONFLICT DO UPDATE — idempotent replay safe.
- Delete: soft-delete via `deleted_at`; COPPA hard-delete at 180 days via sys-14 RetentionWorker.
- Derived from: `daily_summaries` (06-content) — rebuilt by `SummaryWorker`.

## Related APIs

- `GET /v1/summaries/:deviceId/weekly` — parent-facing weekly summary

## Related sequences

- `docs/sequences/07-parent/weekly-summary-generation.sequence.mmd` — `SELECT daily_summaries WHERE summary_date IN week`; `SELECT prev-week weekly_summaries` for trend; upsert

## Validation rules

- `iso_week` format `YYYY-Www`; must be a valid past or current ISO week.
- `engagement_trend`: `increasing` if Δ ≥ +15%, `declining` if Δ ≤ -15%, `stable` otherwise. `stable` when prev-week `total_minutes=0`.

## Edge cases

- Missing daily rows for inactive days treated as zero by aggregator — no error.
- Upsert idempotency: SQS worker re-delivery after timeout replays without duplicates.
- Cross-domain refs: `device_id` → `devices.id` (DeviceService), `child_profile_id` → `children.id` (IdentityService); FKs enforced in app, not DB.
