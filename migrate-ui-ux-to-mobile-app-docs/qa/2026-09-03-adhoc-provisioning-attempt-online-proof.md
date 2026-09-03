# Provisioning Attempt Online-Proof QA

## Automated evidence

- Mobile focused provisioning, recovery, API, navigation, and accessibility suites: passed.
- TypeScript strict typecheck: passed.
- ESLint on changed mobile files: passed.
- No credentials, tokens, SSIDs, or device identifiers are recorded in this evidence.

## Contract

- New-device pairing polls the parent-authorized provisioning attempt status.
- Success requires `device_authenticated` or `completed` plus a non-null heartbeat at or after the BLE handoff boundary.
- Already-owned reconnect continues to use the household device-status endpoint.
- Ownership remains assigned only by `/devices/provision/complete`.

## Physical E2E

Pending hardware rerun after firmware, backend, and mobile branches are merged into their respective `main` branches.
