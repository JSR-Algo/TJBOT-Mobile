---
entity: safety_events
domain: 05-safety
service_owner: SafetyService
state_machine: none
api_endpoints:
  - GET /v1/admin/safety/events
  - GET /v1/admin/safety/events/:id
retention: coppa-180d
sequences_referenced_in:
  - docs/sequences/05-safety/input-filter.sequence.mmd
  - docs/sequences/05-safety/output-filter.sequence.mmd
  - docs/sequences/05-safety/safety-event-fanout.sequence.mmd
  - docs/sequences/05-safety/generation-pipeline.sequence.mmd
  - docs/sequences/05-safety/fallback-selection.sequence.mmd
---

# safety_events

## Business purpose

Append-only ledger of every safety judgment: input blocks (regex / topic / PII), output blocks (six output-filter checks), governance failures (red-team regression, missing policy), and model failure (timeout, malformed JSON). One row per atomic decision. **Append-only and tied to the exact generation request** per sys-05 §3 governance rule. The primary input to (a) sys-12 support investigations, (b) sys-11 safety analytics, (c) sys-10 parent alert dispatcher, (d) sys-07 weekly summary rollups.

## Ownership rules

- Owner service: `SafetyService`
- Writers: `SafetyService` (every input/output filter decision; final-gate decisions); `BlocklistCache` writes red_team_regression_detected events on publish gate failures; `Orchestrator` does NOT write here directly — it consumes the response and lets `SafetyService` own this audit surface.
- Readers: `SafetyInvestigationService` (sys-12); `NotificationService` (sys-10 selects high/critical un-alerted rows); `SummaryWorker` (sys-07); `TelemetryService` (sys-11 aggregation).

## Lifecycle

- Create: written synchronously inside `POST /internal/v1/conversation/generate` whenever an input/output filter check fires; written from publish-gate flow when red-team regression detected.
- Update: never — append-only; `parent_alerted` + `parent_alerted_at` are the only allowed post-write mutations (notification service back-fills after dispatch).
- Delete: hard-delete at 180 days (COPPA §312.10 outer bound for child-linked data). Aggregated counters survive in sys-11.
- State machine: none.

## Related APIs

- `GET /v1/admin/safety/events` — list + filter (severity, household, event_type).
- `GET /v1/admin/safety/events/:id` — full detail join with transcript hash + policy version snapshot.
- Indirect: `POST /internal/v1/conversation/generate` (sys-05) writes.

## Related sequences

- `docs/sequences/05-safety/input-filter.sequence.mmd` — input blocklist / topic / PII events.
- `docs/sequences/05-safety/output-filter.sequence.mmd` — six output-filter check events.
- `docs/sequences/05-safety/safety-event-fanout.sequence.mmd` — downstream consumers (parent notification, support, telemetry).
- `docs/sequences/05-safety/generation-pipeline.sequence.mmd` — model_timeout / model_malformed / budget_exceeded events.
- `docs/sequences/05-safety/fallback-selection.sequence.mmd` — fallback_template_id linkage.

## Validation rules

- `event_type` always paired with `stage`: `input_*` → `stage='input'`, `output_*` → `stage='output'`, `final_gate_*` → `stage='final_gate'`, governance/model failures → `stage='governance'`.
- `severity='critical'` requires `parent_alerted=true` within 60s (orchestrator-enforced via sys-10 fan-out).
- `confidence_pct` populated only when `event_type IN ('input_topic_classified', 'input_pii_detected')`.
- `transcript_hash` populated for ALL input_* events; never raw transcript text (COPPA — already enforced by sys-04 §12 log policy).
- `fallback_template_id` populated whenever a block produced a user-visible response (every input/output block).
- `session_id` / `session_turn_id` / `child_profile_id` MAY be NULL for governance events; non-NULL for any live-turn event.

## Edge cases

- **Severe threshold cascade (sys-05 §17):** when household accumulates 5 high+ events in 1h sliding window → `severe_counter_increment` event written by safety service; sys-10 then escalates fallback strictness for that household.
- **PII leak in output (sys-05 §20 P1 alert):** `event_type='output_pii_emitted'` is the canary; should be 0 events in steady state; one occurrence pages on-call.
- **Polymorphic FKs to sys-04:** `session_id` / `session_turn_id` are cross-domain refs to [[sessions]] / [[session_turns]] declared in their owning lane in Phase 3.
- **Retention vs sys-04:** safety_events retains 180d while transcripts (in sys-04) clear at 24h — the `transcript_hash` is the only durable cross-reference. Reconstructing literal child speech post-24h is intentionally impossible.
- **Append-only enforcement:** application layer; no DB trigger. Migration may add a row-level policy preventing UPDATEs except on the two allowed columns.
