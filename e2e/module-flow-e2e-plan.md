# TBOT Mobile Module Flow E2E Plan

Scope: sys-16 mobile E2E coverage for local-only contract and simulator flows. Each module has one happy path and one failure or retry path. Backend and AI calls must stay local in E2E runs.

Module: Auth + Onboarding
- Screens: SplashScreen, WelcomeScreen, LoginScreen, ChildProfileScreen, MicAskScreen, FirstLessonEntryScreen
- Endpoints: POST /v1/auth/signup, POST /v1/auth/login, POST /v1/auth/consent, POST /v1/households, POST /v1/households/:id/children
- Test data setup: create unique parent email, password `TestPass123!`, COPPA consent token `tok_test_bypass`, household `Mobile Local E2E Household`, child `Ari`
- Happy path: launch clean app, create/login parent, accept COPPA, create household, create child profile, grant microphone, start first lesson
- Failure path: submit wrong password, expect 400/401/422, retry with valid credentials without stale auth state
- User actions: tap Get started, advance intro, fill email/password, submit account, save child profile, enable microphone, start lesson
- Expected navigation: Auth stack -> Onboarding stack -> Home tab
- Expected loading/empty/error states: intro loading tolerated under cold start timeout; bad login shows recoverable auth error; empty household routes to onboarding
- Assertions: access token returned, consent accepted, household id exists, child id exists, Home tab visible, invalid login never reaches protected tabs
- Cleanup: app launches with `delete: true`; unique seeded email avoids shared state; local backend test DB owns row cleanup between runs
- Test command: `SIMULATION_MODE=true node scripts/e2e-mobile.js --plan-json` for coverage plan, `SIMULATION_MODE=true TBOT_BACKEND_LOG=/tmp/tbot-backend-e2e.log npm run e2e:mobile:local` for local contract gate, `npm run detox:test:ios` for simulator UI
- Pass criteria: happy path reaches HomeHub; failure path returns expected 4xx; no backend 5xx, ECONNREFUSED, schema drift, or route miss

Module: Home Dashboard
- Screens: HomeHubScreen
- Endpoints: GET /v1/households, GET /v1/devices/household/me
- Test data setup: authenticated parent from Auth + Onboarding, household, child, optional claimed device
- Happy path: open Home tab after onboarding, fetch household and device list, render dashboard entry CTAs
- Failure path: call household list without bearer, expect 401, retry with bearer token and render HomeHub
- User actions: tap Home tab, tap first available primary CTA such as Start Today's Lesson, Pair Robot, Open Parent Controls, View Activity
- Expected navigation: Main tabs remain mounted; Home CTA routes to lesson, device, parent, or progress entry without blank screen
- Expected loading/empty/error states: loading dashboard, no robot paired, robot unavailable, no recent activity, retry after auth failure
- Assertions: Home tab testID visible, household response is array, device list response is array, CTA target shows expected sentinel text
- Cleanup: reset URL blacklist after retry tests; return to HomeHub before next module
- Test command: `npm run detox:test:ios -- --testNamePattern "module matrix"`
- Pass criteria: HomeHub visible within 30 seconds; protected tab navigation has no blank screens or route errors

Module: Device Pairing
- Screens: PairIntroScreen, PairSearchScreen, PairFoundScreen, PairCodeScreen, PairWifiScreen, PairConnectingScreen, PairSuccessScreen, PairFailedScreen, DeviceHomeScreen
- Endpoints: POST /v1/devices/factory-register, POST /v1/devices/ble-code/:serialNumber, POST /v1/devices/claim, GET /v1/devices/:deviceId
- Test data setup: unique serial `TBOT-<timestamp>`, local factory token, authenticated parent, household
- Happy path: factory-register robot, request BLE code, claim robot with returned code, fetch claimed device, open Devices tab
- Failure path: claim unknown serial with BLE code `000000`, expect 400/403/404/409/422, then retry normal route without poisoning device state
- User actions: tap Pair Robot, find robot, enter pairing code, continue Wi-Fi step, wait for success
- Expected navigation: Home/Devices tab -> pairing stack -> PairSuccessScreen -> DeviceHomeScreen
- Expected loading/empty/error states: scanning, connecting, robot not found, invalid code, retry pairing
- Assertions: factory response includes device_id, BLE code exists, claim response includes device_id, claimed device loads, invalid claim does not bind device
- Cleanup: deregister claimed robot in Robot Management flow or reset backend fixture DB
- Test command: `SIMULATION_MODE=true TBOT_FACTORY_TOKEN=local-e2e-factory-token npm run e2e:mobile:local`
- Pass criteria: pairing happy path binds one device; failure path rejects invalid code; route map contains all pairing screens

