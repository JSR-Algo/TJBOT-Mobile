# G06 No Fake Success Pairing Evidence

Date: 2026-06-30

Scope:
- Historical evidence originally covered a `ble_offline` credential-only path.
- The 2026-07-13 hardening supersedes that path: a new robot now requires a backend provisioning/claim attempt before encrypted BluFi credential delivery.
- Firmware `STA_CONN_SUCCESS` / `wifi_credentials_sent` remains provisional for first pairing and authoritative only for an already-owned reconnect handoff.

Acceptance evidence:

| AC | Evidence | Result |
| --- | --- | --- |
| New-robot provisioning cannot bypass backend claim context | `tests/features/device/pair-search-helpers.test.tsx` case `fails closed when backend cannot create the claim attempt` | PASS |
| Route types cannot revive synthetic offline provisioning | `tests/navigation/device-pairing-route-params.test.ts` rejects `ble_offline` | PASS |
| `STA_CONN_SUCCESS` remains provisional-only | `tests/ble/service.test.ts` cases for `wifi_credentials_sent` on `STA_CONN_SUCCESS` | PASS |

Verification:

| Gate | Command | Exit | Key output | Result |
| --- | --- | ---: | --- | --- |
| Targeted pairing tests | `npm test -- --runTestsByPath tests/features/device/pair-connecting-flow.test.tsx tests/features/device/pair-failed-screen.test.tsx --runInBand` | 0 | `Test Suites: 2 passed, 2 total`; `Tests: 111 passed, 111 total` | PASS |
| BLE provisional regression | `npm test -- --runTestsByPath tests/ble/service.test.ts --runInBand -t "STA_CONN_SUCCESS"` | 0 | `Test Suites: 1 passed, 1 total`; `Tests: 2 passed, 57 skipped, 59 total` | PASS |
| Recovery/search related tests | `npm test -- --runTestsByPath tests/features/device/pair-failed-recovery.test.tsx tests/features/device/pair-search-helpers.test.tsx --runInBand` | 0 | `Test Suites: 2 passed, 2 total`; `Tests: 37 passed, 37 total` | PASS |
| TypeScript | `npx tsc --noEmit` | 0 | no output | PASS |
| ESLint | `npm run lint` | 0 | `eslint src/ tests/ --max-warnings=0` | PASS |

Residual gates:
- Production deploy, backend live confirmation, and on-device pairing walk remain user-gated by the production goals plan.
- This change does not alter BLE UUIDs, TLV schema, or security framing.
