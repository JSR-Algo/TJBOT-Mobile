<!-- HAND-CURATED. -->
# Device Pairing Flow

Runtime source of truth: the pairing screen modules under `src/features/device/pairing/` plus route metadata in `src/features/device/navigation.ts`. There is no separate executable DevicePairing XState machine; route-state IDs are metadata for documentation and validator alignment only.

## Happy Path

`dv_pair_intro` → `dv_pair_search` → `dv_pair_found` → `dv_pair_code` → `dv_pair_wifi` → `dv_pair_wifi_pw` → `dv_pair_connecting` → `dv_pair_success` → `dv_pair_rename` → `dv_pair_first_lesson` → `dv_home`.

## Scan and Provisioning Failures

`dv_pair_search` first checks phone connectivity and BLE readiness, then scans nearby advertising robots without a UUID filter so Android name-only advertisements remain visible. Scan callback errors route to `dv_pair_failed` with `BLE_SCAN_ERROR` or `BLE_SCAN_THROTTLED`; an empty successful scan routes to `BLE_SCAN_TIMEOUT`.

After the user submits Wi-Fi credentials, the app enters `dv_pair_connecting` while the robot attempts to join Wi-Fi and reach the cloud. Missing transient password handoff returns to `dv_pair_wifi_pw` with `WIFI_PASSWORD_EXPIRED`; malformed route context routes to `dv_pair_failed` with `PAIRING_CONTEXT_MISSING`.

Provisioning status is polled until `device_authenticated`/`completed`, `failed`/`expired`, or the shared claim-confirmation deadline elapses. Failure codes stay in the current pairing taxonomy (`PROVISIONING_FAILED`, `PROVISIONING_TIMEOUT`, `WIFI_AUTH_FAILED`, `DEVICE_AUTH_NOT_VERIFIED`, or the backend failure code), not the old `E-PROV-*` labels.

From `dv_pair_failed` the user can double-click BOOT, move within 1–2 m, verify Bluetooth permission, retry from BLE scan, correct the Wi-Fi password, or give up. There is no backend or setup-hotspot credential fallback.

## Claim Confirmation

After provisioning succeeds, zero-code claim flows poll claim status until `CLAIM_CONFIRMED`/`CLAIMED`, a backend failure code, or `CLAIM_CONFIRM_TIMEOUT`. The deadline is shared by both claim poll paths through `CLAIM_CONFIRM_TIMEOUT_MS`.

Offline BLE credential handoff remains provisional. It does not route to success until the backend confirms the robot checked in; if the robot never appears online, the flow routes to `OFFLINE_BACKEND_CONFIRMATION_TIMEOUT`.

## Edge Cases

| State | Scenario | Exit |
|---|---|---|
| `dv_pair_failed` | BLE scan/provisioning/backend claim failure | Retry BLE scan, correct password, open Bluetooth settings, or give up |
| `dv_pair_search` | Phone offline, BLE permission denied, BLE unavailable, scan error/throttle, or no robot nearby | → `dv_pair_failed` with the matching pairing error code |
| `dv_pair_connecting` | Provisioning/claim confirmation timeout or backend/device rejection | → `dv_pair_failed` with the backend or pairing error code |
| `dv_pair_wifi_pw` | Transient Wi-Fi password handoff expired before connect | Re-enter password with `WIFI_PASSWORD_EXPIRED` |
| `dv_lost` | Robot goes offline post-pair | → `dv_home` on reconnect |
| `dv_firmware` | Firmware update in progress | → `dv_home` when complete |
