---
entity: sessions
domain: 04-realtime
service_owner: RealtimeService
state_machine: docs/site/software/systems/04-realtime-session-orchestrator.md#111-session-state-machine
api_endpoints:
  - GET /v1/realtime/connect
  - GET /v1/admin/sessions/active
  - GET /v1/admin/sessions/:sessionId
  - POST /v1/admin/sessions/:sessionId/terminate
  - GET /v1/admin/sessions/:sessionId/turns
retention: coppa-180d-cap-90d-policy  # legal cap = COPPA §312.10 180 days; production policy = 90d hard-delete (lesser of the two); see body Lifecycle.delete
sequences_referenced_in:
  - docs/sequences/04-realtime/ws-handshake.sequence.mmd
  - docs/sequences/04-realtime/turn-pipeline.sequence.mmd
  - docs/sequences/04-realtime/session-close.sequence.mmd
  - docs/sequences/04-realtime/barge-in.sequence.mmd
  - docs/sequences/04-realtime/provider-failover.sequence.mmd
  - docs/sequences/04-realtime/coppa-retention.sequence.mmd
  - docs/sequences/_cross/realtime-turn-end-to-end.sequence.mmd
---

# sessions

## Business purpose

Canonical record of one voice conversation between a TBot device and a child. Bound to one device, one child profile, and one household. Join point for telemetry (sys-11), parent summaries (sys-07), support timelines (sys-12), and cost attribution. **All transcript content lives in [[session_transcripts]] — never on this row.**

## Ownership rules

- Owner service: `RealtimeService`
- Writers: `Orchestrator` (creates on SESSION_OPEN; updates state, counters, costs on every turn; closes via `ControlPlane`), `RetentionScheduler` (`deleted_at` sweep), admin force-terminate (`SafetyInvestigationService` writes `end_reason=parent_stop` / `error` audit).
- Readers: `TelemetryService`, `SummaryWorker` (sys-07), `SafetyInvestigationService` (sys-12), parent app via gateway, support tooling.

## Lifecycle

- Create: WebSocket handshake succeeds → `Orchestrator` writes initial row with `status='connecting'`, `started_at=now()`. SETNX on Redis `device_session:{deviceId}` enforces single-active per device.
- Update: `status` advances through the state-machine; `turn_count`, `total_cost_micros`, `safety_blocks_count`, `barge_in_count`, `last_activity_at` mutate on every turn boundary.
- Delete: soft via `deleted_at` after `ended_at + 90d` window per sys-04 §4.2; hard-delete by `RetentionScheduler` daily job. Child-linked rows fall under COPPA — retention is the lesser of 90d or the COPPA §312.10 180-day cap; production policy is 90d hard-delete (within COPPA window).
- State machine (canonical): see system spec §11.1 — `connecting → open → turn_active ⇄ turn_complete → closing → closed`; `open|turn_active → reconnecting → open` (10s window) or `closed`.

## Related APIs

- `GET /v1/realtime/connect` — WebSocket upgrade; creates `sessions` row on SESSION_OPEN.
- `GET /v1/admin/sessions/active` — operator dashboard list.
- `GET /v1/admin/sessions/:sessionId` — full timeline join with [[session_turns]] and [[provider_failover_records]].
- `POST /v1/admin/sessions/:sessionId/terminate` — force-close with audit trail; writes `end_reason='parent_stop'`.
- `GET /v1/admin/sessions/:sessionId/turns` — per-turn breakdown.

## Related sequences

- `docs/sequences/04-realtime/ws-handshake.sequence.mmd` — creation path + SETNX device lock.
- `docs/sequences/04-realtime/turn-pipeline.sequence.mmd` — per-turn counters and cost accumulation.
- `docs/sequences/04-realtime/session-close.sequence.mmd` — `ended_at` + `end_reason` finalization, queue fan-out.
- `docs/sequences/04-realtime/barge-in.sequence.mmd` — `barge_in_count` increments; `barge_limit` end-reason at 5.
- `docs/sequences/04-realtime/provider-failover.sequence.mmd` — `stt_provider_used` / `llm_provider_used` / `tts_provider_used` snapshot of last successful provider.
- `docs/sequences/04-realtime/coppa-retention.sequence.mmd` — `deleted_at` set by retention sweep.

## Validation rules

- `child_profile_id`'s household_id must equal `household_id` (enforced in `Orchestrator` via control-plane lookup; cross-table CHECK not feasible in DDL).
- `interaction_mode` snapshot at SESSION_OPEN; never mutated mid-session.
- `total_cost_micros` MUST be < 120_000 ($0.12 ceiling) — enforced by `CostMeter` pre-turn; if `>= 120_000` → `end_reason='cost_limit'`.
- `turn_count` MUST be < 60 — enforced pre-turn; if 60 reached → `end_reason='complete'`.
- `total_duration_ms` MUST be < 1_800_000 (30 min) — enforced; exceeded → `end_reason='timeout'`.
- `barge_in_count` MUST be <= 5 — exceeded → `end_reason='barge_limit'`.
- `ended_at` MUST be NULL while `status NOT IN ('closed')`; MUST be NOT NULL when `status='closed'`.

## Edge cases

- **Reconnection (≤10s):** `status` transitions `open|turn_active → reconnecting → open`; same row, no new `sessions` insert. New JWT must match same device + household.
- **Redis lock divergence (sys-04 Failure 3):** if Redis unavailable, new sessions rejected with `E-RT-201`; if Redis returns post-SETNX but Postgres unique constraint fires, treat as duplicate and force-close.
- **Soft vs hard delete:** soft-delete sets `deleted_at` (90d trigger from `ended_at`); hard-delete by retention sweep removes the row. Audit row already captured by sys-11 telemetry pre-delete.
- **COPPA propagation:** when this row is hard-deleted, [[session_turns]] and [[session_transcripts]] children MUST be deleted via cascade or explicit sweep; retention runbook in sys-14.
- **Cross-domain consistency:** `device_id` / `household_id` / `child_profile_id` are point-in-time snapshots; if the underlying child is later deleted (sys-14), retention worker honors the earliest deletion date.
