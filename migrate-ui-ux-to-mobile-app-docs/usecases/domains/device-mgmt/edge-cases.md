# Edge Cases — `device-mgmt`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).

---

## UC-DM01

- **error**: Status fetch failure (Robot offline / API error) must surface a non-blocking banner — user can still see cached state.
- **timeout**: Hero card must fall back to "checking…" and then to "offline" within bounded time if telemetry stalls.
- **retry**: "Sync content" row must offer a manual retry that re-runs the sync.

## UC-DM02

- **error**: Live telemetry stream failure must surface a non-blocking degraded indicator without ending the lesson.
- **timeout**: If the LCD-state stream is silent past a bounded interval, UI must show "live stream paused" rather than freeze.
- **cancel**: "End lesson" control must invoke a confirm step before terminating Robot's session.

## UC-DM03

- **timeout**: Chime must auto-stop after the documented 30 s window if Parent does not return; the page reflects this in its "Robot will keep playing for 30 seconds" copy.
- **error**: Robot offline at chime invocation must surface a recoverable error and explain why no sound is playing.

## UC-DM04

- **error**: OTA download / install failure must surface a recoverable error and offer "try again later".
- **timeout**: OTA stuck past the documented ~4 minute ETA must surface a "this is taking longer than expected" banner with cancel.
- **cancel**: Parent must be able to abort an in-progress OTA install; "Update tonight" must be cancelable from the schedule before tonight.

## UC-DM05

- **n/a**: LCD face library is a view-only catalog page — stateless, no async, no input to validate.

## UC-DM06

- **n/a**: One-lesson-turn breakdown is a view-only design-review surface — stateless, single-step render.
