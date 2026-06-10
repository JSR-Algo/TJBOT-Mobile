# Backend Mapping — `device-pairing`

> Table cells stay sentinel until a canonical backend ADR exists for this docs workspace. The live TBOT connection work is recorded in Notes so the validator contract remains intact while the mobile implementation consumes the confirmed claim API.

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

- UC-DP04 uses `startDeviceProvisioning` in `src/services/api/device.api.ts` to create the discovered Robot context, but this docs table remains sentinel until a backend ADR promotes the row.
- UC-DP05 is now the default ownership path in code: `PairFoundScreen` calls `useZeroCodeClaimFlow`, which consumes `requestClaim` and `getClaimStatus` from `src/services/api/claim.api.ts`. It does not require the parent to type or scan a code unless the claim flow fails.
- UC-DP05 requires a BLE candidate from UC-DP04 because the fresh claim bootstrap token is delivered over BluFi (`sendClaimBootstrapTokenViaBle`). `/claim/available-devices` can label or observe claimable devices, but it must not create a backend-only `PairFoundScreen` candidate because the app would have no BLE handle for token delivery.
- UC-DP06 remains fallback-only. It must not expose raw IPs, ports, OTA URLs, WebSocket URLs, MAC addresses, or tokens to the parent.
- UC-DP09 through UC-DP13 still depend on the existing provisioning-complete flow for Wi-Fi and local pairing cache behavior.
