# testing-quality Audit

## Scope

Test coverage, validation script complexity, flaky e2e, mock quality, integration-vs-unit balance, and CI gates for the TJBot-mobile React Native codebase.

## Files reviewed

### Mobile project

- Configuration / runners
  - `package.json` (scripts + jest projects) — lines 1–165
  - `.detoxrc.js`
  - `e2e/jest.config.js`
  - `e2e/init.ts`
  - `tests/setup.ts`
  - `tests/setup-after-env.ts`
- Test suites (representative sample)
  - `tests/ci/mobile-ci-gates.test.ts`
  - `tests/integration/__setup__/global-setup.ts`, `global-teardown.ts`, `mock-server.ts`
  - `tests/integration/auth-isolation.test.ts`
  - `tests/e2e/README.md`
  - `tests/e2e/auth.test.tsx`
  - `tests/e2e/onboarding.test.tsx`
  - `tests/e2e/parent-settings.test.tsx`
  - `tests/state/machines/devicePairing.machine.test.ts`
  - `tests/hooks/useGeminiConversation-p0.test.ts`
  - `tests/hooks/useGeminiConversation-bargein-ordering.test.ts`
  - `tests/api/api-contract-sync-script.test.ts`
  - `tests/navigation/route-coverage-script.test.ts`
  - `tests/navigation/navigation-architecture.test.ts`
  - `tests/e2e-native-coverage-contract.test.ts`
  - `tests/e2e-mobile-script.test.ts`
  - `tests/observability/RootErrorBoundary.test.tsx`
  - `tests/__mocks__/expo-audio.ts`, `react-native-ble-plx.ts`
- E2E / native harness
  - `e2e/helpers/ui.ts`
  - `e2e/helpers/localServices.ts`
  - `e2e/module-matrix.test.ts`
  - `e2e/smoke.test.ts`
  - `e2e/auth-signup-login.test.ts`
  - `scripts/e2e-mobile.js`
- Validation scripts
  - `scripts/check-api-contract-sync.mjs`
  - `scripts/api-contract-sync.mjs`
  - `scripts/check-route-coverage.mjs`
  - `scripts/check-screen-prop-types.mjs`
  - `scripts/check-token-parity.mjs`
  - `scripts/flows/validate-go-calls.mjs`
  - `scripts/sequences/validate-sequences.mjs`
- CI
  - `.github/workflows/ci.yml`
  - `.github/workflows/detox.yml`

### Reference cards reviewed

- `docs/reference/ios/extractions/element-hq__element-x-ios.md`
- `docs/reference/ios/extractions/jellyfin__Swiftfin.md`
- `docs/reference/ios/extractions/adessoTurkey__ios-sample-app-swiftui.md`

## Reference benchmarks

- **element-hq/element-x-ios**: splits testing into dedicated targets (`UnitTests`, `UITests`, `IntegrationTests`, `PreviewTests`, `AccessibilityTests`) with `.xctestplan` files, publishes Codecov + Sonar quality gates, and keeps UI, integration, accessibility, and snapshot concerns physically separate. No validation-script sprawl; quality is enforced by test targets and external gates.
- **jellyfin/Swiftfin**: uses standard iOS test targets, `fastlane` for release automation, and `CoreStore` migrations with versioned persistence tests. Emphasizes service-layer testability through generated API clients and injected view-model dependencies.
- **adessoTurkey/ios-sample-app-swiftui**: documents **Maestro** for UI test automation, **SwiftLint** with git hooks, and a separate `NetworkService` SPM package with its own `NetworkServiceTests` target. The pattern is: one dedicated UI-automation layer, one lint/style gate, and network logic isolated enough to test without the app shell.

Common thread: the reference projects separate *unit*, *integration*, *UI/E2E*, and *static-analysis* concerns into distinct, maintainable layers rather than accumulating project-specific validation scripts.

## Findings

### Improvements

