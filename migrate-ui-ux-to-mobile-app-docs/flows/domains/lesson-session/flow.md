<!-- HAND-CURATED. -->
# Lesson Session Flow

## Happy Path

`lesson_ready` → `connecting` → `greeting` → `activity_intro` → (turn loop: `robot_speaking` ↔ `robot_listening` ↔ `user_speaking` → `thinking` → back) → `activity_done` → `lesson_done` → `home_hub_idle`.

## Server-Authoritative Terminals

All terminal transitions are emitted by `realtime-orchestrator` (sys-04) via WebSocket events. The client mirrors state — it never self-declares a terminal on wallclock alone.

| State | `end_reason` | Server event |
|---|---|---|
| `lesson_done` | `complete` | `session.end reason=complete` |
| `timed_out` | `timeout` / `turns` / `barge_limit` | `session.end reason=timeout\|turns\|barge_limit` |
| `cost_capped` | `cost_limit` | `session.end reason=cost_limit` |
| `parent_stopped` | `parent_stop` | `session.end reason=parent_stop` |
| `abandoned_disconnect` | `disconnect_timeout` | `session.end reason=disconnect_timeout` |
| `exit_confirm` → abandon | `user_exit` | `POST /v1/sessions/{id}/end` (client-initiated) |

`disconnect_timeout` collapses to `timeout` in analytics; the nav-graph keeps them separate for UX copy.

## RECONNECTING Window

On `ws_disconnect` or 3 missed heartbeats, the machine enters `reconnecting`. The server keeps the session OPEN for 10 seconds. If `session.resumed` arrives within 10s (same `device_session_id`), → back to active turn loop. If `session.end reason=disconnect_timeout` arrives, → `abandoned_disconnect`. The client shows an offline banner after 15s as a non-terminal safety fallback — this banner never escalates to a terminal state on its own.

## Parent-Stop Cooldown

After `parent_stopped`, the server sets `parent_stop_cooldown_until` on the user record (30 min or until primary parent clears via `POST /v1/parent/sessions/{user_id}/unblock`). `POST /v1/sessions/start` returns 423 during cooldown.

## Edge Cases

| State | Scenario | Exit |
|---|---|---|
| `audio_error` | WS or audio init fails during `connecting` | Retry once → `connecting`; give up → `home_hub_idle` |
| `reconnecting` | 10s window expires | → `abandoned_disconnect` → `home_hub_idle` |
| `timed_out` | 30 min / 60 turns / 5 barge-ins | → `home_hub_idle` |
| `cost_capped` | $0.12 per-session ceiling | → `home_hub_idle` (child-friendly "robot needs a break" copy) |
| `parent_stopped` | Parent taps remote stop | → `home_hub_idle`; 30-min cooldown blocks new session |
| `safety` | Safety filter block (sys-05) | Terminal; no retry. Requires parent flow to re-enable. |
