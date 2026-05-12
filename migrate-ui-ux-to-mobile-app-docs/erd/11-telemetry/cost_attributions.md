---
entity: cost_attributions
domain: 11-telemetry
service_owner: CostAttributionWorker
state_machine: none
api_endpoints:
  - GET /admin/cost/per-session
  - GET /admin/cost/daily
retention: 365d
sequences_referenced_in:
  - docs/sequences/11-telemetry/session-cost-attribution.sequence.mmd
---

# cost_attributions

## Business purpose

Per-source unit-economics row. The headline use case is per-session cost (STT + LLM + TTS + infra), but the polymorphic source allows this entity to attribute cost to non-session sources too: a telemetry batch flood, an OTA download, a daily-aggregate roll-up. Answers the business-critical question "how much did this session / event / day cost?".

## Ownership rules

- Owner service: `CostAttributionWorker`.
- Writers: SQS consumer driven by `tbot-session-completed` queue; daily aggregation cron at 02:00 UTC.
- Readers: admin cost dashboards, business analytics, sys-19 billing reconciliation, sys-14 retention sweep.

## Lifecycle

- Create: one row per (source_kind, source_id) — `INSERT … ON CONFLICT DO NOTHING` (idempotent).
- Update: rare — only when rate card changes retroactively (admin recomputes); ordinary path is INSERT-only.
- Delete: 1-year retention via sys-14 `cost_attribution_cleanup` cron.

## Related APIs

- `GET /admin/cost/per-session` — admin dashboard
- `GET /admin/cost/daily` — daily aggregates view

## Related sequences

- `docs/sequences/11-telemetry/session-cost-attribution.sequence.mmd` — INSERT path with `ON CONFLICT DO NOTHING`

## Validation rules

- `(source_kind, source_id)` unique — generalises spec's `UNIQUE(session_id)` to the polymorphic form.
- All `*_cost_cents` ≥ 0; `total_cost_cents = stt + llm + tts + infra` (validated at compute time).
- `rate_card_id` MUST reference the rate card row whose effective window contains `computed_at`.
- `attribution_date` is UTC midnight start-of-day (truncate `computed_at` at the worker).

## Edge cases

- Cost spike alerts (spec §Cost Attribution `cost_attribution_session_cost_usd` > $0.15) are evaluated downstream by the metric pipeline — this row simply records the value.
- Daily aggregate (source_kind=`daily_aggregate`) is a separate row that summarises per-device, per-day from `session` rows. Avoids the spec's separate `daily_cost_aggregates` table by leveraging polymorphism.
- Re-attribution after rate-card change: admin tools update `*_cost_cents` columns and bump `updated_at`; the original `rate_card_id` is replaced. Rare — typically retroactive recomputation runs as a new row with `source_kind='daily_aggregate'` instead.
- Cross-domain FKs (`device_id`, `household_id`, `session_id`) — declared on producer side (DeviceService / IdentityService / RealtimeService). This lane carries only the columns. Polymorphic `source_id` carries NO FK by design (sys-11 audit-events also documents this pattern).
- COPPA: no child-conversation content here; rate breakdown is metadata only. 1-year retention matches business need.
