# Android BluFi Discovery Settle Delay Design

## Evidence

The Android phone establishes the BLE connection, and the app immediately
calls service discovery roughly 30 ms later. Android then reports a successful
connection-parameter update about 500 ms after discovery begins. Service
discovery remains pending for both the 15-second and 20-second experiments and
only completes when the app cancels the connection. Extending the timeout is
therefore not an effective fix.

## Scope

Add one Android-only settling delay between a successful BLE connection and
the first service-discovery request. Preserve the current connection, retry,
15-second discovery timeout, BluFi framing, Wi-Fi scan, provisioning, and
manual-network fallback behavior. Do not change robot firmware.

## Design

Wait 600 ms immediately before each Android
`discoverAllServicesAndCharacteristics()` call. The delay is longer than the
observed connection-parameter update while remaining short enough to be
imperceptible in the pairing flow. iOS continues without the delay.

Keep the delay next to the shared discovery helper so Wi-Fi-list scanning and
provisioning use identical ordering. Cancellation and existing bounded
timeouts remain responsible for failed or disconnected sessions.

## Verification

Add a fake-timer regression test proving Android does not start service
discovery before 600 ms and starts it immediately afterward. Verify iOS does
not inherit the delay. Run the focused BLE tests, type checking, Android build,
and install the APK on the attached phone.

Physical success requires service discovery to complete before cancellation,
notification subscription to succeed, and the robot-provided Wi-Fi list to
appear. If discovery still hangs, the experiment rules out the Android timing
race and confirms that firmware-side ATT/GATT diagnostics are required.

## Non-Goals

- No increase to the 15-second service-discovery timeout.
- No firmware flash, reset, serial access, or robot state change.
- No credential logging or unrelated BLE refactor.
