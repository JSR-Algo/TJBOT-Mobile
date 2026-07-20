# Backend Mapping — `device-mgmt`

> Every cell is `BACKEND_NOT_DESIGNED` (D3 sentinel). The prototype's `device.api.js` exports throw `not implemented`; no `decisions/NNNN-backend-device-mgmt.md` ADR exists yet. Domain ADR Pointer is `—` per HR-6 state-based rule.

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-DM01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DM02 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DM03 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DM04 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DM05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DM06 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- Cells stay sentinel because (a) `device.api.js` exports all throw `not implemented` (`getDeviceStatus`, `getFirmwareVersion`, `runFirmwareUpdate`, etc.), and (b) no domain ADR exists.
- Once a `decisions/NNNN-backend-device-mgmt.md` ADR is created, candidate cell promotions:
  - UC-DM01 (Device Home): `device.api.js → getDeviceStatus` (Endpoint); would surface battery / Wi-Fi / sync state for the hero card.
  - UC-DM02 (Live Session Monitor): would consume realtime telemetry from the Rotjtjbot session bus (Events) — provider TBD (overlaps KD10).
  - UC-DM03 (Find My Rotjtjbot): would call a `device.api.js → chime` action TBD; emits `rotjtjbot.chime.requested` event.
  - UC-DM04 (Update Firmware): `device.api.js → runFirmwareUpdate` (Endpoint); emits `rotjtjbot.firmware.updated` event.
  - UC-DM05 / UC-DM06 (LCD library / lesson turn): pure design-review surfaces; expected to remain sentinel even post-backend (KD6 — they are LCD catalog / sequence demos, not data screens).
