# Memory-safe BluFi to Wi-Fi handoff

## Problem

Physical Android and Robot testing shows that the Robot accepts encrypted
credentials over BluFi but cannot associate with the access point while the BLE
stack remains active. At station start, internal/DMA memory is exhausted and the
Wi-Fi driver repeatedly fails small probe and association allocations.

The mobile claim flow then creates a false success: a missing BluFi connection
report is treated as a recoverable handoff, and the phone reports the device as
authenticated before a fresh Robot heartbeat proves that Wi-Fi credentials were
accepted and persisted. The backend can therefore show the Robot online from
stale state while the ESP server has no live WebSocket, making remote unpair
return `DEVICE_NOT_ONLINE`.

## Design

### Firmware handoff

After the firmware has received and decrypted all custom claim data, SSID, and
password frames, it stages the credentials transaction but releases the BluFi
host/controller before starting station association. The credentials and setup
generation remain owned by the existing provisioning transaction while BLE is
off.

The station worker then follows one of two terminal paths:

- Success: verify the connected SSID matches the staged candidate, commit the
  transaction to NVS, continue claim confirmation, and establish the normal
  heartbeat/WebSocket runtime.
- Failure: rollback the staged transaction, reset the single-flight connection
  guards, and restart a fresh BluFi advertising session automatically. The user
  can retry without pressing BOOT and without losing ownership or claim context.

The teardown must be generation-fenced so a stale Wi-Fi worker cannot close or
restart BLE belonging to a newer setup attempt.

### Mobile completion authority

The mobile app must not turn an absent BluFi connection report into final pairing
success. A claim handoff may become delivery-unknown after BLE teardown, but the
screen remains pending until a fresh backend observation proves the Robot came
online after the current handoff began.

The phone-side provisioning-authenticated report may remain a recovery mechanism
only after fresh Robot connectivity has been observed. A pre-existing
`device_authenticated`, `online`, or `lastSeenAt` value cannot complete the new
attempt.

Credential-only reconnect already requires a fresh `lastSeenAt`; the initial
claim path will use the same freshness rule.

### Remote unpair contract

Once the Robot is online, the existing production path remains unchanged:

1. Mobile sends `DELETE /devices/:deviceId`.
2. Backend asks ESP server to deliver the fixed system unpair command.
3. Firmware displays the initializing state, clears ownership and saved Wi-Fi,
   and reboots.
4. Robot automatically advertises BluFi setup mode without a BOOT press.
5. Backend returns success only after the Robot reports `UNPROVISIONED`.

## Error handling

- BLE teardown failure aborts station association and returns to a retryable
  setup state.
- Wi-Fi association failure never commits credentials and automatically restores
  BLE advertising.
- NVS commit failure disconnects Wi-Fi, rolls back credentials, and restores BLE.
- Missing/late BLE notifications cannot produce a successful mobile screen by
  themselves.
- Stale backend status cannot satisfy the current handoff freshness boundary.
- Duplicate taps remain single-flight on mobile, backend, and firmware.

## Verification

Automated regression tests will cover BLE-before-station ordering, rollback and
automatic re-advertising, setup-generation fencing, fresh-heartbeat completion,
and rejection of stale backend success.

Physical verification requires a rebuilt/flashed Robot and rebuilt Android APK:

- Pair and connect without pressing BOOT.
- Reset normally and verify saved Wi-Fi reconnect plus a live ESP WebSocket.
- Run three complete remote-unpair and re-pair cycles.
- Run three Wi-Fi change cycles.
- Exercise duplicate tap, temporary network loss, app background/foreground,
  Robot-offline unpair, and wrong-password recovery.

No production-ready claim is allowed unless all physical cycles finish with fresh
logs and the focused/full regression suites pass.
