# Backend Mapping — `device-pairing`

> Every cell is `BACKEND_NOT_DESIGNED` (D3 sentinel). The prototype's `device.api.js` exports throw `not implemented`; no `decisions/NNNN-backend-device-pairing.md` ADR exists yet. Domain ADR Pointer is `—` per HR-6 state-based rule.
>
> KD8: pairing radio transport (BLE / Wi-Fi probe / etc.) is NOT CONFIRMED IN SOURCE — UC-DP04 in particular is sentinel until that decision lands.

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-DP01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP02 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP03 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP04 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP06 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP07 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP08 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP09 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP10 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP11 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP12 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP13 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-DP14 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- Cells stay sentinel because (a) `device.api.js` exports all throw `not implemented` (`pairDevice`, `getDeviceStatus`, `setDeviceWifi`, `unpairDevice`, etc.), and (b) no domain ADR exists.
- Once the pairing radio transport decision lands (KD8) and a `decisions/NNNN-backend-device-pairing.md` ADR is created, candidate cell promotions:
  - UC-DP04 (Scan): `device.api.js → pairDevice` (Endpoint), pairing-discovery store action TBD (Service), `Rotjtjbot` (Entity, per `docs/erd/README.md`).
  - UC-DP09 (Connect): `device.api.js → setDeviceWifi` (Endpoint), `device.store.js → bindRotjtjbot` action TBD (Service), `Rotjtjbot` (Entity).
  - UC-DP10 (Success): emits `rotjtjbot.paired` event TBD (Events).
  - UC-DP13 (Rename): `device.api.js → ` rename action TBD; would update `Rotjtjbot.buddy` (Entity).
- KD8 holds UC-DP04 sentinel until the radio transport is confirmed.
