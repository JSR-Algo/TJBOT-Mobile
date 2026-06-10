# AD-HOC: native E2E coverage

## Scope

Native Detox tests for sys-16 mobile UI:

- Cold start
- Login
- Onboarding
- Home
- Tab navigation
- Device flow entry
- Lesson flow entry
- Parent gate
- Purchase entry
- Fallback/retry screen
- Back gesture
- Modal dismiss

## Native E2E scenarios

| Scenario | File | Evidence intent |
|---|---|---|
| Cold start, login, onboarding, Home | `e2e/smoke.test.ts`, `e2e/module-matrix.test.ts` | Seeds account, launches app, signs in, completes onboarding, asserts `homeTab` visible |
| Tab navigation | `e2e/module-matrix.test.ts` | Taps `homeTab`, `devicesTab`, `libraryTab`, `progressTab`, `profileTab`; asserts native tab visible after each tap |
| Module entries | `e2e/module-matrix.test.ts` | Opens Home, Course, Course Library, Lesson Ready, Progress, Parent, Device, Robot Management, Purchase, Fallback deep links and taps a primary CTA |
| Fallback retry | `e2e/module-matrix.test.ts` | Opens network fallback, taps `Try again`, asserts reconnect attempt screen |
| Back gesture | `e2e/module-matrix.test.ts` | Opens device stack screen and returns with native back/gesture |
| Modal dismiss | `e2e/module-matrix.test.ts` | Opens reconnect overlay and taps `stopReconnectHomeButton` to return Home |
| Native crash/no blank/no stuck loading | `e2e/helpers/ui.ts` | `expectNativeAppAlive`, `expectNoBlankScreen`, `expectNoStuckLoading` use `appRoot`, `mainTabs`, and 10s screen timeout |

## TestIDs added

| testID | File | Purpose |
|---|---|---|
| `appRoot` | `src/App.tsx` | App-level native anchor for no-blank/crash checks |

Existing stable IDs used:

- `mainTabs`
- `homeTab`
- `devicesTab`
- `libraryTab`
- `progressTab`
- `profileTab`
- `emailInput`
- `passwordInput`
- `submitButton`
- `childProfileSaveButton`
- `trustContinueButton`
- `parentSettingsHeaderButton`
- `purchaseIntroHowItWorksCta`
- `purchaseIntroScroll`
- `stopReconnectHomeButton`

## Backend and AI configuration

`.detoxrc.js` supports local/staging app build endpoints:

- `E2E_IOS_API_URL`
- `E2E_ANDROID_API_URL`
- `E2E_IOS_AI_URL`
- `E2E_ANDROID_AI_URL`
- shared fallback `E2E_APP_API_URL`
- shared fallback `E2E_APP_AI_URL`

Detox builds now regenerate `src/__env__.ts` before native compilation and Android passes
`-Pe2eBundleDebug=true` so debug APKs embed the current E2E backend/AI URLs instead
of stale `.env` values.

Test-side service checks use:

- `E2E_LOCAL_API_URL`
- `E2E_LOCAL_AI_URL`
- `SIMULATION_MODE=true`

## Screens covered

Auth/Login, Onboarding/Child Profile/Mic Ask/First Lesson Entry, HomeHub, tabs, DeviceHome, DeviceSession, Course, CourseLibrary, LessonReady, TodayProgress, ParentSummary, ParentSettings, MyRobot, RobotSound, PurchaseIntro, Purchase How It Works, NetworkError, ReconnectingOverlay.

## Flaky risks

- Simulator/emulator names must match `.detoxrc.js` or CI must override them.
- Local backend and AI simulation health checks are hard prerequisites.
- Deep-link tests disable Detox synchronization around long-running fallback/retry flows.
- Native permission prompts can vary; launch grants microphone/notifications and helper taps `Allow` only if visible.
- Native button lookup uses visible text plus accessibility label fallback to avoid React Native line-wrap brittleness.

## CI readiness

Ready when CI provides:

- iOS simulator + Android emulator images matching Detox config.
- Metro/native build cache with React Native 0.83 toolchain.
- Reachable backend and AI simulation endpoints.
- Artifact capture for Detox logs/traces/screenshots/videos.

## Verification evidence

Passing local checks:

```sh
node -e "require('./.detoxrc.js'); console.log('detox config ok')"
npx tsc --noEmit
npm run lint
node ./node_modules/jest/bin/jest.js --selectProjects unit --runTestsByPath tests/e2e-native-coverage-contract.test.ts --runInBand --no-cache --verbose
npm run detox:build:android
```

Native runner blockers in this workstation:

- `npm run detox:build:ios` is blocked by local Xcode mismatch: installed SDK is `iphonesimulator26.5`, while installed simulator runtimes are iOS 26.4 / 26.4.1.
- `npm run detox:build:android` passes and produces debug app/test APKs with embedded E2E JS bundle.
- Android smoke initially exposed two real issues and both were patched: stale generated env in the APK, and password input ambiguity with `!`.
- After the APK/bundle fix, `npm run detox:test:android -- e2e/smoke.test.ts` became blocked before Jest assignment by local Detox/emulator startup hang; no app crash or blank-screen assertion was reached in the final attempt.
