---
entity: realtime_sessions
domain: 04-realtime
service_owner: RealtimeService
state_machine: .omc/plans/state-machines-mobile-ux.md#22-lessonsession
api_endpoints:
  - POST /v1/realtime/sessions/open
  - GET /v1/realtime/sessions/:id
  - POST /v1/realtime/sessions/:id/close
  - GET /v1/realtime/sessions/active
sequences_referenced_in:
  - docs/sequences/04-realtime/session-start-mobile.sequence.mmd
  - docs/sequences/04-realtime/observer-attach.sequence.mmd
  - docs/sequences/04-realtime/ws-handshake.sequence.mmd
  - docs/sequences/04-realtime/turn-pipeline.sequence.mmd
  - docs/sequences/04-realtime/session-close.sequence.mmd
  - docs/sequences/04-realtime/barge-in.sequence.mmd
retention: 90d
---

# realtime_sessions

## Business purpose

Authoritative record of a real-time voice conversation between a child and TBot, anchored to a specific physical device. One session per active device at any given time. Tracks the full lifecycle from device SESSION_OPEN signal through to session close, along with cost, turn count, and end reason for billing, safety, and content personalization downstream.

**Note:** The audit/business term "ChildSession" used in ADR-0006 and some mobile-team docs maps to this table. `realtime_sessions` is the canonical ERD name (matches SM plan §8.2).

## Ownership rules

- Owner service: `RealtimeService`
- Writers: `RealtimeService` (creates on SESSION_OPEN; increments turns_count and bargein_count per turn; sets end_at + end_reason on close), `RetentionScheduler` (sets state=timed_out for idle sessions)
- Readers: `RealtimeService` (session state guard), `ControlPlane` (WS routing), `Orchestrator` (turn pipeline), `ControlsService` (parent stop), `TelemetryService` (cost attribution), `ParentApp` (observer attach + session history)

## Lifecycle

- Create: on `SESSION_OPEN` WebSocket message from device. `RealtimeService` sets state=connecting, mints session UUID, writes row.
- Update: state transitions via optimistic concurrency on `state_version` (increment-on-write). `turns_count`, `bargein_count`, `cost_cents` updated after each turn completes.
- Delete: never hard-deleted at close. `RetentionScheduler` soft-deletes via `deleted_at` after 90 days (rows with `state` = closed/error/timed_out only). Hard-delete occurs only via `DeletionExecutor` during account deletion.
- State machine: `.omc/plans/state-machines-mobile-ux.md#22-lessonsession`

  | From | To | Trigger |
  |---|---|---|
  | idle | connecting | SESSION_OPEN received |
  | connecting | handshaking | WS upgrade accepted |
  | handshaking | open | Google Live Flash stream established |
  | open | turn_active | child utterance started |
  | turn_active | barge_in | child utterance while TBot speaking |
  | turn_active | turn_complete | TBot response played |
  | barge_in | turn_active | barge-in accepted, new turn begins |
  | turn_complete | open | ready for next turn |
  | open/turn_active/turn_complete | closing | parent_stop / cost_limit / barge_limit signal |
  | open | reconnecting | WS disconnect detected |
  | reconnecting | open | WS reconnected within TTL |
  | reconnecting | timed_out | reconnect TTL elapsed |
  | closing | closed | SESSION_CLOSE ack from device |
  | any | error | fatal error in pipeline |
  | open | paused | device goes silent for pause window |
  | paused | open | device activity resumes |
  | paused | timed_out | idle timeout elapsed |

## Notes

### Partial unique index workaround

DBML does not support partial unique index syntax. The constraint "at most one active session per (user_id, device_id)" is documented here and enforced at two layers:

1. **Application layer**: `RealtimeService.openSession()` does a conditional check — `SELECT id FROM realtime_sessions WHERE user_id=$1 AND device_id=$2 AND state NOT IN ('closed', 'error', 'timed_out')` — and rejects SESSION_OPEN with 409 if a row is found.
2. **Database layer**: a hand-authored migration adds `CREATE UNIQUE INDEX idx_realtime_sessions_active_partial ON realtime_sessions(user_id, device_id) WHERE state NOT IN ('closed', 'error', 'timed_out')`. The `Indexes` block in the DBML carries a NOTE describing this; the partial predicate is not expressible in DBML syntax.

The regular `(user_id, device_id)` index in the DBML is retained for the hot-path query described in its Note; the partial unique index is the uniqueness enforcer.

## Related APIs

- `POST /v1/realtime/sessions/open` — called by device via WS upgrade; creates session row
- `GET /v1/realtime/sessions/:id` — parent observer poll
- `POST /v1/realtime/sessions/:id/close` — parent-initiated stop
- `GET /v1/realtime/sessions/active` — check if any session is active for the authenticated household

## Related sequences

- `docs/sequences/04-realtime/session-start-mobile.sequence.mmd` — session creation flow
- `docs/sequences/04-realtime/observer-attach.sequence.mmd` — parent app attaching to live session
- `docs/sequences/04-realtime/ws-handshake.sequence.mmd` — WS upgrade + stream setup
- `docs/sequences/04-realtime/turn-pipeline.sequence.mmd` — turn lifecycle
- `docs/sequences/04-realtime/session-close.sequence.mmd` — normal and forced close
- `docs/sequences/04-realtime/barge-in.sequence.mmd` — barge-in interrupt handling

## Validation rules

- `device_session_id` unique — device generates it; duplicate SESSION_OPEN with same device_session_id returns the existing session row (idempotent open).
- `cost_cents` must be ≥ 0.
- `state_version` must be monotonically increasing; optimistic lock rejects stale writes.
- `end_at` must be ≥ `start_at` if set.

## Edge cases

- **Device disconnect during turn**: `reconnecting` state preserves the session; WS reconnect within TTL resumes without creating a new session.
- **Cost limit**: `RealtimeService` checks `cost_cents` after each turn; exceeds threshold → initiates `closing` transition with `end_reason=cost_limit`.
- **Barge-in limit**: similarly checked per turn; `end_reason=barge_limit` if threshold crossed.
- **Account deletion**: `DeletionExecutor` hard-deletes all rows for user_id regardless of state after the retention scrub.
- **Cross-domain FKs**: `child_id` → `children.id` (IdentityService) is declared as a comment-only Ref; `device_id` → `devices.id` (DeviceService) is an explicit Ref on this table.
