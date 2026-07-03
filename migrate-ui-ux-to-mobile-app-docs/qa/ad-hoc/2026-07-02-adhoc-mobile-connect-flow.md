# Mobile Connect Flow Recovery Evidence

Date: 2026-07-02

Task: `adhoc-2026-07-02-mobile-connect-flow`

Scope:
- Mobile-only pairing recovery.
- No backend, firmware, BLE UUID, BLE schema, route, or API contract changes.

Acceptance evidence:

| AC | Evidence | Result |
| --- | --- | --- |
| PairFailed "Scan QR or enter code" preserves existing device/serial/attempt/BLE context | `tests/features/device/pair-failed-screen.test.tsx` case `"Scan QR or enter code" carries recovery context into QR/code fallback` | PASS |
| Missing params still navigate safely with undefined context | Existing `tests/features/device/pair-failed-screen.test.tsx` case `"Scan QR or enter code" routes to PairQrScanScreen` | PASS |
| Adjacent QR/code/Wi-Fi/connecting flow consumes preserved context | Targeted pairing suite below | PASS |
| PairOffline "Update Wi-Fi" is actionable and preserves reconnect context | `tests/features/device/pair-static-screens.test.tsx` case `"Update Wi-Fi" is an accessible recovery action that re-enters reconnect search` | PASS |
| Failed reconnect/offline recovery keeps reconnect search semantics | `tests/features/device/pair-failed-screen.test.tsx` cases `"Robot is too far" keeps reconnect mode for offline Wi-Fi recovery` and `"Try again" keeps reconnect mode for a reconnect failure` | PASS |
| Failed reconnect/offline prep/back actions re-enter reconnect search, not the offline shell | `tests/features/device/pair-failed-screen.test.tsx` cases `"Robot looks asleep" keeps reconnect search for reconnect failures`, `"Battery is low" keeps reconnect search for offline Wi-Fi failures`, and `"header back keeps reconnect search for reconnect failures"` plus circular-navigation gate | PASS |
| Code mismatch in reconnect/offline context does not restart as new-pairing search | `tests/features/device/pair-code-screen.test.tsx` case `keeps reconnect mode for an offline/reconnect mismatch` | PASS |
| QR scanner back without found-device context does not land on fake found screen | `tests/features/device/pair-qr-scan-screen.test.tsx` case `goes back to PairSearchScreen when no found Robot context exists` | PASS |
| QR scanner and Wi-Fi back in reconnect/offline context return to reconnect search | `tests/features/device/pair-qr-scan-screen.test.tsx` case `goes back to reconnect search for reconnect params even when device context exists`; `tests/features/device/pair-wifi-flow.test.tsx` case `back from reconnect Wi-Fi returns to reconnect search, not the new-pairing found screen` | PASS |
| Mobile simulator opens add/reconnect connect routes without blank/dead-end screen | `e2e/device-pairing-flow.test.ts` on iPhone 17 Pro simulator; accepts valid simulator BLE-unavailable failure state and visible recovery action | PASS |

Verification:

