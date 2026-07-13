# Edge Cases — `robot-mgmt`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).

---

## UC-RM01

- **error**: Owned-row fetch or preference mutation failure must retain the last server-confirmed visibility and expose a translated retry/error state.
- **retry**: Retry re-fetches owned rows; preference writes remain device-scoped and are never queued offline.
- **validation**: Empty owned rows are explicit, opted-out rows remain manageable, nullable streaks say refreshing, and absent battery/Wi-Fi/course/mic values are never fabricated.

## UC-RM02

- **error**: Status rollup fetch failure must surface a banner without hiding cached state.
- **n/a**: The page itself is a single-step rollup view — no input to validate.

## UC-RM03

- **error**: Battery telemetry failure must surface a non-blocking error; the percentage hero must show last-known value.
- **timeout**: Charging-state inference must time out after a bounded interval rather than indefinitely show "charging".

## UC-RM04

- **error**: Wi-Fi list scan failure must surface a recoverable error.
- **retry**: User must be able to re-scan the network list at least 3 times in a session before being throttled.
- **unauthorized**: Joining a different SSID requires re-auth (UC-DP08) — must be enforced before sending the new password.

## UC-RM05

- **error**: Storage read failure (Robot offline) must surface a degraded list with cached entries.
- **n/a**: Browse-and-drill-into-library is otherwise no-async at this layer — actual mutations live in course-library.

## UC-RM06

- **error**: OTA dispatch failure must surface a recoverable error and keep the version banner visible.
- **timeout**: If OTA queueing stalls past a bounded interval, UI must surface "queue is busy" with retry.
- **cancel**: Parent must be able to back out before tapping "Update Robot now".

## UC-RM07

- **validation**: Volume slider must clamp to 0–10; quiet-hours must validate start < end; failures must keep the prior value rather than save invalid state.
- **error**: Pushing settings to Robot can fail; failure must keep the local state and offer a retry.

## UC-RM08

- **timeout**: 5-second mic test must end within bounded time even if Robot stops streaming audio level data.
- **error**: Mic permission denied at run-time must route to UC-F02/UC-F03 audio-recovery flow.
- **retry**: User must be able to re-run the test from the "done" phase without leaving the page.

## UC-RM09

- **error**: Speaker test failure (no audio output) must offer the "Robot sounds quiet or muffled" path to UC-RM12 (Support).
- **retry**: Each sample button (chime / voice) must be re-tappable from the "done" phase.

## UC-RM10

- **unauthorized**: Factory reset must require an inline parent-gate pass (the prototype's `step='gate'`) before reaching the destructive confirm.
- **cancel**: Parent must be able to back out at every step (`warning`, `gate`, `confirm`) without erasing.
- **error**: Reset dispatch failure must surface a clear error — Robot may already be partially-erased; recovery requires re-pair (UC-DP04).

## UC-RM11

- **n/a**: Offline-help is a view-only checklist; the remediation steps it cites are stateless-from-this-page.

## UC-RM12

- **validation**: Topic + message body must both be non-empty before "Send to support" enables.
- **error**: Submission failure must keep the message populated and offer a retry.
- **cancel**: Parent must be able to discard and return without leaving a draft in flight.
