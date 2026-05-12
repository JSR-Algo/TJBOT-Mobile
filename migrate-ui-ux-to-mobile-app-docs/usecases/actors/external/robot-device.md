# External Actor — Robot Device

**Type:** External system.

**Source evidence:** pairing scan, firmware OTA, course sync, LCD turns. Files: `src/features/device/Pair*Page.jsx`, `src/features/robot-mgmt/*Page.jsx`. APIs: `src/services/api/device.api.js`, `src/services/api/robot-mgmt.api.js`.

**Wire protocol:** transport (BLE vs Wi-Fi probe vs proprietary) **NOT CONFIRMED IN SOURCE** (KD8).

**Used by domains:** `course-library` (send course), `purchase` (activate), `device-pairing` (pair / OTA), `device-mgmt`, `robot-mgmt` (diagnostics), `lesson-session` (indirect via voice routing).

## Delegation edges

See `reference/cross-domain-edges.json` for `kind: "delegate"` entries with target `ACTOR:Robot`.
