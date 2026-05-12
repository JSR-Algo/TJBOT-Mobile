# Edge Cases — `device-pairing`

> Per UC, declare a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}` (D5/AC6).
>
> `n/a` ratio per domain ≤ 50% (D5).

---

## UC-DP01

- **n/a**: Device overview is a view-only marketing surface — no async work, no input that can fail.

## UC-DP02

- **cancel**: Parent must be able to back out of the choice ("new robot" vs "offline") without entering either flow.
- **n/a**: Selection itself is single-step navigation — no async call to fail.

## UC-DP03

- **n/a**: Power-on instructions are a view-only checklist; the physical button-hold is off-app and stateless.

## UC-DP04

- **timeout**: Scan must surface a bounded retry CTA after no-discovery (current prototype auto-advances on a 2.4 s timer; real wiring needs a timeout limit per KD8).
- **error**: Radio-stack failure (BLE off, OS denied) must surface a recoverable error and route to UC-DP11.
- **cancel**: Parent must be able to abort the scan and return to UC-DP02.

## UC-DP05

- **validation**: Parent must visually confirm the candidate Robot id is theirs before tapping "This is my Robot" — wrong-device pairing is the worst failure mode.
- **retry**: "Search again" must re-run UC-DP04 cleanly without holding the previous candidate state.

## UC-DP06

- **validation**: All 4 digits must be entered and must match Robot's display before the CTA enables.
- **error**: Wrong code must keep the form populated and offer a retry with reasoning copy.
- **timeout**: Robot's displayed code must rotate after a bounded interval; UI must invalidate stale entries.

## UC-DP07

- **error**: Wi-Fi scan failure (no SSIDs visible, scan denied) must surface a recoverable error.
- **cancel**: Parent must be able to back out to UC-DP06 without losing pairing-code state.

## UC-DP08

- **validation**: Empty password must block the "Connect Robot" CTA; show-password toggle must not log the value.
- **error**: Network-side rejection must surface a recoverable error and keep the password field populated.

## UC-DP09

- **timeout**: Each connecting sub-stage (send Wi-Fi / DHCP / account login / starter lesson) must have a bounded timeout; current 900 ms prototype stub is unrealistic.
- **error**: Sub-stage failure must route to UC-DP11 with the specific failed sub-stage preserved for diagnosis.
- **retry**: Recovery must allow re-entering the failed sub-stage without restarting the whole sequence.

## UC-DP10

- **n/a**: Pairing-success is a single-step terminal confirmation — no async work that can fail at this point.

## UC-DP11

- **retry**: Each remediation card must route the user back into the appropriate sub-step cleanly, preserving in-flight state where safe (Wi-Fi password, candidate Robot id).
- **error**: If all remediation paths fail, the recovery surface must offer escalation to UC-RM12 (Contact Support).

## UC-DP12

- **error**: Each remediation row (replug / Wi-Fi / restart) must surface failure if Robot is still offline after the attempt.
- **retry**: "Reconnect now" must re-run UC-DP04 without losing the previously-bound Robot id.
- **timeout**: "Last seen 2 hours ago" snapshot must refresh on screen mount; stale data hides connectivity drift.

## UC-DP13

- **validation**: A buddy must be selected before the "Save and meet Robot" CTA enables (state-only in the prototype; the page allows progression).
- **error**: Persisting buddy choice to Robot can fail; failure must keep the selection populated and offer a retry.

## UC-DP14

- **n/a**: First-lesson hand-off is a view-only coaching strip — no input to validate, no async call to fail at this surface.
