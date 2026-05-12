<!-- HAND-CURATED. -->

# Lesson-Session Domain — Flow Narrative

**Entry:** `lesson_ready` (from home hub or course detail)

**Exit targets:**
- `lesson_summary` → progress domain (lesson complete)
- `network_error` → fallback domain (unrecoverable audio/connection failure)
- `home_hub_idle` → home domain (exit confirmed)

## Journey

The lesson session is the core learning loop. It progresses through three phases:

**Start** — `lesson_ready` → `connecting` (voice link established) → `greeting` (robot intro). All happy-path.

**Activity loop** — `activity_intro` → `robot_speaking` ↔ `robot_listening` ↔ `user_speaking` → `thinking`. The loop is repeated per activity item. `silence` (no speech detected, prompt to try again) is a mild nudge, classified happy.

**Feedback** — After each exchange: `success` (happy); or recovery edges: `gentle` (gentle correction), `retry` (explicit retry prompt), `offtopic` (redirect for off-topic speech), `bargein` (robot was interrupted). All four feedback recovery states are `kind: "edge"` — they represent deviation from the happy loop.

**Done** — `activity_done` (one activity complete) or `lesson_done` (all activities complete, exits to progress domain).

**Edge states** — `reconnecting` (voice connection drop, retries with timeout), `audio_error` (hardware/permission failure, offers retry then exits to fallback), `safety` (content safety trigger, exits to fallback), `exit_confirm` (cancel sheet shown when kid taps exit mid-lesson).

## Edge cases used

| State | Template(s) | Notes |
|---|---|---|
| `gentle` | retry | Bounded retries on gentle correction path |
| `retry` | retry | Explicit retry prompt with attempt counter |
| `offtopic` | retry | Redirect + retry |
| `bargein` | error | Barge-in mid-utterance, surfaces error toast |
| `reconnecting` | retry, timeout | Auto-retries with countdown; falls to `audio_error` on timeout |
| `audio_error` | error, retry | Retry CTA → on exhaustion → `network_error` |
| `safety` | error | Safety fallback; no retry — exits directly |
| `exit_confirm` | cancel | Confirm sheet; resume or exit to home |

## Screenshots

TBD — design prototype screens at `src/features/lesson-session/`.
