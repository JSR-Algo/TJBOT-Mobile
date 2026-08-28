# Android BluFi Wi-Fi Scan Discovery Timeout Design

## Problem

On the physical Android device, the app finds `TBOT-14C19FD1AC20` and opens the
GATT connection successfully. Android completes service discovery at about
10.4 seconds, just after the app's shared 10-second GATT-operation timeout. The
app cancels the connection before it can subscribe to BluFi notifications and
send `GET_WIFI_LIST`, then shows the manual-network fallback.

## Scope

Change only the timeout applied to BLE service discovery. Keep connection,
characteristic write, security negotiation, Wi-Fi-list response, and Wi-Fi join
timeouts unchanged. Do not change BluFi frames, retry count, credentials, or
firmware behavior.

## Design

Add a dedicated 15-second service-discovery timeout and use it for
`discoverAllServicesAndCharacteristics()` in both Wi-Fi-list scanning and local
Wi-Fi provisioning. The existing 10-second GATT-operation timeout remains the
default for writes and other bounded operations.

Fifteen seconds covers the measured Android completion time while preserving a
finite failure bound. Existing retry behavior remains responsible for a truly
stuck discovery operation.

## Test Seam

Test through the exported `scanRobotWifiNetworks()` interface. A simulated
service discovery that resolves after 10.5 seconds must continue to subscribe,
write the scan request, and return the robot-provided SSID list without opening
a second connection. Existing tests continue to prove that permanently stuck
discovery retries and eventually returns `BLE_WIFI_SCAN_FAILED`.

## Physical Verification

Build and install the current Android app, open
`TJBot://device/pair-intro`, select the discovered robot, and verify that the
robot-scanned Wi-Fi list appears. Logs must show GATT connection, completed
service discovery, notification setup, scan request, and a non-empty scan
result without containing Wi-Fi credentials.

## Non-Goals

- No firmware flash or firmware source change.
- No change to the manual SSID fallback.
- No logging of SSIDs, passwords, pairing codes, or bootstrap tokens.
- No unrelated BLE refactor.
