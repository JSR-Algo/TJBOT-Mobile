# 2026-05-18 Ad-hoc Flaky Test Debugger

## Scope

- Mobile unit guard loop for notification/linking/E2E harness contracts.
- Backend suspect isolation for `tests/rate-limiter.spec.ts`.
- Native iOS Detox module matrix launch/visibility flakes.

## Findings

- `tests/navigation/notification-linking.test.ts`: 10/10 pass in isolation.
- `tbot-backend tests/rate-limiter.spec.ts`: 10/10 pass in isolation; full-suite flake likely requires shared service state to reproduce.
- Native Detox had two harness flakes:
  - RN LogBox/debug overlay covered visible app content, making visible text report not hittable.
  - Initial `device.launchApp({newInstance:true, delete:true})` could terminate a non-running app on this Detox/iOS runtime.
  - Native QA builds depended on stale/generated `src/__env__.ts`; Detox build commands did not force `EXPO_PUBLIC_VOICE_TEST_HARNESS=true`.
  - iOS build destination was optional, so default Detox builds could invoke `xcodebuild` without a simulator destination.
  - Local backend availability was a shared-state dependency for module matrix/smoke E2E.

## Fixes

- QA harness suppresses RN warning overlay before `App` is required.
- Push notification native initialization remains disabled in QA harness.
- Initial E2E app launch avoids the empty-terminate race.
- Detox iOS/Android build commands inject `EXPO_PUBLIC_VOICE_TEST_HARNESS=true`.
- Detox iOS build defaults to an explicit simulator destination.
- E2E local services start an in-process mock backend when `/v1/health` cannot connect, then clean it up in smoke/module-matrix teardown.

## Verification

- `npx tsc --noEmit --pretty false`: pass.
- `npm run lint -- --quiet`: pass.
- Focused Jest guard loop after config guard change: 10/10 pass, 36 tests per run.
- Contract guard: `tests/e2e-native-coverage-contract.test.ts` pass, 4 tests.

## Blocked Gate

- Native Detox 10x rerun is blocked by local infrastructure, not app assertions:
  - Disk filled during Detox artifacts; freed generated Android build output.
  - Local backend `127.0.0.1:3000` is down.
  - Postgres `127.0.0.1:55454` is down.
  - Docker CLI hangs, so the local Postgres container cannot currently be restored from this session.
  - Fresh Detox iOS build now includes QA env and destination, but local Xcode selects `iphonesimulator26.5` while no matching simulator runtime is installed:
    `xcodebuild: error: Unable to find a destination matching the provided destination specifier`.
  - No existing `ios/build/Build/Products/Debug-iphonesimulator/TJBotMobile.app` binary is present, so `detox test` cannot run against a cached build.
