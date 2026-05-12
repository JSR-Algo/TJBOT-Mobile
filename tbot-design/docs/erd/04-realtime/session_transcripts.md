---
entity: session_transcripts
domain: 04-realtime
service_owner: RealtimeService
state_machine: none
api_endpoints:
  - GET /v1/admin/sessions/:sessionId/turns
retention: coppa-180d
sequences_referenced_in:
  - docs/sequences/04-realtime/turn-pipeline.sequence.mmd
  - docs/sequences/04-realtime/coppa-retention.sequence.mmd
  - docs/sequences/_cross/realtime-turn-end-to-end.sequence.mmd
  - docs/sequences/05-safety/safety-event-fanout.sequence.mmd
---

# session_transcripts

## Business purpose

Stores the verbatim transcript and assistant response text for each turn — strictly isolated from [[session_turns]] so the COPPA-mandated text-clear sweep can run with surgical precision and without touching cost / timing columns. Per plan §13: **transcripts MUST be a separate table**, never JSONB on `sessions`. The row outlives its text by 29 days for forensic correlation via SHA-256 hashes (irreversible) — these hashes are the only artifact retained after the 24h text clear.

## Ownership rules

- Owner service: `RealtimeService`
- Writers: `Orchestrator` (inserts when STT_FINAL produced and again when LLM response parsed), `RetentionScheduler` (24h text clear; 30d row hard-delete).
- Readers: `SafetyInvestigationService` (sys-12) for support timelines while text exists; `SummaryWorker` (sys-07) reads within 24h window to build weekly summary; `SafetyService` (sys-05) reads SHA-256 to correlate `safety_events.transcript_hash`.

## Lifecycle

- Create: `Orchestrator` writes row at STT_FINAL with `transcript_text` populated; updates same row at LLM_DONE with `response_text`. SHA-256 hashes are written eagerly so they survive the 24h clear.
- Update: `cleared_at = now()`, `transcript_text = NULL`, `response_text = NULL` at 24h by `RetentionScheduler`. Hash columns untouched.
- Delete: hard-delete at 30d (mirrors [[session_turns]] retention). Driven by `RetentionScheduler` daily sweep cited in `coppa-retention.sequence.mmd`.
- State machine: none — single forward-only lifecycle; `cleared_at` is the only state-equivalent marker.

## Related APIs

- `GET /v1/admin/sessions/:sessionId/turns` — joins `session_turns` + `session_transcripts` only when row is uncleared (text columns return NULL after 24h).

## Related sequences

- `docs/sequences/04-realtime/turn-pipeline.sequence.mmd` — row creation at STT_FINAL + LLM parse.
- `docs/sequences/04-realtime/coppa-retention.sequence.mmd` — 24h NULL sweep, 30d DELETE sweep.
- `docs/sequences/05-safety/safety-event-fanout.sequence.mmd` — SHA-256 correlation join.

## Validation rules

- `session_turn_id` unique (one transcript row per turn).
- `cleared_at IS NULL` IFF `transcript_text IS NOT NULL OR response_text IS NOT NULL`.
- Hash columns MUST be populated whenever text columns are non-NULL (orchestrator INSERT path enforces).
- `child_profile_id` MUST match `sessions.child_profile_id` for the parent `session_id` (orchestrator-enforced; not a DB CHECK).

## Edge cases

- **Failed turn:** when [[session_turns]].status='failed' before LLM completes, `response_text` may be NULL on initial insert; hash columns reflect this (`response_sha256` NULL).
- **Safety-blocked input:** `transcript_text` is still populated (we record what the child said); `response_text` holds the canned fallback.
- **Cross-system join:** `transcript_sha256` lets `SafetyService` correlate fanout events to specific turns even after the 24h text clear — this is the privacy-preserving audit primitive.
- **COPPA propagation:** when [[sessions]] hard-deletes (90d), retention sweep MUST hard-delete every `session_transcripts` row whose `session_id` matches (cascade behavior — production migration may declare `ON DELETE CASCADE`).
- **NEVER copy `transcript_text` into telemetry events** — sys-11 receives only SHA-256 + length stats per sys-04 §12 "Never log full transcript text".
