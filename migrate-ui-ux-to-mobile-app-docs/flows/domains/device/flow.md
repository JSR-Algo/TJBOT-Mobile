<!-- HAND-CURATED. -->
# Device Pairing Flow

## Happy Path

`dv_pair_intro` → `dv_pair_search` → `dv_pair_found` → `dv_pair_code` → `dv_pair_wifi` → `dv_pair_wifi_pw` → `dv_pair_connecting` → `dv_pair_success` → `dv_pair_rename` → `dv_pair_first_lesson` → `dv_home`.

## PROVISIONING Timeout (`dv_pair_connecting`)

After the user submits wifi credentials, the app enters `dv_pair_connecting` while the robot attempts to join the wifi network and reach the cloud. Two explicit timeout edges exist:

- `dv_pair_wifi_pw` → `dv_pair_failed`: wifi auth fail detected before robot even starts connecting (E-PROV-002).
- `dv_pair_connecting` → `dv_pair_failed`: BLE timeout (30s, E-PROV-001) or wifi join failed (E-PROV-003).

From `dv_pair_failed` the user can retry from scan, re-enter the Wi-Fi password with the selected SSID preserved, restart the full pairing checklist, or give up.

## CLAIM_PENDING

After `dv_pair_connecting` succeeds (robot acks wifi creds), the server issues a claim via `POST /v1/devices/claim`. The app polls for up to 60s. Timeout or server rejection (E-PROV-004, E-PROV-005) → `dv_pair_failed`.

## Offline During Pairing (`dv_pair_offline`)

If the phone loses network before the claim completes, the flow pauses at `dv_pair_offline`. On network restore, it returns to `dv_pair_search`. BLE writes are suspended during offline.

## Edge Cases

| State | Scenario | Exit |
|---|---|---|
| `dv_pair_failed` | BLE timeout / wifi auth fail / server claim reject / invalid display code | → `dv_pair_intro` (retry full), `dv_pair_search` (retry scan), or `dv_pair_wifi_pw` (retry password) |
| `dv_pair_offline` | Phone offline pre-claim | → `dv_pair_search` on restore; cancel → exit |
| `dv_pair_connecting` | 30s BLE provisioning timeout | → `dv_pair_failed` (E-PROV-001) |
| `dv_pair_wifi_pw` | Wifi auth fail (wrong password) | → `dv_pair_failed` (E-PROV-002) |
| `dv_lost` | Robot goes offline post-pair | → `dv_home` on reconnect |
| `dv_firmware` | Firmware update in progress | → `dv_home` when complete |
