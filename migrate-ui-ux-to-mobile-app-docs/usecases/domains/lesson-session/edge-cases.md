# Edge Cases — `lesson-session`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5). The voice loop is causally chained — most UCs declare at least one async failure mode.

---

## UC-L01

- **error**: Session-create failure must surface a recoverable error and keep the child on `lesson_ready` rather than dump them into a half-open `connecting` screen.
- **timeout**: Session start that exceeds SLO must surface a retry CTA with the lesson context preserved.
- **unauthorized**: Expired auth token at start time must reroute to login before any session is created.

## UC-L02

- **error**: Realtime transport open failure must escalate to UC-L19 Recover from Audio Error rather than silently spin.
- **timeout**: Connect that exceeds the SLO must abort and route to UC-L19 so the child is never stuck on `connecting`.
- **retry**: Transport open must allow at least one bounded retry before giving up so transient blips do not cost a session.

## UC-L03

- **error**: TTS playback failure for the greeting must skip past the greet and into `activity_intro` rather than block the start.
- **timeout**: Greeting audio that never streams within SLO must fall through to `activity_intro` with a silent greeting.

## UC-L04

- **n/a**: Activity intro is a view-only framing screen with a single-step CTA — no async work fires from this screen.

## UC-L05

- **error**: TTS streaming failure must terminate the speak phase and advance to `robot_listening` so the loop progresses.
- **timeout**: Robot speech that exceeds upstream SLO must auto-advance to listening.

## UC-L06

- **timeout**: Silence past the threshold must fire UC-L12 Receive Silence Prompt to nudge the child.
- **error**: Mic permission revoked between turns must escalate to UC-L19 Recover from Audio Error.

## UC-L07

- **error**: Audio capture failure mid-utterance must escalate to UC-L19 with the turn lost-but-recoverable.
- **timeout**: Capture that exceeds the per-turn cap must finalize the buffer and advance to `thinking` to keep the loop moving.

## UC-L08

- **error**: ASR / grading failure must default to UC-L11 Retry Prompt rather than crash the loop, so the child gets another chance.
- **timeout**: Processing that exceeds SLO must fall through to UC-L12 Silence Prompt and resume listening.

## UC-L09

- **error**: Success audio playback failure must skip ahead to the next turn rather than block — celebration is non-essential to progression.

## UC-L10

- **error**: Correction audio playback failure must still surface the visual correction text and advance to `robot_listening`.

## UC-L11

- **error**: Retry-prompt audio failure must still surface the visual prompt and advance to `robot_listening`.

## UC-L12

- **timeout**: Repeated silence (≥ 3 cycles per L12 alt-flow) must escalate to UC-L19 to suggest mic check.
- **error**: Silence-prompt audio failure must still surface the visual nudge and re-arm the listener.

## UC-L13

- **error**: Off-topic audio failure must still surface the visual redirect and advance to `robot_listening`.

## UC-L14

- **error**: False-positive barge-in detection must gracefully fall back to `robot_listening` without losing the prior speak phase.
- **cancel**: Child resuming silence after barge-in must not corrupt the turn — treat as cancel and resume `robot_speaking`.

## UC-L15

- **n/a**: Activity-done celebration is a view-only screen with a single-step "Keep going" CTA — no async work runs here.

## UC-L16

- **error**: Lesson-end summary handoff failure must keep the child on `lesson_done` with a "Back home" affordance rather than blank.
- **timeout**: Summary fetch that exceeds SLO must allow "Back home" to bypass the summary entirely.

## UC-L17

- **n/a**: Exit-confirm sheet is a view-only single-step gate with two terminal choices — no async work fires from this screen.

## UC-L18

- **retry**: Reconnect must apply bounded backoff (at least 3 attempts) before escalating to fallback-shell.
- **error**: Final reconnect failure must hand off to fallback-shell rather than silently abandon the session.
- **timeout**: Each reconnect attempt that exceeds the per-attempt SLO counts as a failure and increments the attempt counter.

## UC-L19

- **retry**: Audio recovery must allow the child to retry mic capture before giving up.
- **error**: Persistent audio failure must hand off to fallback-shell mic-needed surface so the child gets a clear path forward.
- **unauthorized**: Mic permission denied at the OS level must route to UC-O03 (mic permission ask) rather than loop on retries.

## UC-L20

- **error**: Safety screen must always render even if UC-L21 reporting fails — the child's safety UX path is independent of the report status.

## UC-L21

- **retry**: Safety event report failure must queue for retry with bounded backoff so a single network hiccup does not lose a flagged event.
- **error**: Persistent report failure must surface a parent-visible warning later (out of band) but must NEVER block UC-L20's terminal path home.
- **timeout**: Report that exceeds SLO must fail-fast into the retry queue rather than block the safety UX.

## UC-L22

- **error**: `device_offline` 409 must show "Robot is offline" with retry CTA — UC-F01 troubleshooting path; must not auto-retry indefinitely (drains battery / cost).
- **timeout**: MQTT-to-robot dispatch > 3s without WS handshake must surface "Robot taking longer than usual"; observer lane must remain attached and listen.
- **validation**: `entitlement_check_failed` 402 must route to UC-SUB05 (dunning) or UC-CL03 (purchase) depending on entitlement source; never silently fall back.
- **unauthorized**: Stale parent JWT must not block; UC-L22 is child-initiable too. But `parent_terminate` triggers require the parent's fresh JWT per ADR-0005 D6.
- **cancel**: User-cancel before WS opens (CONNECTING → ABANDONED) must release the device-session-id lock server-side so a fresh start works immediately.
- **retry**: `idempotency_replay_410` (stale key against non-OPEN session) must mint a fresh Idempotency-Key per audit C5 + retry once; never replay the old key.

> Ref: `docs/flows/edge-cases/error.flow.mmd`, `docs/flows/edge-cases/timeout.flow.mmd`, `docs/flows/edge-cases/validation.flow.mmd`, `docs/flows/edge-cases/unauthorized.flow.mmd`, `docs/flows/edge-cases/cancel.flow.mmd`, `docs/flows/edge-cases/retry.flow.mmd`
