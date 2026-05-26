# Edge Cases — `course-library`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).
>
> KD11: Course-lock enforcement is client-side only — server enforcement deferred. UC-CL04 below records this in the `unauthorized` mode rationale.

---

## UC-CL01

- **error**: Library list fetch failure must surface a recoverable error with cached tiles still visible.
- **timeout**: Tile thumbnails / LCD previews must time out and fall back to a placeholder rather than block the grid.
- **retry**: Pull-to-refresh / explicit refresh must re-run `listLibrary`.

## UC-CL02

- **error**: Course-detail fetch failure must surface a recoverable error and keep the previously-known summary visible.
- **n/a**: Otherwise the screen is a view-only detail page — no input to validate.

## UC-CL03

- **validation**: A plan must be selected before "Confirm & continue" enables.
- **error**: Plan-fetch / pricing-fetch failure must keep the previously-known plan visible and surface a recoverable banner.
- **cancel**: "Not now" must return to UC-CL02 cleanly without leaving an in-flight purchase intent.

## UC-CL04

- **validation**: All 4 entered digits must match the displayed code before the confirm CTA enables.
- **unauthorized**: client-side gate only — server enforcement deferred (KD11). Must not be treated as an entitlement check at the API boundary.
- **retry**: Wrong code must not lock out the parent immediately (no rate-limit in prototype); a real-world build will need a rate-limit decision.

## UC-CL05

- **n/a**: Course-added is a single-step terminal confirmation — the bind happened upstream; this surface only confirms.

## UC-CL06

- **validation**: A lesson must be picked before "Send to Robot" enables.
- **error**: `sendCourseToRobot` failure must surface a recoverable error and route to UC-CL11 (Resync) for diagnosis.
- **timeout**: Send must time out within a bounded interval; stalled "sending…" hangs the flow.

## UC-CL07

- **n/a**: Robot-ready is a single-step view-only confirmation — no async to fail, no input to validate.

## UC-CL08

- **n/a**: Lesson-running is a passive view-only surface — the lesson itself runs on Robot, off this page's lifecycle.

## UC-CL09

- **error**: Companion telemetry stream failure must surface a non-blocking degraded indicator.
- **timeout**: If the LCD-state stream is silent past a bounded interval, UI must show "live stream paused" rather than freeze.

## UC-CL10

- **n/a**: Lesson-complete is a single-step terminal celebration — the result was emitted upstream; this surface only summarizes.

## UC-CL11

- **error**: Resync failure must surface a recoverable error with the specific failure cause (Wi-Fi vs auth vs Robot off).
- **retry**: "Reconnect Robot now" must be re-runnable until success without losing per-attempt diagnostic state.
- **timeout**: Resync must time out within a bounded interval; stalled progress hangs the parent.

## UC-CL12

- **error**: Locked-state fetch failure must keep the prior locked banner visible and offer a recoverable retry.
- **unauthorized**: This is the "insufficient access" surface — it is the canonical destination for unauthorized course access; the page exists to communicate why and offer the unlock path.