| Gate | Command | Exit | Key output | Result |
| --- | --- | ---: | --- | --- |
| Red check | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx --runInBand` | 1 | New context test failed: received `PairQrScanScreen` without params | PASS |
| Focused recovery test | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx --runInBand` | 0 | `Test Suites: 1 passed, 1 total`; `Tests: 75 passed, 75 total` | PASS |
| Pairing regression slice | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx tests/features/device/pair-qr-scan-screen.test.tsx tests/features/device/pair-code-screen.test.tsx tests/features/device/pair-wifi-flow.test.tsx tests/features/device/pair-connecting-flow.test.tsx tests/features/device/pair-found-flag-off.test.tsx tests/features/device/pair-found-zero-code.test.tsx tests/features/device/pair-search-helpers.test.tsx --runInBand` | 0 | `Test Suites: 8 passed, 8 total`; `Tests: 243 passed, 243 total` | PASS |
| Red check | `npm test -- --runTestsByPath tests/features/device/pair-static-screens.test.tsx --runInBand` | 1 | New Update Wi-Fi action test failed: unable to find accessibility label `Update Wi-Fi for offline Robot` | PASS |
| Focused offline static test | `npm test -- --runTestsByPath tests/features/device/pair-static-screens.test.tsx --runInBand` | 0 | `Test Suites: 1 passed, 1 total`; `Tests: 39 passed, 39 total` | PASS |
| Adjacent offline reconnect slice | `npm test -- --runTestsByPath tests/features/device/pair-static-screens.test.tsx tests/ui-validation/fallback-offline.test.tsx tests/features/device/pair-search-helpers.test.tsx tests/features/device/pair-wifi-flow.test.tsx --runInBand` | 0 | `Test Suites: 4 passed, 4 total`; `Tests: 113 passed, 113 total` | PASS |
| Red check | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx tests/features/device/pair-code-screen.test.tsx tests/features/device/pair-qr-scan-screen.test.tsx --runInBand` | 1 | New reconnect retry/code mismatch/QR back tests failed with bare `PairSearchScreen` or no-context `PairFoundScreen` | PASS |
| Focused recovery-edge test | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx tests/features/device/pair-code-screen.test.tsx tests/features/device/pair-qr-scan-screen.test.tsx --runInBand` | 0 | `Test Suites: 3 passed, 3 total`; `Tests: 143 passed, 143 total` | PASS |
| Red check | `npm test -- --runTestsByPath tests/features/device/pair-wifi-flow.test.tsx tests/features/device/pair-qr-scan-screen.test.tsx --runInBand` | 1 | New QR/Wi-Fi reconnect back tests failed by routing to `PairFoundScreen` instead of reconnect search | PASS |
| Focused QR/Wi-Fi back test | `npm test -- --runTestsByPath tests/features/device/pair-wifi-flow.test.tsx tests/features/device/pair-qr-scan-screen.test.tsx --runInBand` | 0 | `Test Suites: 2 passed, 2 total`; `Tests: 60 passed, 60 total` | PASS |
| Circular navigation regression | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx tests/navigation/no-circular-forward-navigation.test.ts --runInBand` | 0 | `Test Suites: 2 passed, 2 total`; `Tests: 83 passed, 83 total` | PASS |
| Adjacent pairing flow slice | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx tests/features/device/pair-failed-recovery.test.tsx tests/features/device/pair-code-screen.test.tsx tests/features/device/pair-qr-scan-screen.test.tsx tests/features/device/pair-wifi-flow.test.tsx tests/features/device/pair-connecting-flow.test.tsx tests/features/device/pair-search-helpers.test.tsx tests/features/device/pair-search-multi-device.test.tsx tests/features/device/pair-found-flag-off.test.tsx tests/features/device/pair-found-zero-code.test.tsx tests/features/device/pair-static-screens.test.tsx tests/ui-validation/fallback-offline.test.tsx --runInBand` | 0 | `Test Suites: 12 passed, 12 total`; `Tests: 325 passed, 325 total` | PASS |
| Adjacent pairing flow slice, final | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx tests/features/device/pair-failed-recovery.test.tsx tests/features/device/pair-code-screen.test.tsx tests/features/device/pair-qr-scan-screen.test.tsx tests/features/device/pair-wifi-flow.test.tsx tests/features/device/pair-connecting-flow.test.tsx tests/features/device/pair-search-helpers.test.tsx tests/features/device/pair-search-multi-device.test.tsx tests/features/device/pair-found-flag-off.test.tsx tests/features/device/pair-found-zero-code.test.tsx tests/features/device/pair-static-screens.test.tsx tests/ui-validation/fallback-offline.test.tsx --runInBand` | 0 | `Test Suites: 12 passed, 12 total`; `Tests: 330 passed, 330 total` | PASS |
| TypeScript | `npx tsc --noEmit` | 0 | no output | PASS |
| ESLint | `npm run lint` | 0 | `eslint src/ tests/ --max-warnings=0` | PASS |
| Full unit suite | `npm test -- --runInBand` | 0 | `Test Suites: 1 skipped, 192 passed, 192 of 193 total`; `Tests: 19 skipped, 2067 passed, 2086 total` | PASS |
| Flow validator | `npm run flows:validate` | 0 | `[validate] generated-sha(15 files): OK`; `[validate] ALL CHECKS PASSED` | PASS |
| Sequence validator | `npm run sequences:fast` | 0 | `[validate-sequences] AC-4-schema(102 files): OK`; `[validate-mermaid] OK — 102 files parsed as sequence diagrams` | PASS |
| ERD validator | `npm run erd:validate` | 0 | `[validate-erd] dbml-syntax: OK (109 files)`; `[validate-erd] ALL CHECKS PASSED` | PASS |
| Use-case checker | `npm run usecases:check` | 0 | `PASS AC1 count=154`; `check-backend-sentinel: checked=154, failures=0` | PASS |
| Token parity | `npm run check:token-parity` | 0 | `Token parity OK — 7 token files verified.` | PASS |
| Route coverage | `npm run check:route-coverage` | 0 | `check-route-coverage: OK — 133 screen files, 125 routes registered` | PASS |
| Screen prop types | `npm run check:screen-prop-types` | 0 | `check-screen-prop-types: OK — 133 screen files checked` | PASS |
| Integration | `npm run test:integration` | 0 | `Test Suites: 1 passed, 1 total`; `Tests: 3 passed, 3 total` | PASS |
| E2E file lint | `npx eslint e2e/device-pairing-flow.test.ts --max-warnings=0` | 0 | no output | PASS |
| Detox test discovery | `npx jest --config e2e/jest.config.js --listTests` | 0 | includes `e2e/device-pairing-flow.test.ts` | PASS |
| Detox iOS build | `npm run detox:build:ios` | 0 | `** BUILD SUCCEEDED **` | PASS |
| Targeted Detox attempt, no Metro | `npm run detox:test:ios -- e2e/device-pairing-flow.test.ts` | 1 | app redboxed `No script URL provided`; screenshot `/tmp/tbot-detox/device-pairing-failure.png`; root cause: debug iOS build requires Metro and `detox:test:ios` does not start it | BLOCKED |
| Targeted Detox attempt, Metro bound to 127.0.0.1 | `npm run start -- --host 127.0.0.1` then `npm run detox:test:ios -- e2e/device-pairing-flow.test.ts` | 1 | app requested `http://localhost:8081/...` while Metro listened on `127.0.0.1:8081`; screenshot `/tmp/tbot-detox/device-pairing-bundle-still-99.png` | BLOCKED |
| Targeted Detox, iOS simulator | `npm run start` then `npm run detox:test:ios -- e2e/device-pairing-flow.test.ts` | 0 | `Test Suites: 1 passed, 1 total`; `Tests: 1 passed, 1 total`; `Time: 123.369 s` | PASS |
| Physical provisioning smoke | `npm run smoke:provisioning:both -- --json` | 2 | firmware and USB Robot ready at `/dev/cu.usbmodem1101`; blocked by no online physical iPhone/iPad, no authorized Android device, and unset Wi-Fi credentials | BLOCKED |
| PairSearch multi-device fixture cleanup | `npm test -- --runTestsByPath tests/features/device/pair-search-multi-device.test.tsx --runInBand` | 0 | `Test Suites: 1 passed, 1 total`; `Tests: 10 passed, 10 total` | PASS |
| Forbidden-pattern scan after fixture cleanup | `rg -n "unknown as|as any|@ts-ignore|@ts-expect-error|TODO|FIXME|HACK" src/features/device/pairing tests/features/device e2e/device-pairing-flow.test.ts` | 1 | no matches; `rg` exit 1 means pattern not found | PASS |
| Adjacent pairing flow slice after fixture cleanup | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx tests/features/device/pair-failed-recovery.test.tsx tests/features/device/pair-code-screen.test.tsx tests/features/device/pair-qr-scan-screen.test.tsx tests/features/device/pair-wifi-flow.test.tsx tests/features/device/pair-connecting-flow.test.tsx tests/features/device/pair-search-helpers.test.tsx tests/features/device/pair-search-multi-device.test.tsx tests/features/device/pair-found-flag-off.test.tsx tests/features/device/pair-found-zero-code.test.tsx tests/features/device/pair-static-screens.test.tsx tests/features/device/pair-rename-screen.test.tsx tests/features/device/claim-flow.test.ts --runInBand` | 0 | `Test Suites: 13 passed, 13 total`; `Tests: 383 passed, 383 total` | PASS |
| TypeScript after fixture cleanup | `npx tsc --noEmit` | 0 | no output | PASS |
| ESLint after fixture cleanup | `npm run lint` | 0 | `eslint src/ tests/ --max-warnings=0` | PASS |
| Physical provisioning smoke retry after fixture cleanup | `npm run smoke:provisioning:both -- --json` | 2 | firmware ready, Robot candidate `/dev/cu.usbmodem1101`, native links ready; blocked by no online physical iPhone/iPad, no authorized Android device, and unset Wi-Fi credentials | BLOCKED |
| Red check for late-claim observability | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx --runInBand` | 1 | new assertion failed: expected `captureError(error)`, received 0 calls | PASS |
| Focused late-claim observability test | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx --runInBand` | 0 | `Test Suites: 1 passed, 1 total`; `Tests: 80 passed, 80 total` | PASS |
| Targeted ESLint after late-claim observability | `npx eslint src/features/device/pairing/screens/PairFailedScreen.tsx tests/features/device/pair-failed-screen.test.tsx --max-warnings=0` | 0 | no output | PASS |
| TypeScript after late-claim observability | `npx tsc --noEmit` | 0 | no output | PASS |
| Full ESLint after late-claim observability | `npm run lint` | 0 | `eslint src/ tests/ --max-warnings=0` | PASS |
| Adjacent pairing flow slice after late-claim observability | `npm test -- --runTestsByPath tests/features/device/pair-failed-screen.test.tsx tests/features/device/pair-failed-recovery.test.tsx tests/features/device/pair-code-screen.test.tsx tests/features/device/pair-qr-scan-screen.test.tsx tests/features/device/pair-wifi-flow.test.tsx tests/features/device/pair-connecting-flow.test.tsx tests/features/device/pair-search-helpers.test.tsx tests/features/device/pair-search-multi-device.test.tsx tests/features/device/pair-found-flag-off.test.tsx tests/features/device/pair-found-zero-code.test.tsx tests/features/device/pair-static-screens.test.tsx tests/features/device/pair-rename-screen.test.tsx tests/features/device/claim-flow.test.ts --runInBand` | 0 | `Test Suites: 13 passed, 13 total`; `Tests: 383 passed, 383 total` | PASS |
| Physical provisioning smoke after late-claim observability | `npm run smoke:provisioning:both -- --json` | 2 | firmware ready, Robot candidate `/dev/cu.usbmodem1101`, native links ready; blocked by no online physical iPhone/iPad, no authorized Android device, and unset Wi-Fi credentials | BLOCKED |

Critique-before-close:
- Root cause vs symptom: recovery fallback dropped route context, so QR/code could not continue the same pairing attempt.
- Code vs docs: aligns with UC-DP11 requirement to preserve in-flight state where safe.
- Test quality: regression test fails on the old behavior and passes after the handler carries params.
- Drift status: no route/API/state-machine/generated-doc changes.
- Principal-engineer review: narrow mobile-only fix; simulator route proof now exists, but physical Robot connect remains blocked by missing mobile device/Wi-Fi credentials.
- Reproducibility: commands above were run from `tbot-mobile/`.
- Offline Wi-Fi recovery addendum: UC-DP12's `Update Wi-Fi` row now re-enters reconnect scan instead of implying a direct Wi-Fi jump without BLE/device context.
- Reconnect retry addendum: failure recovery, prep/back actions, code mismatch, QR back navigation, and Wi-Fi back navigation now avoid dropping a reconnect/offline recovery into the new-Robot path.
- Navigation-cycle addendum: reconnect/offline failure prep/back actions route to `PairSearchScreen` with `{ reconnectMode: true }`; routing them to `PairOfflineScreen` created a forward-navigation cycle and was rejected by `tests/navigation/no-circular-forward-navigation.test.ts`.
- Detox addendum: debug iOS Detox needs Metro running separately. Use `npm run start` with the default `localhost` bind; `--host 127.0.0.1` does not match the app's script URL.
- Fixture cleanup addendum: `tests/features/device/pair-search-multi-device.test.tsx` now uses a typed `DeviceStatus` fixture helper instead of `unknown as` casts; behavior unchanged.
- Late-claim observability addendum: late claim-status recovery failures now call `captureError(error)` while keeping the failure recovery screen usable and stationary.
