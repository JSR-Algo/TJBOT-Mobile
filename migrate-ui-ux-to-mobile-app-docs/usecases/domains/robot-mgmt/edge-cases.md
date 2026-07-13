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

- **error**: Household-device fetch failure must show translated unavailable copy and an explicit retry action without inventing cached telemetry.
- **retry**: Retry re-fetches the selected child's authoritative device identity and operational state.
- **validation**: No matching robot is an explicit unavailable state; nullable or defaulted battery/Wi-Fi/course/mic/software fields are never rendered as truth.

## UC-RM03

- **n/a**: This view-only prototype is production-hidden until authoritative battery and charging fields exist.

## UC-RM04

- **error**: Wi-Fi list scan failure must surface a recoverable error.
- **retry**: User must be able to re-scan the network list at least 3 times in a session before being throttled.
- **unauthorized**: Joining a different SSID requires re-auth (UC-DP08) — must be enforced before sending the new password.

## UC-RM05

- **n/a**: This view-only prototype is production-hidden until authoritative installed-course and storage fields exist.

## UC-RM06

- **n/a**: This view-only prototype is production-hidden until authoritative firmware and OTA contracts exist.

## UC-RM07

- **validation**: Volume slider must clamp to 0–10; quiet-hours must validate start < end; failures must keep the prior value rather than save invalid state.
- **error**: Pushing settings to Robot can fail; failure must keep the local state and offer a retry.

## UC-RM08

- **n/a**: This view-only prototype is production-hidden until a real robot microphone-test contract exists.

## UC-RM09

- **n/a**: This view-only prototype is production-hidden until a real robot speaker-test contract exists.

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
