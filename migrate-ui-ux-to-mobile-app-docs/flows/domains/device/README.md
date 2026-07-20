<!-- HAND-CURATED. -->
# Device Domain Flow

**Owner lane:** D  
**States:** 20 (15 happy, 5 edge)

## Happy path — Robot pairing

The user adds a new robot from the Device home screen. They progress through the full pairing sequence:

`dv_overview` → `dv_pair_add` → `dv_pair_intro` → `dv_pair_search` → `dv_pair_found` → `dv_pair_code` → `dv_pair_wifi` → `dv_pair_wifi_pw` → `dv_pair_connecting` → `dv_pair_success` → `dv_pair_rename` → `dv_pair_first_lesson`

On success the robot is named, bonded to the child's profile, and the user lands on `dv_pair_first_lesson` where they can immediately send the first lesson. This state is classified **happy** (exemption: terminal success node of the pairing funnel).

## Happy path — Active robot

Once paired, the user reaches `dv_home` as the robot's dashboard. From there:

- `dv_session` — monitors a live lesson in progress.
- `dv_lcd` → `dv_lcd_turn` — browses and previews LCD face animations.

## Edge states

| State | Templates | Trigger |
|---|---|---|
| `dv_pair_connecting` | timeout | Pairing handshake takes too long; user shown spinner with cancel option. |
| `dv_pair_failed` | error, retry | BLE pairing rejected, display code invalid, or Wi-Fi auth failed; user can retry scan, retry password, restart, or abort. |
| `dv_pair_offline` | error, retry | Robot powered on but not reachable over network; user prompted to check Wi-Fi. |
| `dv_lost` | timeout | "Find my Robot" ping times out; user advised to check power/proximity. |
| `dv_firmware` | timeout | OTA update stalls; user warned not to power off robot. |

## Notes

- `dv_pair_connecting` sits inside the happy-path sequence but carries a `timeout` edge because a stalled BLE handshake is operationally distinct from a confirmed success or a hard failure.
- `dv_firmware` is reachable both from `dv_home` and from `dv_pair_success` (post-pair update prompt).
