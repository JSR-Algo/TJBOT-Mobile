# T32: Fix failing unit-test baseline and native mocks

## Status
Registry status: NOT_STARTED | Priority: P0 | Blast radius: HIGH

## Problem
`npm test` currently reports 9 failed suites due to environmental fragility and shallow native mocks:

1. **Broken OpenAPI fixture path** — `scripts/api-contract-sync.mjs` historically resolved a symlink to a host-specific path (`/Users/manhhodinh/Documents/TBOT/docs/site/api/openapi.json`) that does not exist on CI or contributor machines. The symlink is located at `migrate-ui-ux-to-mobile-app-docs/api/openapi.json` and is read directly by `tests/e2e-mobile-script.test.ts` (line 130) and indirectly by the contract-sync script. See `testing-quality.md#improvements` lines 73–74.
2. **Stale route-coverage expectation** — `tests/navigation/route-coverage-script.test.ts:14` expects `130 screen files, 122 routes registered`, while `scripts/check-route-coverage.mjs` now counts 136 screen files and 129 routes, causing the suite to fail. See `testing-quality.md#improvements` line 75.
3. **Mismatched API-config assertion** — `tests/api/config.test.ts:150` asserts `https://tbot-backend-8wmh.onrender.com/v1`, but the test environment or `src/config.ts` fallback can drift, leaving the hosted-fallback test red. See `testing-quality.md#improvements` line 80.
4. **Async race in parent-today-screen** — `tests/features/parent/parent-today-screen.test.tsx:55` asserts that loading text is gone without waiting for the async fetch to settle, producing flaky failures. See `testing-quality.md#improvements` line 81.
5. **Shallow native mocks** — `tests/__mocks__/expo-audio.ts:21` returns `{ granted: false }` by default, which is unrealistic for a voice-first app and blocks permission-gated flow tests. `tests/__mocks__/react-native-ble-plx.ts` is only a 6-line stub with no state, connection, services, or error events, so BLE-heavy paths test against an empty double. See `testing-quality.md#improvements` lines 83–84.

Because T32 is the foundational testing task, no other verification-bearing task should be considered green until this baseline is stable.

## Scope
### In scope
- `scripts/api-contract-sync.mjs` — make the OpenAPI fixture path environment-configurable (`TBOT_BACKEND_OPENAPI_PATH`) and fall back to a checked-in or workspace-resolvable fixture; never rely on a host-specific symlink.
- `tests/navigation/route-coverage-script.test.ts` — update the expected screen/route counts to match `scripts/check-route-coverage.mjs`.
- `tests/api/config.test.ts` — align hosted-fallback assertions with `src/config.ts` `HOSTED_API_ROOT` / `HOSTED_API`.
- `tests/features/parent/parent-today-screen.test.tsx` — make loading-state assertions deterministic (`waitFor` / `findByText`).
- `tests/__mocks__/expo-audio.ts` — default `requestRecordingPermissionsAsync` to `{ granted: true }`; keep it parameterizable per test.
- `tests/__mocks__/react-native-ble-plx.ts` — model `BleManager` state (poweredOn/poweredOff/unauthorized), connection state, services/characteristics, and error events.
- `tests/setup.ts` — ensure native-module mocks are wired consistently with the updated `__mocks__/` files.
- `scripts/verification/T32-fix-failing-test-baseline.js` — verification script that asserts all acceptance criteria and exits 0 only when `npm test` is green.

### Out of scope
- `scripts/check-api-contract-sync.mjs` — replaced/delegated in task T33.
- `.github/workflows/ci.yml` — CI reorganization belongs to T33.
- Refactoring the source-readback Gemini hook tests (`tests/hooks/useGeminiConversation-p0.test.ts`, etc.) — this is testing-debt cleanup but not part of the failing-baseline fix.
- Converting `tests/e2e/` directory naming — belongs to the testing-quality simplification backlog, not the P0 baseline fix.

## Proposed solution
1. **OpenAPI fixture resolution**
   - Keep `TBOT_BACKEND_OPENAPI_PATH` support in `scripts/api-contract-sync.mjs`.
   - Add a checked-in fallback fixture path such as `tests/fixtures/openapi.json` or resolve `../../backend/openapi.json` from the workspace root.
   - When no fixture is found, print a clear error and exit non-zero; do not silently fall back to a non-existent host path.
   - Update `tests/e2e-mobile-script.test.ts` to use the same resolvable fixture path (or a symlink-relative path that is guaranteed to exist).