Module: Learning + Lesson Session
- Screens: ConnectingScreen, GreetingScreen, LessonReadyScreen, RobotListeningScreen, UserSpeakingScreen, ThinkingScreen, RobotSpeakingScreen, LessonDoneScreen, RetryScreen, AudioErrorScreen
- Endpoints: GET /v1/learning/children/:childId/profile, GET /v1/learning/children/:childId/session/today, POST /v1/learning/children/:childId/interactions, POST /v1/learning/children/:childId/session/complete, POST http://127.0.0.1:3001/v1/llm/chat
- Test data setup: onboarded child, local AI service with `simulation_mode=true`, current lesson session
- Happy path: open LessonReadyScreen, start lesson, send one simulated interaction, complete session, show lesson done state
- Failure path: request learning profile without bearer and expect 401, retry with bearer; simulate temporary lesson/audio failure and route to RetryScreen
- User actions: tap Start Today's Lesson or I'm ready!, wait through Connecting/Greeting, complete lesson turn, tap finish/back home
- Expected navigation: HomeHub -> LessonReadyScreen -> Connecting/Greeting -> listening/speaking states -> LessonDoneScreen -> Home or Progress
- Expected loading/empty/error states: connecting, tuning in, reconnecting, retry, audio error, session timeout
- Assertions: profile auth retry succeeds, session id exists, interaction write succeeds, completion succeeds, AI simulation health is true, no real AI provider call
- Cleanup: complete or abandon session; reset URL blacklist and Detox synchronization after retry state checks
- Test command: `SIMULATION_MODE=true node scripts/e2e-mobile.js --plan-json` plus `npm run detox:test:ios -- --testNamePattern "opens module entry screens"`
- Pass criteria: lesson path reaches a speaking/done sentinel; retry path recovers or shows actionable retry state

Module: Progress
- Screens: TodayProgressScreen, WordsPracticedScreen, LessonSummaryScreen, ReviewNeededScreen, CelebrationScreen
- Endpoints: GET /v1/learning/children/:childId/kpis, GET /v1/learning/children/:childId/vocab, GET /v1/learning/children/:childId/vocab/due
- Test data setup: child with completed or partially completed lesson session
- Happy path: open Progress tab, load today progress, words practiced, summary, review-needed or celebration surface
- Failure path: request KPIs for unknown child UUID, expect 403/404, then return to valid child progress
- User actions: tap Progress tab, open today's progress, tap Back home or Retry
- Expected navigation: Main tabs -> Progress -> TodayProgressScreen -> LessonSummary/WordsPracticed/ReviewNeeded -> Home
- Expected loading/empty/error states: loading progress, no progress yet, review due empty, progress unavailable, retry
- Assertions: KPI/vocab/vocab-due calls return 200 for valid child, unknown child is rejected, Progress tab remains visible, Home returns cleanly
- Cleanup: no persistent cleanup beyond seeded child/session reset
- Test command: `npm run detox:test:ios -- --testNamePattern "module matrix"`
- Pass criteria: progress surfaces render valid, empty, or error states without hanging beyond 10 seconds

Module: Parent Control
- Screens: ParentGateScreen, ParentSummaryScreen, ParentTodayScreen, ParentHistoryScreen, ParentSafetyScreen, ParentSettingsScreen, ParentLockedOutScreen
- Endpoints: POST /v1/parent/auth, GET /v1/controls/:deviceId, PUT /v1/controls/:deviceId, POST /v1/controls/:deviceId/emergency-stop
- Test data setup: authenticated parent, claimed robot device, controls row, parent PIN path
- Happy path: pass parent gate, open parent summary/settings, read controls, update quiet hours/content categories, trigger emergency stop
- Failure path: read controls for unknown device UUID and expect 403/404; wrong PIN may show ParentLockedOutScreen depending backend policy
- User actions: tap Open Parent Controls, enter PIN, tap Settings, adjust quiet hours or category toggles, tap emergency stop
- Expected navigation: Home/Profile -> ParentGateScreen -> ParentSummaryScreen -> ParentSettingsScreen/ParentSafetyScreen
- Expected loading/empty/error states: parent gate loading, wrong PIN, locked out, controls unavailable, retry
- Assertions: controls fetch returns 200, update returns 200, emergency stop response includes stopped, unknown device is rejected
- Cleanup: restore controls to default values or rely on isolated local test device; reset parent gate state between app launches
- Test command: `SIMULATION_MODE=true TBOT_BACKEND_LOG=/tmp/tbot-backend-e2e.log npm run e2e:mobile:local`
- Pass criteria: parent can update controls and stop robot; failure path blocks unauthorized/unknown device access