- **`.github/workflows/ci.yml:79` / `scripts/check-api-contract-sync.mjs`**: the CI job `mobile-api-contract-sync` runs `npm run api:contract-sync:check`, which executes a 5-line stub that always `process.exit(0)`. The real script is `scripts/api-contract-sync.mjs`, which is **not** exercised in CI. The contract-sync gate is therefore a no-op in practice.
- **`scripts/api-contract-sync.mjs:9–11` / `migrate-ui-ux-to-mobile-app-docs/api/openapi.json`**: the default OpenAPI path points to `../tbot-backend/openapi.json`, but the file is actually a symlink to `/Users/manhhodinh/Documents/TBOT/docs/site/api/openapi.json`, which does not exist on this machine. Running the real script fails with `ENOENT`. The test `tests/api/api-contract-sync-script.test.ts` and `tests/e2e-mobile-script.test.ts` also read this symlink directly, so two test suites fail on any clean checkout.
- **`tests/navigation/route-coverage-script.test.ts:14–16` / `scripts/check-route-coverage.mjs`**: the test expects the script to print `130 screen files, 122 routes registered` and exit 0. In reality the script exits 1 and lists five unregistered screens (`LessonDemoHomeScreen`, `LessonRoadmapScreen`, `LessonSessionScreen`, `LessonShowcaseScreen`, `ParentLessonSummaryScreen`). The test is out of sync with the current `src/features` layout.
- **`npm run flows:validate` / `scripts/flows/validate-go-calls.mjs`**: fails because generated Mermaid/Markdown headers in `migrate-ui-ux-to-mobile-app-docs/flows/...` are stale relative to `nav-graph-data.json` (sha mismatch). This blocks the documented CI validation command even though the source graph may be correct.
- **`package.json:116–163` / `e2e/` vs `tests/e2e/`**: the real Detox E2E suite lives in `e2e/` (root) and is excluded from `npm test`. The directory `tests/e2e/` contains eight `.test.tsx` files that are actually component/render tests and run under the *unit* Jest project. Naming them `e2e` is misleading; they are not end-to-end tests.
- **`.detoxrc.js` / `.github/workflows/detox.yml`**: Detox native E2E only runs on `main` and `release/**` PRs. Ordinary feature PRs do not execute native E2E at all. The `tests/e2e/README.md` additionally promises a Maestro smoke suite under `.maestro/`, but no `.maestro/` directory exists in the project root.
- **`npm test` result**: `Test Suites: 9 failed, 1 skipped, 125 passed` / `Tests: 16 failed, 19 skipped`. Two representative failures:
  - `tests/api/config.test.ts:150` expects `https://tbot-backend-8wmh.onrender.com/v1` but the environment under test returns a different URL.
  - `tests/features/parent/parent-today-screen.test.tsx:55` fails because loading text is still present when the assertion expects it to be null.
  Jest also reports `Jest did not exit one second after the test run has completed`, indicating unclosed async handles in several suites.
- **`tests/__mocks__/expo-audio.ts:21`**: `requestRecordingPermissionsAsync` resolves to `{ granted: false }`. For a voice-first app, the default mock should grant permission (or be parameterizable per test) so that permission-gated flows can be exercised without manual override.
- **`tests/__mocks__/react-native-ble-plx.ts`**: the mock is a 6-line class stub (`startDeviceScan`, `stopDeviceScan`, `destroy`). It does not model connection state, services/characteristics, or error events, so BLE-heavy paths are tested against a near-empty double.
- **`tests/hooks/useGeminiConversation-p0.test.ts` and `useGeminiConversation-bargein-ordering.test.ts`**: the majority of assertions are source-file regex reads (`fs.readFileSync` + `toMatch`/`not.toMatch`). These “source-readback” tests are brittle: any refactor that renames a variable, splits a function, or reorders code will break them even when behavior is unchanged. Behavioral tests for the same barge-in ordering logic are absent.
- **`scripts/check-screen-prop-types.mjs:41–73`**: the script declares a `violations` array but never pushes anything into it; the visitor only detects `NativeStackScreenProps` usage and never reports misuse. It therefore always exits 0 regardless of screen-prop quality.
- **`tests/integration/__setup__/mock-server.ts` / `auth-isolation.test.ts`**: only one integration test exists, and it contains four early `return` skips when the shared backend returns 429. The integration project is underutilized relative to the 136 unit-test files.
- **`package.json:116–163`**: Jest has no `collectCoverage`, `coverageThreshold`, or `coveragePathIgnorePatterns`. There is no coverage gate in CI.

### Simplifications

