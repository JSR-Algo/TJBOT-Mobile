# Edge Cases — `fallback-shell`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).
>
> These surfaces ARE themselves the edge-case handlers for other domains, so most modes here describe "what happens when the recovery itself fails."

---

## UC-F01

- **retry**: "Try again" must re-run reconnect (route to UC-F06) — re-tappable until success.
- **error**: Reconnect itself failing repeatedly must escalate to a stable "still no signal" state with a clear go-home option.
- **timeout**: Reconnect attempts must be bounded; the screen cannot loop indefinitely without giving the child a way out.

## UC-F02

- **retry**: After Parent fixes mic permission via UC-F03, returning here must re-check and route forward.
- **error**: If mic is unrecoverable (hardware failure), this surface must offer escalation to UC-RM12 Contact Support.

## UC-F03

- **n/a**: Audio recovery is a view-only OS-instructional checklist — stateless from the app's perspective; the OS owns the actual permission grant.

## UC-F04

- **retry**: "Pick up where we left off" must route to UC-F05 / UC-L05 cleanly each time it is tapped.
- **error**: If the resume itself fails, escalate to UC-F08 generic error.

## UC-F05

- **error**: Resume failure (lesson state lost) must route forward to a fresh-lesson-start path rather than back to UC-F04 (avoid loop).
- **n/a**: From Child's POV the surface is single-step ("Keep going") with no input to validate.

## UC-F06

- **timeout**: 2.4 s prototype timer must be replaced with a real reconnect bound; if reconnect takes longer, surface a determinate countdown.
- **error**: If reconnect fails after the bounded window, route back to UC-F01 with a "still trying…" state rather than dismiss the overlay silently.
- **cancel**: "Stop and go home" must cleanly tear down the reconnect attempt; no zombie listeners.

## UC-F07

- **unauthorized**: This surface is the safety-trip destination — it must be the only path off a tripped lesson; child cannot bypass it.
- **n/a**: From Child's POV the surface is single-step ("Take a break") — no input to validate; the parent-gate path is a separate flow.

## UC-F08

- **retry**: "Try again" must call `reset()` reliably; if `reset()` itself throws, the page must self-degrade to "go home" only rather than loop.
- **error**: Reporting the underlying error to a telemetry sink must not block the user-visible recovery path.
