# Mobile Backend Integration QA - 2026-05-17

Task: `AD-HOC: adhoc-2026-05-17-mobile-backend-integration-qa`
Role: senior mobile QA
Scope: tbot-mobile sys-16 integration against local backend `:3000` and AI simulation `:3001`.

## Executive Result

Overall result: FAIL for release-level mobile UX gate.

Reason: local API/backend production gate passed all 9 requested modules, but native Detox UI matrix has a reproducible interaction failure in `Course Library + Purchase`: `PurchaseIntroScreen` CTA `See how it works` is clipped below visible bounds and not hittable. Because the native module matrix aborts there, fallback modal/native recovery coverage is not release-proven in the latest run.

Backend/API result: PASS.
Native UI result: FAIL.

## Fresh Evidence

| Gate | Command | Result | Evidence |
|---|---|---|---|
| Local backend health | `curl -sS -m 5 http://127.0.0.1:3000/v1/health` | PASS | `{"status":"ok","service":"tbot-backend","version":"0.1.0"}` |
| Local AI simulation health | `curl -sS -m 5 http://127.0.0.1:3001/health` | PASS | `simulation_mode:true`, circuit breaker closed |
| API production gate | `SIMULATION_MODE=true TBOT_BACKEND_LOG=/tmp/tbot-backend-e2e-live.log npm run e2e:mobile:local` | PASS | `PASS: 19 steps, 0 backend 5xx, 0 ECONNREFUSED, 0 schema drift, clean backend logs` |
| E2E harness unit proof | `npm test -- --runInBand tests/e2e-mobile-script.test.ts` | PASS | 12 tests passed |
| Integration tests | `npm run test:integration` | PASS | 1 suite, 3 tests passed |
| Route coverage | `npm run check:route-coverage` | PASS | 123 screen files, 123 routes registered, 0 duplicate screen registrations |
| Typecheck | `npx tsc --noEmit --pretty false` | PASS | exit 0 |
| Lint | `npm run lint` | PASS | exit 0 |
| Native Detox evidence | `detox test --configuration ios.sim.debug e2e/module-matrix.test.ts` | FAIL | `artifacts/ios.sim.debug.2026-05-17 13-34-25Z/.../testFnFailure.png`; trace: `See how it works` not visible/hittable |

## Flow Results

| Flow | Overall | API/backend | Native UI | Screens covered | CTAs tapped | Routes exercised | Endpoints |
|---|---|---|---|---|---|---|---|
| Auth + Onboarding | PASS | PASS | PASS | `LoginScreen`, `SplashScreen`, `WelcomeScreen`, `ChildProfileScreen`, `FirstLessonEntryScreen` | login, onboarding continue/save | auth/onboarding start to Home | `POST /v1/auth/signup`, `POST /v1/auth/login`, `POST /v1/auth/consent`, `POST /v1/households`, `POST /v1/households/:id/children` |
| Home Dashboard | PASS | PASS | PASS | `HomeHubScreen` | primary home CTA | `home/home-hub`, tabs | `GET /v1/households`, `GET /v1/devices/household/me` |
| Device Pairing | PASS | PASS | PASS | `PairIntroScreen`, `PairSearchScreen`, `PairFoundScreen`, `PairCodeScreen`, `PairWifiScreen`, `PairConnectingScreen`, `PairSuccessScreen`, `PairFailedScreen` | pair/start/failure retry paths | device pairing routes | `POST /v1/devices/factory-register`, `POST /v1/devices/ble-code/:serialNumber`, `POST /v1/devices/claim`, `GET /v1/devices/:deviceId` |
| Learning + Lesson Session | PASS | PASS | PASS | `ConnectingScreen`, `GreetingScreen`, `LessonReadyScreen`, `RobotListeningScreen`, `RobotSpeakingScreen`, `LessonDoneScreen`, `RetryScreen` | `I'm ready!` | `lesson-session/lesson-ready` | `GET /v1/learning/children/:childId/profile`, `GET /v1/learning/children/:childId/session/today`, `POST /v1/learning/children/:childId/interactions`, `POST /v1/learning/children/:childId/session/complete`, AI sim `/v1/llm/chat` |
| Progress | PASS | PASS | PASS | `TodayProgressScreen`, `WordsPracticedScreen`, `LessonSummaryScreen`, `ReviewNeededScreen`, `CelebrationScreen` | `Back home` or `Retry` | `progress/today-progress` | `GET /v1/learning/children/:childId/kpis`, `GET /v1/learning/children/:childId/vocab`, `GET /v1/learning/children/:childId/vocab/due` |
| Parent Control | PASS | PASS | PASS | `ParentGateScreen`, `ParentSummaryScreen`, `ParentTodayScreen`, `ParentHistoryScreen`, `ParentSafetyScreen`, `ParentSettingsScreen`, `ParentLockedOutScreen` | `Settings` | `parent/parent-summary` | `POST /v1/parent/auth`, `GET /v1/controls/:deviceId`, `PUT /v1/controls/:deviceId`, `POST /v1/controls/:deviceId/emergency-stop` |
| Course Library + Purchase | FAIL | PASS | FAIL | `CourseLibraryScreen`, `CourseDetailScreen`, `BuyCourseScreen`, `UnlockConfirmScreen`, `CheckoutScreen`, `OrderConfirmScreen`, `SubscriptionsScreen`, `PurchaseIntroScreen` | `See how it works` FAIL: clipped/not hittable | `course-library/course-library`, `purchase/purchase-intro` | `GET /v1/billing/plans`, `POST /v1/billing/checkout-session`, `GET /v1/billing/invoices`, `GET /v1/billing/subscription` |
| Robot Management | PASS | PASS | PASS | `MyRobotScreen`, `RobotStatusScreen`, `RobotBatteryScreen`, `RobotFirmwareScreen`, `RobotWifiScreen`, `MicTestScreen`, `SpeakerTestScreen`, `SupportScreen` | `Microphone test`, `Start mic test` | `robot-mgmt/my-robot` | `GET /v1/devices/:deviceId`, `POST /v1/devices/heartbeat`, `GET /v1/devices/household/me`, `DELETE /v1/devices/:deviceId` |
| Fallback + Recovery | FAIL | PASS | FAIL | `NetworkErrorScreen`, `AppErrorScreen`, `MicMissingScreen`, `VoiceFailedScreen`, `AudioRecoveryScreen`, `SafetyRedirectScreen`, `LessonResumeScreen`, `ReconnectingOverlay` | `Try again`, `Stop and go home` intended | `fallback/network-error` | `GET /v1/health`, `GET /v1/metrics/snapshot`, AI `/health`, AI retry target |