Module: Course Library + Purchase
- Screens: CourseLibraryScreen, CourseDetailScreen, BuyCourseScreen, CheckoutScreen, OrderConfirmScreen, SubscriptionsScreen, CourseAddedScreen, CourseLockedScreen, NeedsSyncScreen
- Endpoints: GET /v1/billing/plans, POST /v1/billing/checkout-session, GET /v1/billing/invoices, GET /v1/billing/subscription
- Test data setup: authenticated parent, child profile, billing test catalog, no live payment provider
- Happy path: open Course Library, view available plans/subscription/invoices, open course detail, proceed to purchase/checkout confirmation where test mode allows
- Failure path: submit malformed checkout with empty sku and quantity 0, expect 400/422, show recoverable checkout error
- User actions: tap Library tab, open Course Library, choose course, tap Buy/Add, move through checkout, inspect subscription
- Expected navigation: Home/Library tab -> CourseLibraryScreen -> CourseDetailScreen -> BuyCourseScreen -> CheckoutScreen -> OrderConfirmScreen or error
- Expected loading/empty/error states: loading library, no library courses yet, available to add, on robot now, library unavailable, checkout error
- Assertions: billing plans loads, invoices loads, subscription returns 200 or expected 404, malformed checkout is rejected
- Cleanup: do not create live purchases; local checkout fixture resets with test DB
- Test command: `npm run detox:test:ios -- --testNamePattern "opens module entry screens"` and local contract gate for billing endpoints
- Pass criteria: library never hangs on loading; purchase failure remains local and actionable; no real payment call occurs

Module: Robot Management
- Screens: MyRobotScreen, RobotStatusScreen, RobotBatteryScreen, RobotFirmwareScreen, RobotWifiScreen, MicTestScreen, SpeakerTestScreen, SupportScreen, OfflineHelpScreen, FactoryResetScreen
- Endpoints: GET /v1/devices/:deviceId, POST /v1/devices/heartbeat, GET /v1/devices/household/me, DELETE /v1/devices/:deviceId
- Test data setup: claimed robot, heartbeat token from claim flow, authenticated parent
- Happy path: send heartbeat, open My Robot, verify status/battery/firmware/Wi-Fi/mic test surfaces, deregister robot at end
- Failure path: get unknown robot UUID and expect 403/404; offline robot shows OfflineHelpScreen or Robot unavailable state with retry/help
- User actions: tap Check Robot or Devices tab, open My Robot, tap Microphone test, start mic test, inspect support/offline help
- Expected navigation: Devices tab -> MyRobotScreen -> RobotStatus/Battery/Firmware/Wifi/MicTest/SpeakerTest/Support
- Expected loading/empty/error states: robot unavailable, offline help, firmware check loading, mic listening, robot heard you, unknown robot error
- Assertions: heartbeat returns 202/204, device fetch returns 200, household list returns 200, delete returns 200, unknown robot is rejected
- Cleanup: DELETE /v1/devices/:deviceId after assertions; reset app route to HomeHub
- Test command: `SIMULATION_MODE=true npm run e2e:mobile:local`
- Pass criteria: robot management surfaces render after heartbeat; cleanup removes claimed test robot; retry path shows recoverable offline/unknown state

Module: Fallback + Recovery
- Screens: NetworkErrorScreen, AppErrorScreen, MicMissingScreen, VoiceFailedScreen, AudioRecoveryScreen, SafetyRedirectScreen, LessonResumeScreen, ReconnectingOverlay
- Endpoints: GET /v1/health, GET /v1/metrics/snapshot, GET /health on AI service, POST /v1/llm/chat retry target
- Test data setup: authenticated app state, local backend/AI, URL blacklist available for network fault injection
- Happy path: open fallback route, tap Try again, recover to attempt state, stop and return home
- Failure path: block local backend, open course route, expect offline/error fallback instead of hang; reset URL blacklist and retry
- User actions: tap Try again, Stop and go home, retry failed course/lesson load, resume lesson where available
- Expected navigation: failing feature route -> fallback modal/screen -> retry attempt -> HomeHub or previous safe route
- Expected loading/empty/error states: no internet connection, attempt 1 of 3, course catalog offline, courses unavailable, course refresh timed out, reconnecting overlay
- Assertions: backend health returns 200 when unblocked, AI health returns 200 and simulation mode, blocked backend shows fallback within 10 seconds, app remains alive after reload
- Cleanup: always call `device.setURLBlacklist([])`; re-enable Detox synchronization after modal retry tests
- Test command: `npm run detox:test:ios -- --testNamePattern "fallback|offline|module matrix"` and `SIMULATION_MODE=true node scripts/e2e-mobile.js --plan-json`
- Pass criteria: no indefinite loading; retry is visible and tappable; app returns to HomeHub; no backend worker/background errors after flow settle
