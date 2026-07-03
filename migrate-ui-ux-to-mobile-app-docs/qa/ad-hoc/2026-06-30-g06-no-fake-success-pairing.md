# G06 No Fake Success Pairing Evidence

Date: 2026-06-30

Scope:
- `PairConnectingScreen` no longer treats `ble_offline` credential handoff as final success.
- `PairFailedScreen` has distinct copy for offline backend confirmation timeout.
- Tests lock that firmware `STA_CONN_SUCCESS` / `wifi_credentials_sent` is provisional-only.

Acceptance evidence:

| AC | Evidence | Result |
| --- | --- | --- |
| `ble_offline` cannot navigate to `PairSuccessScreen` without backend online confirmation | `tests/features/device/pair-connecting-flow.test.tsx` case `[no fake success] credential-only handoff without backend online confirmation routes to PairFailed, not PairSuccess` | PASS |
| Slow/offline-first network can still eventually succeed | `tests/features/device/pair-connecting-flow.test.tsx` case `[slow offline-first success] backend online confirmation is required before PairSuccess` | PASS |
| Failure has distinct parent-facing copy | `tests/features/device/pair-failed-screen.test.tsx` includes `OFFLINE_BACKEND_CONFIRMATION_TIMEOUT` and uniqueness count | PASS |
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