## State Checks

| Check | Result | Evidence |
|---|---|---|
| Loading states | PASS for API gate; PASS/FAIL mixed in native | Plan covers loading sentinels; native trace has transient misses for library loading text, but final release blocker is purchase CTA visibility. |
| Empty states | PASS for plan/static proof | E2E plan asserts library empty/unavailable variants; route coverage passes. |
| Error/offline/retry states | PASS for API gate; FAIL for full native proof | API gate covers bad login, unauth, invalid BLE code, unknown child/device, malformed checkout, AI validation failure. Native fallback flow not completed after purchase CTA failure. |
| Back button/gesture | Not release-proven in latest native run | `module-matrix.test.ts` includes back gesture test, but latest Detox run already has failed suite evidence. |
| Modal dismiss | Not release-proven in latest native run | Modal fallback test exists; latest run has no clean full native pass. |
| Stuck loading | PASS for API gate; FAIL/unknown for native release gate | No API stuck loading. Native UI abort prevents whole-matrix proof. |
| Blank screen | PASS for API/route coverage; FAIL/unknown for native release gate | No unresolved routes; native failure screenshot shows rendered purchase screen, not blank. |
| Crash | PASS in API/static gates; no native crash seen | Detox failure is visibility/hittability, not crash. |
| Abnormal 4xx/5xx | PASS | API gate: 0 backend 5xx; expected negative-path 4xx only. |

## Bugs

### Critical

None found in fresh local API/backend run: no 5xx, no connection refused, no schema drift, clean backend logs.

### Major

1. `PurchaseIntroScreen` CTA is not reliably hittable on iPhone 17 Pro simulator.
   - Screen: `PurchaseIntroScreen`
   - Route: `purchase/purchase-intro`
   - CTA: `See how it works`
   - Evidence: `artifacts/ios.sim.debug.2026-05-17 13-34-25Z/.../testFnFailure.png`
   - Trace: `View ... text == "See how it works" is not visible: View is clipped by one or more of its superviews' bounds and does not pass visibility percent threshold (75)`
   - Impact: purchase education/checkout path cannot be completed by native E2E; release-level flow fails.

2. Fallback + Recovery native proof blocked by earlier module-matrix failure.
   - Screen: `NetworkErrorScreen`
   - Route: `fallback/network-error`
   - CTA: `Try again`, `Stop and go home`
   - Endpoint: none direct for UI retry; API gate covers `GET /v1/health`, `GET /v1/metrics/snapshot`, AI health.
   - Impact: backend recovery API passed, but native modal dismiss/retry cannot be claimed complete from latest full run.

### Minor

1. Detox selector/scroll helper is brittle for buttons near bottom of long scroll screens.
   - Evidence: trace says no `RCTScrollView` matched while the actual hierarchy contains `RCTScrollViewComponentView`/`RCTEnhancedScrollView`.
   - Impact: can produce false negatives, but screenshot also confirms the CTA sits below the visible safe area.

## Endpoint Failures

Fresh API gate endpoint failures: none unexpected.

Expected negative-path endpoints returned controlled errors:
- bad login
- invalid BLE code
- unknown child
- unknown device
- malformed checkout
- AI validation failure

Backend anomalies:
- 0 backend 5xx
- 0 ECONNREFUSED
- 0 schema drift
- clean backend logs after settle

## Route Failures

Route coverage script reports no unresolved route:

`check-route-coverage: OK -- 123 screen files, 123 routes registered, 123 feature route registrations, 0 duplicate screen registrations`

Native route interaction failure:
- `purchase/purchase-intro` -> CTA clipped/not hittable.

## Fix Order

1. Fix `PurchaseIntroScreen` layout/hit target: ensure `See how it works` button is fully visible above safe-area bottom or make scroll container/testID targeting deterministic.
2. Re-run `npm run detox:test:ios` or targeted `detox test --configuration ios.sim.debug e2e/module-matrix.test.ts --record-logs failing --take-screenshots failing`.
3. After purchase CTA passes, revalidate fallback modal dismiss/retry native tests.
4. Keep API production gate in CI: `SIMULATION_MODE=true TBOT_BACKEND_LOG=/tmp/tbot-backend-e2e-live.log npm run e2e:mobile:local`.
5. Add stable testIDs for critical CTAs across purchase and fallback screens so Detox does not depend on clipped text matching.

## Verdict

Backend/local integration is green. Mobile native UX is not green. Release gate remains FAIL until purchase CTA visibility and downstream fallback native proof pass in Detox.
