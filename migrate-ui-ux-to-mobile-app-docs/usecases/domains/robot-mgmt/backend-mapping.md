# Backend Mapping — `robot-mgmt`

> Every cell is `BACKEND_NOT_DESIGNED` (D3 sentinel). The prototype's `robot-mgmt.api.js` exports all throw `not implemented`; no `decisions/NNNN-backend-robot-mgmt.md` ADR exists yet. Domain ADR Pointer is `—` per HR-6 state-based rule.

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-RM01 | `leaderboard.api.ts → getLeaderboard, updateLeaderboardPreference` | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | authenticated owned-row read and per-device preference audit | `decisions/0001-backend-progress.md` |
| UC-RM02 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-RM03 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-RM04 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-RM05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-RM06 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-RM07 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-RM08 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-RM09 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-RM10 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-RM11 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-RM12 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- UC-RM01 is backed only by the authoritative leaderboard owned-row and preference exports. It intentionally does not consume the prototype robot-health exports or display their static values.
- UC-RM02 deliberately consumes only the existing household-device projection. Although the normalized device type contains defaulted telemetry fields, the screen renders only name, optional serial number, and nullable online/offline state.
- UC-RM03, UC-RM05, UC-RM06, UC-RM08, and UC-RM09 remain production-hidden with `backend-contract-unavailable`; their prototype values/actions are not mounted or deep-linked.
- Remaining cells stay sentinel because `robot-mgmt.api.js` exports throw `not implemented` (`getRobotStatus`, `getBattery`, `getStorage`, `runMicTest`, `runSpeakerTest`, `factoryReset`, `getSupportInfo`).
- Once a `decisions/NNNN-backend-robot-mgmt.md` ADR is created, candidate cell promotions:
  - UC-RM03 (Battery): `robot-mgmt.api.js → getBattery` (Endpoint).
  - UC-RM05 (Installed Courses): `robot-mgmt.api.js → getStorage` (Endpoint); references `Course` (Entity, per `docs/erd/README.md`).
  - UC-RM06 (Update Software): `device.api.js → runFirmwareUpdate` (Endpoint, shared with UC-DM04).
  - UC-RM08 (Mic Test): `robot-mgmt.api.js → runMicTest` (Endpoint).
  - UC-RM09 (Speaker Test): `robot-mgmt.api.js → runSpeakerTest` (Endpoint).
  - UC-RM10 (Factory Reset): `robot-mgmt.api.js → factoryReset` (Endpoint, destructive); emits `robot.reset.requested` event.
  - UC-RM12 (Support): `robot-mgmt.api.js → getSupportInfo` (Endpoint).
