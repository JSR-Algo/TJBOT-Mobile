# Reconnect Fresh-Online Confirmation Design

## Problem

The owned-robot `Update Wi-Fi` flow can deliver encrypted Wi-Fi credentials successfully but miss the terminal BluFi `STA_CONN_SUCCESS` notification while the firmware tears down BLE and reboots. The mobile app then surfaces `WIFI_CONNECT_TIMEOUT`, even though the robot later joins Wi-Fi and opens its production WebSocket.

Physical evidence from 2026-08-11 shows the app closing GATT after its 55-second report window, followed by the robot booting with the submitted network, receiving an IP address, logging `Application: Network connected`, and logging `passive_lesson_websocket_opened`.

## Decision

Keep the BLE service fail-closed: a missing connection report remains `WIFI_CONNECT_TIMEOUT`. Recover only in the owned-robot reconnect orchestrator, where the app knows the backend device identity.

When credential-only BluFi delivery ends with `WIFI_CONNECT_TIMEOUT`, the screen polls device status and accepts recovery only when all of these are true:

1. `online === true`.
2. `lastSeenAt` is a valid timestamp.
3. `lastSeenAt` is at or after the reconnect attempt start time.

This distinguishes a fresh post-handoff heartbeat from stale cached online state. The existing successful BluFi-report path continues to use the normal online poll. Explicit `WIFI_CONNECT_FAILED`, pre-delivery GATT failures, invalid credentials, offline status, missing timestamps, and stale timestamps keep their current failure behavior.

## Boundaries

- No BLE UUID, frame, payload, timeout, firmware, backend endpoint, router, or phone Wi-Fi setting changes.
- Wi-Fi credentials remain transient and are never logged, persisted, or placed in navigation params.
- The recovery applies only to `ble_reconnect`, never first-pair or zero-code claim flows.

## Testing

- Add a screen regression proving a lost BluFi report is recovered by a fresh online heartbeat.
- Add negative cases for stale and missing `lastSeenAt` values.
- Preserve explicit wrong-password failure behavior.
- Run focused pairing tests, full required mobile gates, build/install Android, and repeat the physical Update Wi-Fi flow against the attached robot.

## Documentation

Update the device-pairing state machine so encrypted BluFi timeout can enter backend confirmation only when a fresh post-handoff heartbeat proves the reconnect.
