# Edge Cases — `kid-hub`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).

---

## UC-H01

- **error**: Hub variant fetch failure must fall back to a safe default variant (`idle`) so the child is never stuck on an empty hub.
- **timeout**: Daily-state fetch that exceeds SLO must surface the `offline` variant with a "Reconnecting…" chip rather than spin forever.
- **unauthorized**: Expired auth token must drop the child to login (UC-A03) before any home variant renders to avoid leaking stale state.

## UC-H02

- **n/a**: Robot-tap greet is single-step view-only animation with a local timer — no async work, no state mutation outside a transient flag.

## UC-H03

- **error**: Lesson-ready handoff must surface a recoverable error if route resolution fails so the child does not see a blank screen.
- **unauthorized**: Token expired in the gap between hub render and CTA tap must reroute to login before the lesson session is created.

## UC-H04

- **n/a**: Course button is a stateless navigation tap into course-browse — the destination owns its own loading and error contracts.

## UC-H05

- **n/a**: Review button is a stateless navigation tap into course-browse review entry — destination owns loading and badge counts.

## UC-H06

- **n/a**: Progress button is a stateless navigation tap into the progress domain — destination owns its own data fetch and error display.

## UC-H07

- **error**: Settings open failure must keep the child on the hub with a recoverable affordance rather than navigating to a half-broken settings surface.
- **validation**: Toggle changes inside settings must validate locally before persisting so an invalid combination cannot brick audio.

## UC-H08

- **unauthorized**: Parent-gate handoff must enforce the speed-bump even if a previous gate session is cached — never grant parent-space access without a fresh gate pass.
- **error**: Gate-route resolution failure must keep the child on the hub rather than dump them into an undefined parent surface.
