# Edge Cases — `course-browse`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).

---

## UC-C01

- **error**: Course-tree fetch failure must surface a recoverable error so the child sees something other than a blank screen.
- **timeout**: Course-tree fetch exceeding SLO must surface a retry CTA rather than spin forever.
- **unauthorized**: Token expiry between hub and course-tree fetch must reroute to login.

## UC-C02

- **error**: Level fetch failure must surface a recoverable error and offer a retry without losing the level context.
- **timeout**: Level fetch exceeding SLO must surface a retry CTA.
- **unauthorized**: Locked level tapped while server says "no" (when server gating lands) must explain "complete the previous level first" instead of generic deny.

## UC-C03

- **error**: Unit fetch failure must surface a recoverable error and offer a retry.
- **timeout**: Unit fetch exceeding SLO must surface a retry CTA.

## UC-C04

- **error**: Lesson-list fetch failure must surface a recoverable error rather than show stale rows.
- **timeout**: Lesson-list fetch exceeding SLO must surface a retry CTA.

## UC-C05

- **error**: Lesson-detail fetch failure must keep the child on the unit context with a recoverable error.
- **timeout**: Lesson-detail fetch exceeding SLO must surface a retry CTA.
- **unauthorized**: Lesson-detail for a locked lesson (when server gating lands per KD11) must redirect rather than render a half-loaded surface.

## UC-C06

- **n/a**: Start-from-detail is a single-step navigation handoff into lesson-session — destination owns its own loading and error contracts.

## UC-C07

- **error**: Review-queue fetch failure must surface a recoverable empty-state with a retry rather than start an empty session.
- **validation**: Empty review queue must surface "Nothing to review yet" rather than launch a degenerate session.

## UC-C08

- **error**: Daily-mission fetch failure must surface a recoverable error and offer "Try again" rather than launch an empty mission.
- **validation**: Daily mission already completed for today must surface a "Done for today" empty-state instead of re-launching.
- **timeout**: Daily-mission fetch exceeding SLO must surface a retry CTA.
