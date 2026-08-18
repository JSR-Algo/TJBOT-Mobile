# Android Update Wi-Fi False Timeout — 2026-08-11

## Scope

Ad-hoc sys-16 fix supporting lesson-production task T5.4. No BLE wire schema, firmware, backend endpoint, router, phone Wi-Fi setting, or credential handling contract changed.

## Reproduction

- Device: connected Android phone, package `com.TJBotmobile`, version `1.0.2`.
- Flow: owned Robot -> Update Wi-Fi -> existing network -> transient password -> Connect Robot.
- App result: `WIFI_CONNECT_TIMEOUT`, rendered as "Robot did not join Wi-Fi in time".
- Android log: the app disabled BluFi notifications and closed the GATT link at `2026-08-11 10:59:35 +07:00`.
- Robot evidence after the app failure: `../robot/docs/evidence/t54-live-20260811-wifi-update-debug/`.
  - `WifiStation: Got IP`.
  - `Application: Network connected`.
  - Production OTA request reported the submitted SSID and corrected firmware ELF hash.
  - `Application: passive_lesson_websocket_opened`.

The credentials were delivered and accepted. The terminal BluFi connection report was lost while firmware left provisioning/rebooted, so the app produced a false negative.

## Fix

- Keep `provisionWifiViaLocalBle` fail-closed when `STA_CONN_SUCCESS` is missing.
- In the owned-robot `ble_reconnect` orchestrator only, reconcile `WIFI_CONNECT_TIMEOUT` against the known backend device.
- Accept recovery only when `online === true` and a valid `lastSeenAt` is at or after the current reconnect attempt start.
- Preserve failure for stale/missing timestamps, explicit `WIFI_CONNECT_FAILED`, and every non-reconnect transport.

## TDD Evidence

Focused baseline before the new test: 50 passed.

RED:

```text
Test Suites: 1 failed, 1 total
Tests:       3 failed, 50 passed, 53 total
```

Expected failures proved that the old catch path navigated directly to `PairFailedScreen` and never queried device status.

GREEN:

```text
Test Suites: 1 passed, 1 total
Tests:       53 passed, 53 total
```

The added cases cover fresh recovery, stale timestamp rejection, and missing timestamp rejection.

## Remaining Verification

Full mobile gates, Android build/install, and a repeated physical Update Wi-Fi run are recorded here before merge.
