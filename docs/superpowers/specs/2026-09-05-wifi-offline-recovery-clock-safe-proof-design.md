# Wi-Fi Offline Recovery and Clock-Safe Proof Design

## Goal

Close the remaining Android-to-robot Wi-Fi reprovisioning release blockers:

1. A robot that loses its saved access point must make itself discoverable for setup without requiring a BOOT press.
2. Mobile must not reject a successful reprovision merely because the phone clock differs from the backend clock.
3. The complete change-Wi-Fi flow must pass at least four consecutive physical cycles, including cancellation/retry coverage, without exposing Wi-Fi credentials.

## Considered approaches

### Selected: firmware disconnect watchdog plus backend-timestamp baseline

- Arm the existing 60-second Wi-Fi connection timer when a runtime station disconnect first occurs. Do not restart it on each reconnect event. Stop it when Wi-Fi reconnects. When it expires outside an active lesson, enter BluFi setup automatically.
- After credential-only BLE handoff completes, mobile obtains a backend device-status observation and records its `lastSeenAt` as the backend-clock baseline. Completion requires `online=true`, the exact requested SSID, and a later valid `lastSeenAt`. If the baseline cannot be obtained, the first valid observation establishes it and a later observation proves freshness.

This reuses existing firmware recovery and mobile polling boundaries, avoids schema changes, and rejects heartbeats emitted before or during a slow handoff.

### Rejected: fixed clock-skew tolerance

Subtracting a tolerance from phone time is small but cannot be correct for arbitrarily misconfigured clocks and can accept a stale same-SSID heartbeat.

### Rejected: new backend provisioning-attempt marker

A server-issued attempt sequence would be strongest long-term, but requires a coordinated API/schema/firmware rollout. It is disproportionate for the current release blocker because backend timestamps already provide an ordered marker.

## Firmware behavior

- Initial boot behavior remains unchanged: saved-network connection attempts already enter setup after the existing timeout.
- A runtime `Disconnected` event arms the same one-shot timeout only when it is not active and config mode is not already active.
- Repeated station retries do not extend the deadline.
- A `Connected` event cancels the timeout.
- Timeout handling remains serialized through `RequestWifiConfigMode` and preserves the active-lesson guard.
- Explicit remote `wifi_setup`, invalid-credential rollback, generation fencing, BLE timeout, and credential scrubbing remain unchanged.

## Mobile behavior

- Credential-only provisioning no longer compares server `lastSeenAt` with `Date.now()`.
- Immediately after BLE handoff, obtain a status baseline using the same retry/deadline discipline as the online poll.
- A valid completion observation must be online, report the exact SSID, contain a parseable backend timestamp, and be strictly newer than the baseline.
- If no baseline timestamp is available, the first valid timestamp is baseline only; a later timestamp is required for success.
- Pairing cancellation clears pending polling timers and never navigates after unmount.
- Offline-help copy states that automatic setup may take up to one minute and retains BOOT as an explicit last resort.

## Tests

- Firmware contract tests cover runtime disconnect timer arming, non-extension across repeated disconnect events, cancellation on reconnect, and setup entry on timeout.
- Mobile tests reproduce a phone clock ahead of backend time and prove successful exact-SSID completion from an advancing backend timestamp.
- Mobile tests reject the same baseline timestamp and a heartbeat observed during a slow BLE handoff.
- Existing invalid-password rollback, exact-SSID, deadline, cancellation, BLE scan, and credential-redaction tests remain green.
- Physical verification performs at least four successful change-Wi-Fi cycles without BOOT, plus cancellation/retry and invalid-credential recovery where practical.

## Security and observability

- Passwords are never printed, persisted in QA artifacts, or passed as plaintext shell arguments.
- Logs may include SSID, state transitions, timestamps, and Wi-Fi disconnect reason codes.
- Completion remains fail-closed when exact SSID or advancing backend heartbeat proof is absent.