- **`.github/workflows/ci.yml:67–79` / `scripts/check-api-contract-sync.mjs`**: remove the stub `check-api-contract-sync.mjs` and point CI directly at `scripts/api-contract-sync.mjs` with a known-good OpenAPI path (or make the script fail-open with a clear warning rather than a fake success).
- **`scripts/` validation cascade**: `flows:validate`, `sequences:fast`, `erd:validate`, and `usecases:check` are run in every PR. Several checks (e.g., generated-file SHA headers, sequence-diagram actor allow-lists, ERD DBML emission) are documentation-process gates rather than product quality gates. Consider splitting them into a separate `docs-integrity` workflow so the mobile-quality job focuses on build/test/lint.
- **Source-readback hook tests**: convert the regex-based P0/barge-in tests into behavioral tests using a controlled `VoiceMic` event emitter and fake timers. This reduces brittleness and better documents the intended state-machine semantics.
- **Mocks**: replace the per-module manual mocks with a centralized mock factory (e.g., `jest.mock` for each native module returning configurable spies). This removes duplication between `tests/setup.ts` and the `tests/__mocks__/` files and makes permission/connection defaults explicit.
- **`tests/e2e/` naming**: rename `tests/e2e/` to `tests/screens/` or `tests/feature-flows/` so the directory accurately reflects component-level scope. Reserve the `e2e/` label for Detox/Maestro native automation.

### Bottlenecks

- **Detox runtime / CI cost**: `.github/workflows/detox.yml` uses `macos-latest` for iOS and the `reactivecircus/android-emulator-runner` for Android with 60-minute timeouts per job. As the `e2e/module-matrix.test.ts` suite grows (it already targets 11 deep-link routes plus CTAs plus back-gesture/modal tests), runtime will dominate CI capacity and flake rate will rise.
- **Validation scripts as a single sequential cascade**: `ci.yml` runs lint, typecheck, unit tests, integration tests, flows, sequences, ERD, usecases, token parity, screen props, and Expo config in one job. Any single failure (e.g., stale Mermaid header) blocks the whole pipeline. Splitting into parallel jobs reduces wall-clock time and isolates failure domains.
- **Source-readback test maintenance**: `tests/hooks/useGeminiConversation-p0.test.ts` is 399 lines of regex assertions against `useGeminiConversation.ts`, `VoiceMicModule.swift`, `VoiceSessionModule.swift`, etc. Every iOS voice refactor will force updates across this file. Long-term maintenance cost is high.
- **Local-service dependency of `scripts/e2e-mobile.js`**: the script hardcodes `DEFAULT_LOCAL_API_URL = 'http://127.0.0.1:3000'` and `DEFAULT_LOCAL_AI_URL = 'http://127.0.0.1:3001/api/ai'`, requires `SIMULATION_MODE=true`, and reads a backend `.env` via `tbot-backend`. This makes the script fragile on contributor machines and CI runners that do not have the backend checked out at the expected relative path.

## Top 3 quick wins

1. **Fix the failing test baseline**. Nine suites currently fail on `npm test`. Before adding new validation scripts or E2E scenarios, bring the suite to green, starting with the broken `openapi.json` symlink, the stale route-coverage expectation, and the mismatched API-config assertion.
2. **Replace the API-contract stub gate with the real script (or delete it)**. Running a stub that always exits 0 creates a false sense of safety. Either wire `scripts/api-contract-sync.mjs` into CI with a checked-in OpenAPI fixture, or remove the gate and the associated test until the contract is stable.
3. **Add Jest coverage thresholds and a coverage job**. Start with a low threshold (e.g., 50% lines) for `src/` and fail CI if coverage drops. This prevents the unit-test suite from growing in untested files and gives the team a measurable quality signal.

## Risk / effort estimates

| Recommendation | Risk | Effort | Notes |
|---|---|---|---|
| Fix failing unit tests and broken OpenAPI symlink | HIGH (blocks reliable CI) | LOW–MEDIUM | Mostly path/env updates and test expectation fixes. |
| Replace stub API-contract gate with real script | HIGH (currently misleading) | LOW | Single workflow/script change; may expose more drift. |
| Add Jest coverage thresholds | MEDIUM | LOW | Add `coverageThreshold` to `package.json` and a CI step. |
| Split docs-integrity checks into separate workflow | MEDIUM | LOW | Reorganize `.github/workflows/ci.yml`; no source changes. |
| Rename `tests/e2e/` to reflect component scope | LOW | LOW | File moves and import updates. |
| Convert source-readback hook tests to behavioral tests | MEDIUM | MEDIUM–HIGH | Requires building a controllable native-event test harness for `useGeminiConversation`. |
| Improve native mocks (audio, BLE) | MEDIUM | MEDIUM | Expand `tests/__mocks__/` to model stateful behavior; may need factory pattern. |
| Add Maestro smoke suite promised by README | LOW | MEDIUM | Create `.maestro/` flows and a CI job; complements Detox. |
| Parallelize CI jobs and reduce Detox runtime | MEDIUM | MEDIUM | Reorganize workflows; may need emulator AVD tuning. |
