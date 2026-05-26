---
entity: provider_failover_records
domain: 04-realtime
service_owner: RealtimeService
state_machine: none
api_endpoints:
  - GET /v1/admin/sessions/:sessionId
  - GET /v1/admin/circuits
retention: 30d
sequences_referenced_in:
  - docs/sequences/04-realtime/provider-failover.sequence.mmd
  - docs/sequences/04-realtime/turn-pipeline.sequence.mmd
---

# provider_failover_records

## Business purpose

Append-only ledger of every provider failover decision: which provider was tried first, why it failed, which provider served the segment instead, and what circuit-breaker state preceded / followed the event. Enables (a) post-incident reconstruction of a single turn that crossed providers, (b) per-provider health roll-ups for sys-11 telemetry, (c) cost reconciliation when a failover changed the unit pricing of a turn.

## Ownership rules

- Owner service: `RealtimeService`
- Writers: `Orchestrator` (every failover edge); `ControlPlane` for admin-forced circuit transitions (`trigger='manual_admin'`).
- Readers: `SafetyInvestigationService` (support timeline), `TelemetryService` (provider-health dashboards), admin via `/v1/admin/circuits` and `/v1/admin/sessions/:sessionId`.

## Lifecycle

- Create: written when `Orchestrator` decides to fail over OR when a circuit transitions between states. Immutable once written (no updates).
- Update: never — append-only.
- Delete: hard-delete at 30d. Telemetry rollups to sys-11 retain longer in aggregated form (no PII content here, but high-cardinality records aren't worth keeping indefinitely).
- State machine: none — single-shot write.

## Related APIs

- `GET /v1/admin/circuits` — joins recent provider_failover_records by `role` + `primary_provider`.
- `GET /v1/admin/sessions/:sessionId` — full failover chain for one session.

## Related sequences

- `docs/sequences/04-realtime/provider-failover.sequence.mmd` — primary path; emits one row per failover edge.
- `docs/sequences/04-realtime/turn-pipeline.sequence.mmd` — within-turn failover, links to [[session_turns]] via `session_turn_id`.

## Validation rules

- `primary_provider` is required and recorded BEFORE the attempt; `primary_http_code` captures the HTTP status returned (column named *_code to avoid `*_status` validator collision).
- `outcome IN ('primary_succeeded', 'secondary_succeeded', 'cache_served')` requires `fallback_attempt_ms` populated when `outcome != 'primary_succeeded'`.
- `outcome='all_failed'` requires `fallback_provider IS NULL`.
- `circuit_state_before` ∈ `{closed, half_open, open}`; transitions follow sys-04 §8 state machine — `closed → open` only after 5 failures in 30s.
- `recovery_attempt_no` monotonic within `(session_id, role)` — re-failover within the same turn increments.

## Edge cases

- **Circuit-only event:** circuit transition (e.g. from half_open → open) NOT tied to a specific turn is written with `session_turn_id=NULL` and the `session_id` of the session that caused the transition (last triggering session).
- **Cache or canned served:** when phrase cache or sys-05 fallback template serves, `outcome='cache_served'` / `'canned_served'` and `fallback_provider='phrase_cache'` / `'fallback_template'`.
- **Cost reconciliation:** finance roll-up joins this table with [[session_turns]].cost_*_micros to attribute cost variance to failover events.
- **No cross-domain dependency:** all FKs are intra-domain (same `04-realtime/` folder). No Phase 3 reconciliation needed.
- **Privacy:** records hold no transcript content — only provider-native error codes + http_status. Safe to retain across COPPA boundary; nonetheless 30d cap aligns with [[session_turns]].