2. **Route-coverage expectation**
   - Run `node scripts/check-route-coverage.mjs` and copy the reported counts into `tests/navigation/route-coverage-script.test.ts`.
   - Current values: `136 screen files, 129 routes registered`, `129 feature route registrations`, `0 duplicate screen registrations`.

3. **API-config hosted fallback**
   - Read `src/config.ts` lines 16–18 to confirm `HOSTED_API_ROOT` and `HOSTED_API`.
   - Update `tests/api/config.test.ts` so every hosted-fallback assertion matches `https://tbot-backend-8wmh.onrender.com/v1`.

4. **Parent-today-screen determinism**
   - In `tests/features/parent/parent-today-screen.test.tsx`, wrap the loading-text assertion in `waitFor(() => expect(queryByText("Loading today's progress")).toBeNull())` and prefer `findByText` over synchronous `queryByText` after async events.

5. **Native mock defaults**
   - `tests/__mocks__/expo-audio.ts`: change `requestRecordingPermissionsAsync` default to `{ granted: true }`; optionally export a helper to override per test.
   - `tests/__mocks__/react-native-ble-plx.ts`: add a `state` property defaulting to `'PoweredOn'`, a `connectedDevices` map, `connectToDevice`, `discoverAllServicesAndCharacteristics`, `readCharacteristic`, `writeCharacteristicWithResponseForDevice`, and event emitters for `onDeviceDisconnected` / `onStateChange`. Keep the API surface compatible with `react-native-ble-plx`.

6. **Setup wiring**
   - Ensure `tests/setup.ts` does not override the new mock defaults unexpectedly. If it does, align it with the `__mocks__/` files.

7. **Verification script**
   - Create `scripts/verification/T32-fix-failing-test-baseline.js` that performs static and runtime checks for the above and runs `npm test`, exiting 0 only on a fully green baseline.

## Acceptance criteria
1. `scripts/api-contract-sync.mjs` uses a checked-in or environment-configured OpenAPI fixture instead of a broken symlink.
2. `route-coverage-script` test expectation matches the current screen/route count (`136 screen files, 129 routes registered`).
3. `tests/api/config.test.ts` passes with the current hosted fallback URL (`https://tbot-backend-8wmh.onrender.com/v1`).
4. `parent-today-screen` test is deterministic (waits for loading state or mocks network).
5. Native mocks model stateful behavior (BLE manager state, audio permission granted by default).
6. `npm test` exits 0 (zero failed suites), with unit test fixes implemented as part of this task.

## Dependencies
None.

## Exclusions / anti-overlap
- T33 will replace the stub `scripts/check-api-contract-sync.mjs` and split docs-integrity from the mobile-quality CI job. Do not implement CI workflow changes here.
- T01 will canonicalize env schema and EAS alignment. Do not change `eas.json`, `app.json`, or production env key names in this task.
- T04/T05/T07 will consume the improved BLE mock. Ensure the mock API remains compatible with those tasks.

## Verification test plan
- Test file: `scripts/verification/T32-fix-failing-test-baseline.js`
- What it proves: the OpenAPI fixture is resolvable, route-coverage expectations match reality, native mocks have realistic defaults, and the full `npm test` baseline is green.
- How to run it: `node scripts/verification/T32-fix-failing-test-baseline.js`
- Expected state before fix: FAIL
- Expected state after fix: PASS

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Updating mock defaults breaks existing tests that relied on `granted: false` or the empty BLE stub. | Run the full suite after each mock change; add per-test override helpers rather than hard-coding new defaults inside individual tests. |
| The OpenAPI fixture path is different on CI vs. local machines. | Use an environment variable with a workspace-relative checked-in fallback; verify on a clean checkout. |
| `parent-today-screen` flakiness is caused by an unmocked network call rather than a missing `waitFor`. | Add explicit `mockGetParentToday` resolution in the test and confirm no real network calls occur. |
| Running `npm test` inside the verification script is slow. | Keep the script focused; it is acceptable for a fleet-wide baseline gate to take ~30 s. |

## Coordination notes
No coordination required. This task is owned entirely by Mobile QA/Testing.

## Implementation hints
- Read `src/config.ts` lines 16–18 before editing `tests/api/config.test.ts` to confirm the hosted fallback.
- Run `node scripts/check-route-coverage.mjs` before editing the route-coverage test; copy the exact output strings.
- When expanding `tests/__mocks__/react-native-ble-plx.ts`, mirror the real library's `BleManager` API so that T04/T05 can subscribe to `onStateChange` and `onDeviceDisconnected`.
- For `expo-audio`, keep the mock a named export factory so tests can import it and call `.mockResolvedValueOnce({ granted: false })` when explicitly testing denial paths.
