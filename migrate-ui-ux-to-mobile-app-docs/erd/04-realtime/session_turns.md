---
entity: session_turns
domain: 04-realtime
service_owner: RealtimeService
state_machine: docs/site/software/systems/04-realtime-session-orchestrator.md#section-7-turn-pipeline
api_endpoints:
  - GET /v1/admin/sessions/:sessionId/turns
retention: coppa-180d
sequences_referenced_in:
  - docs/sequences/04-realtime/turn-pipeline.sequence.mmd
  - docs/sequences/04-realtime/barge-in.sequence.mmd
  - docs/sequences/04-realtime/provider-failover.sequence.mmd
  - docs/sequences/04-realtime/coppa-retention.sequence.mmd
  - docs/sequences/_cross/realtime-turn-end-to-end.sequence.mmd
---

# session_turns

## Business purpose

One row per child utterance + assistant response within a [[sessions]] row. Carries per-turn latency breakdown, provider attribution, cost decomposition, safety verdict, and prompt/policy version pinning. **Holds no transcript text** — transcripts live in [[session_transcripts]] (separate retention sweep).

## Ownership rules

- Owner service: `RealtimeService`
- Writers: `Orchestrator` (creates on first AUDIO_CHUNK; updates `status` at each pipeline stage; finalizes `total_turn_ms` + costs on TTS_DONE), `RetentionScheduler` (hard-delete after 30d).
- Readers: `TelemetryService` (per-turn metrics), `SummaryWorker` (sys-07 parent weekly summary), `SafetyInvestigationService` (sys-12 support timeline), admin tooling.

## Lifecycle

- Create: first AUDIO_CHUNK after `sessions.status='open'` or `turn_complete` → row inserted with `status='audio_capture'`, `turn_index=sessions.turn_count`.
- Update: `status` advances through pipeline stages; per-stage `*_ms` timing columns populated as stages complete; `cost_*_micros` populated post-provider call; `status` lands on `complete`, `failed`, `safety_blocked`, or `cancelled`.
- Delete: hard-delete after 30 days per sys-04 §4.2 retention rule (turn rows shorter than `sessions` retention because per-turn telemetry already rolled-up to sys-11).
- State machine: see system spec §7 (turn pipeline flow) + state-machine diagram §7.

## Related APIs

- `GET /v1/admin/sessions/:sessionId/turns` — operator turn breakdown.
- Indirect: `POST /internal/v1/conversation/generate` (sys-05) consumes turn intent + safety context.

## Related sequences

- `docs/sequences/04-realtime/turn-pipeline.sequence.mmd` — full state advance, all timing fields populated.
- `docs/sequences/04-realtime/barge-in.sequence.mmd` — `status='cancelled'`, `cancelled_at` set.
- `docs/sequences/04-realtime/provider-failover.sequence.mmd` — `stt_provider` / `llm_provider` / `tts_provider` may differ within a turn after failover.
- `docs/sequences/04-realtime/coppa-retention.sequence.mmd` — bulk DELETE at 30d.

## Validation rules

- `(session_id, turn_index)` MUST be unique — enforced by index.
- `turn_index` MUST be 0 ≤ idx < 60 — orchestrator pre-check.
- `total_turn_ms` populated only when `status='complete'`.
- `safety_action='input_blocked'` requires `llm_*_ms` columns NULL (LLM skipped per sys-04 §7 fail-closed canned response path).
- `cost_total_micros = cost_stt_micros + cost_llm_micros + cost_tts_micros` (orchestrator computes, no DB trigger).
- `prompt_version_id`, `safety_policy_version_id`, `blocklist_version_id` MUST resolve to a `published` row in sys-05 governance tables.

## Edge cases

- **Barge-in mid-stream:** `status='cancelled'`, `cancelled_at` set, `total_turn_ms` may be NULL (no TTS_DONE).
- **Provider failover within a turn:** the `*_provider` columns reflect the LAST attempted provider — separate row in [[provider_failover_records]] captures the chain.
- **Retention staggering:** [[session_transcripts]] are NULLed at 24h (transcript text only), but `session_turns` rows survive until 30d for cost reconciliation + support investigation.
- **High cardinality:** at peak (200 sessions × 60 turns × 30d) up to ~360k rows/day per instance — TimescaleDB hypertable on `created_at` is the planned partition strategy (sys-04 §4.4 acknowledges hypertable status; emission tooling reads the DBML `Note:`).
- **COPPA propagation:** when [[sessions]] is hard-deleted, ALL its `session_turns` are deleted via the retention sweep cascade.
