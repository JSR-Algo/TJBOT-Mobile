# TBOT Mobile UX Flow Spec

Date: 2026-05-14
Updated: 2026-07-28 (parent MVP production visibility)
System: sys-16 parent mobile application
Scope: auth, onboarding, home, course, lesson-session, course-library, purchase, progress, parent, device, robot-mgmt, fallback
Route sources: `src/navigation/mvpProductionRoutes.ts` (production allowlist),
feature `navigation.ts` files (registration metadata), and
`architecture/route-mapping.json` (generated per-route visibility)

## Global Rules

- Priority order: safety, clarity, delight, speed.
- Parent surfaces use parent language: control, trust, review, consent, settings.
- Child-facing lesson surfaces use warm child language, but parent authority stays visible through safe exits and parent-stop states.
- Touch targets are at least 44 pt on iOS and Android.
- CTAs use route constants only. No CTA may point to an unavailable route.
- Back behavior follows route map categories: auth blocked, onboarding linear, tab roots stable, stack back explicit, modal dismiss explicit.
- Required state vocabulary: loading, empty, offline, error, retry, timeout, cancel, unauthorized. Domains mark non-applicable states as "not entered here" and send to a valid fallback route when needed.
- The domain sections below distinguish production screens from retained hidden
  inventory. Registration does not imply production mounting: routes marked
  `productionVisible: false` are excluded from navigators and deep links. The
  production allowlist is owned by `src/navigation/mvpProductionRoutes.ts`.
- The protected tabs remain Home, Devices, Library, Progress, and Profile.

## Auth Flow

1. Production screen inventory: `SplashScreen`, `LoginScreen`.
2. Primary path: parent opens the app unauthenticated, sees `SplashScreen`, lands on `LoginScreen`, enters credentials, and the root gate sends them to `ChildProfileScreen` when onboarding is incomplete or `HomeHubScreen` when ready.
3. Edge paths: invalid credentials and request failures stay on `LoginScreen` with inline recovery; expired sessions return to `LoginScreen`.
4. Entry route: `SplashScreen`.
5. Exit route: `ChildProfileScreen` or `HomeHubScreen`, controlled by the auth/onboarding gate.
6. CTA map: splash timeout -> `LoginScreen`; "Log in" submits on `LoginScreen`; signup and password reset stay within `LoginScreen`.
7. Back behavior: auth blocked. Hardware back on `LoginScreen` does not reveal protected routes.
8. State matrix: loading shows inline button spinner; empty is form fields empty with disabled submit; error and retry remain on `LoginScreen`; unauthorized -> root auth reset.
9. Accessibility notes: labels for email/password fields, `button` role on submit, password visibility control has label, error copy announced with polite live region.
10. Acceptance tests: unauthenticated launch follows splash to login and never reaches protected tabs; failed login shows inline recovery; successful login exits to a valid root branch.
11. Open risks: none for route mounting; backend authentication behavior remains contract-owned.

## Onboarding Flow

1. Production screen inventory: `SplashScreen`, `LoginScreen`, `ChildProfileScreen`, `MicAskScreen`, `FirstLessonEntryScreen`. The marketing intro screens remain registered but are outside the production MVP.
2. Primary path: unauthenticated launch uses `SplashScreen` -> `LoginScreen`; after authentication, incomplete setup uses `ChildProfileScreen` -> `MicAskScreen` -> `FirstLessonEntryScreen`.
3. Edge paths: microphone permission denied routes to `MicMissingScreen`; network failure routes to `NetworkErrorScreen`; child profile save failure stays on `ChildProfileScreen` with retry; session entry failure routes to `VoiceFailedScreen`.
4. Entry route: `SplashScreen`.
5. Exit route: `FirstLessonEntryScreen`, then `SendToRobotScreen`.
6. CTA map: splash timeout -> `LoginScreen`; "Save child profile" -> `MicAskScreen`; "Allow microphone" -> `FirstLessonEntryScreen`; "Yes!" -> `SendToRobotScreen`.
7. Back behavior: linear onboarding. Back targets follow configured route targets where present; random jumps to protected routes are blocked until auth plus household readiness.
8. State matrix: loading on splash/profile save/permission check; empty on child profile fields; offline -> `NetworkErrorScreen`; error -> inline warm message or `AppErrorScreen`; retry -> current screen; timeout -> `NetworkErrorScreen` or `VoiceFailedScreen`; cancel on permission prompt routes to `MicMissingScreen`; unauthorized -> `LoginScreen`.
9. Accessibility notes: every step has one primary heading, one primary CTA, skip/later only where safe; permission rationale is read before OS dialog; child age/profile inputs support screen readers.
10. Acceptance tests: onboarding cannot bypass auth; marketing intro routes are not mounted or deep-linked; microphone denial has recovery; first lesson CTA lands on `SendToRobotScreen`.
11. Open risks: COPPA-specific onboarding route remains absent until legal-reviewed flow returns.

## Home Flow

1. Screen inventory: `HomeHubScreen`.
2. Primary path: parent sees today status, active child/device summary, next lesson, and safe shortcuts.
3. Edge paths: no device sends to device setup; no current lesson sends to library/course; microphone issue sends to fallback; offline keeps cached safe status.
4. Entry route: `HomeHubScreen`.
5. Exit route: `CourseLibraryScreen`, `ParentHistoryScreen`, `TodayProgressScreen`, `DeviceOverviewScreen`, `ParentSummaryScreen`, `ParentSettingsScreen`, or a state-specific production destination.
6. CTA map: "Course" -> `CourseLibraryScreen`; "Review" -> `ParentHistoryScreen`; "Progress" -> `TodayProgressScreen`; "Robot" -> `DeviceOverviewScreen`; parent avatar -> `ParentSummaryScreen`; settings -> `ParentSettingsScreen`.
7. Back behavior: tab root stable. Back from `HomeHubScreen` does not pop protected history; tab reselection returns here.
8. State matrix: loading uses skeleton cards; empty means no device/course and offers setup; offline shows cached data plus retry; error sends to `AppErrorScreen` if unrecoverable; retry is inline; timeout sends to `NetworkErrorScreen`; cancel is not entered here; unauthorized -> `LoginScreen`.
9. Accessibility notes: status chips have text equivalents; robot status is not color-only; start button is 44 pt and first in focus order.
10. Acceptance tests: tab root remains stable; every card CTA points to route constants; offline home does not hide safety status; protected data disappears on unauthorized reset.
11. Open risks: home has only one route, so complex drilldowns must use other domain routes.

## Course Flow

1. Production screen inventory: `DailyMissionScreen`. The duplicate course hierarchy and review prototype remain registered but production-hidden.
2. Primary path: parents browse and select content through the Library tab; daily-mission entry remains available where the home state selects it.
3. Edge paths: unavailable or empty course content returns to `CourseLibraryScreen`; failures use production fallback routes.
4. Entry route: `DailyMissionScreen` or `CourseLibraryScreen`.
5. Exit route: `HomeHubScreen` or `CourseLibraryScreen`.
6. CTA map: "Course" -> `CourseLibraryScreen`; daily-mission completion returns to the production home/library flow.
7. Back behavior: the daily mission backs to `HomeHubScreen`; production never enters the hidden hierarchy.
8. State matrix: loading and empty states stay within the daily-mission or Library surfaces; offline/error/timeout use production fallback routes; unauthorized -> `LoginScreen`.
9. Accessibility notes: progress is numeric and textual; completion is not color-only.
10. Acceptance tests: the hidden hierarchy is not mounted or deep-linked; Library remains the production course-browse entry.
11. Open risks: route params remain optional on hidden inventory and must be revalidated before any route is restored.

## Lesson Session Flow

1. Registered inventory: the lesson-session screens remain in source for future contract work, but every route is production-hidden.
2. Production path: course assignment and robot dispatch use `SendToRobotScreen`, `RobotReadyScreen`, `RunningScreen`, and `CompanionScreen`; the mobile app does not mount the legacy lesson loop.
3. Edge paths: production reconnect uses `ReconnectingOverlay`; other failures use the mounted fallback routes.
4. Entry route: none for the hidden lesson-session inventory.
5. Exit route: not applicable until the backend contract is restored.
6. CTA map: no production CTA may target a lesson-session route.
7. Back behavior: not mounted in production.
8. State matrix: production status and recovery are owned by the course-library dispatch surfaces and fallback routes.
9. Accessibility notes: retained screens must be re-reviewed before restoration.
10. Acceptance tests: lesson-session routes remain unmounted, absent from deep links, and unreachable from production CTAs.
11. Open risks: restoring the loop requires the backend contract plus renewed persona, safety, and accessibility review.

## Course Library Flow

1. Production screen inventory: `CourseLibraryScreen`, `CourseDetailScreen`, `NeedsSyncScreen`, `SendToRobotScreen`, `RobotReadyScreen`, `RunningScreen`, `CompanionScreen`.
2. Primary path: `CourseLibraryScreen` -> `CourseDetailScreen` -> `SendToRobotScreen` -> `RobotReadyScreen` -> `RunningScreen`.
3. Edge paths: a disconnected robot keeps the parent on course detail with connection recovery; a sync retry that succeeds continues to `SendToRobotScreen`.
4. Entry route: `CourseLibraryScreen`.
5. Exit route: `RunningScreen`, `DeviceHomeScreen`, or `HomeHubScreen`.
6. CTA map: "Open course" -> `CourseDetailScreen`; the available course action -> `SendToRobotScreen`; "Robot ready" -> `RobotReadyScreen`; "Start" -> `RunningScreen`; "Companion" -> `CompanionScreen`.
7. Back behavior: library tab root stable; detail stacks back to library; send flow backs through device readiness screens.
8. State matrix: loading grid skeleton; empty library suggests available courses or sync; offline -> `NeedsSyncScreen`; error -> inline then `AppErrorScreen`; retry -> `NeedsSyncScreen`; timeout -> `NeedsSyncScreen`; cancel returns to a mounted parent surface; unauthorized -> `LoginScreen`.
9. Accessibility notes: course cards expose title, level, locked state, and price; lock state is verbal; modal buttons are 44 pt.
10. Acceptance tests: commerce routes stay unmounted; course detail and successful sync continue to dispatch; send flow cannot skip robot ready; tab root remains stable.
11. Open risks: entitlement behavior must be restored deliberately before any commerce route becomes production-visible.

## Purchase Flow

1. Registered inventory: the purchase and subscription screens remain in source but are outside the production MVP.
2. Primary path: none; production course selection continues directly to robot dispatch.
3. Edge paths: no production CTA may enter checkout, subscription, shipping, or activation routes.
4. Entry route: none in production.
5. Exit route: not applicable while hidden.
6. CTA map: none in production.
7. Back behavior: not mounted in production.
8. State matrix: not applicable until commerce is restored.
9. Accessibility notes: retained financial screens require a fresh accessibility and legal review before restoration.
10. Acceptance tests: purchase routes remain unmounted, absent from deep links, and unreachable from visible routes.
11. Open risks: restoration requires payment-provider state, entitlement rules, and legal/commercial approval.

## Progress Flow

1. Production screen inventory: `TodayProgressScreen`, `LessonSummaryScreen`.
2. Primary path: parent opens the Progress tab for today's overview or opens a lesson summary.
3. Edge paths: no lessons yet, summary not ready, offline cached progress, stale review queue.
4. Entry route: `TodayProgressScreen` or `LessonSummaryScreen`.
5. Exit route: `HomeHubScreen`, `SendToRobotScreen`, or `ParentSummaryScreen`.
6. CTA map: "Lesson summary" -> `LessonSummaryScreen`; "Keep going" -> `SendToRobotScreen`; "Stop for today" -> `HomeHubScreen`.
7. Back behavior: Progress tab root stable; summary entry provides explicit dispatch/home exits.
8. State matrix: loading progress skeleton; empty shows first-lesson CTA; offline shows cached progress timestamp; error inline; retry refreshes progress; timeout -> `NetworkErrorScreen`; cancel is not entered here; unauthorized -> `LoginScreen`.
9. Accessibility notes: charts have textual summaries and progress deltas are not color-only.
10. Acceptance tests: extra reward/review routes stay unmounted; cached offline timestamp is visible; summary route handles missing `lessonId`; its CTAs target mounted routes.
11. Open risks: progress source must avoid exposing child-sensitive transcript details beyond parent summary policy.

## Parent Flow

1. Production screen inventory: `ParentSummaryScreen`, `ParentGateScreen`, `ParentTodayScreen`, `ParentHistoryScreen`, `ParentSessionReportScreen`, `ParentSafetyScreen`, `ParentSettingsScreen`, `ParentAccountPrivacyScreen`, `ParentLockedOutScreen`, `AddChildScreen`.
2. Primary path: parent tab opens `ParentSummaryScreen`; sensitive actions pass through `ParentGateScreen`; parent reviews today, history, safety, settings, and account privacy. The rewards/leaderboard row is outside the production MVP.
3. Edge paths: failed gate, lockout, expired auth, empty summaries, offline cached summaries.
4. Entry route: `ParentSummaryScreen` or `ParentGateScreen`.
5. Exit route: `ParentTodayScreen`, `ParentHistoryScreen`, `ParentSessionReportScreen`, `ParentSafetyScreen`, `ParentSettingsScreen`, `ParentAccountPrivacyScreen`, `ParentLockedOutScreen`, `AddChildScreen`, or `HomeHubScreen`.
6. CTA map: "Review today" -> `ParentTodayScreen`; "History" -> `ParentHistoryScreen`; "Safety" -> `ParentSafetyScreen`; "Settings" -> `ParentSettingsScreen`; "Robot leaderboard privacy" -> `ParentAccountPrivacyScreen`; "Unlock parent area" -> `ParentGateScreen`; "Back home" -> `HomeHubScreen`; "Help" -> `HelpFaqScreen`.
7. Back behavior: profile tab root stable; gate failure can route to `ParentLockedOutScreen`; locked-out backs to `HomeHubScreen`; child should not navigate parent stacks.
8. State matrix: loading summary skeleton; empty says "No summary yet" and offers home; offline shows last updated time; error inline or `AppErrorScreen`; retry refreshes summaries; timeout -> `ParentLockedOutScreen` for gate timeout or `NetworkErrorScreen` for data; cancel exits gate to `HomeHubScreen`; unauthorized -> `ParentGateScreen` or `LoginScreen` for token invalid.
9. Accessibility notes: gate inputs are labeled; safety items avoid alarmist copy; summaries use plain language and avoid raw transcript exposure.
10. Acceptance tests: parent gate blocks sensitive routes; lockout cannot be bypassed with back; no child persona copy appears in parent settings; summaries work empty/offline.
11. Open risks: legal/privacy review needed for exact safety-summary copy and retention wording.

## Device Flow

1. Production screen inventory: `DeviceHomeScreen`, `DeviceOverviewScreen`, `PairAddScreen`, `PairIntroScreen`, `PairSearchScreen`, `PairFoundScreen`, `PairQrScanScreen`, `PairCodeScreen`, `PairWifiScreen`, `PairWifiPasswordScreen`, `PairConnectingScreen`, `PairSuccessScreen`, `PairRenameScreen`, `PairChildProfileScreen`, `PairFirstLessonScreen`, `PairOfflineScreen`, `PairFailedScreen`, `DeviceLostScreen`.
2. Primary path: `DeviceHomeScreen` -> `DeviceOverviewScreen` -> `PairAddScreen` -> `PairIntroScreen` -> `PairSearchScreen` -> `PairFoundScreen` -> `PairCodeScreen` -> `PairWifiScreen` -> `PairWifiPasswordScreen` -> `PairConnectingScreen` -> `PairSuccessScreen` -> `PairRenameScreen` -> `PairFirstLessonScreen`.
3. Edge paths: no Bluetooth permission, no robot found, wrong code, Wi-Fi failure, pair timeout, offline robot, or lost device.
4. Entry route: `DeviceHomeScreen` or `DeviceOverviewScreen`.
5. Exit route: `PairFirstLessonScreen`, `HomeHubScreen`, `DeviceHomeScreen`, `DeviceLostScreen`, or `PairFailedScreen`.
6. CTA map: the Today lesson row -> `CourseLibraryScreen`; "Add robot" -> `PairAddScreen`; "Start pairing" -> `PairIntroScreen`; "Search" -> `PairSearchScreen`; "This robot" -> `PairFoundScreen`; QR/manual code -> `PairQrScanScreen` or `PairCodeScreen`; "Choose Wi-Fi" -> `PairWifiScreen`; "Continue" -> `PairWifiPasswordScreen`; "Connect" -> `PairConnectingScreen`; "Name robot" -> `PairRenameScreen`; "First lesson" -> `PairFirstLessonScreen`; "Retry" -> `PairSearchScreen`; "Help offline" -> `PairOfflineScreen`.
7. Back behavior: stack back with explicit configured targets. Pairing retry group returns to safe earlier steps. No BLE write is repeated by back alone.
8. State matrix: loading search/connect; empty no device found -> retry/help; offline -> `PairOfflineScreen`; error -> `PairFailedScreen`; retry -> `PairSearchScreen`; timeout -> `PairFailedScreen` or `DeviceLostScreen`; cancel exits to `DeviceHomeScreen`; unauthorized -> `LoginScreen`.
9. Accessibility notes: Bluetooth/Wi-Fi permission text is explicit; code entry supports numeric keypad and screen reader; progress text mirrors spinner state.
10. Acceptance tests: diagnostics/firmware/LCD routes stay unmounted; pairing can recover from not found; timeout lands on a valid failure screen; back never resubmits credentials; success reaches the first-lesson route.
11. Open risks: BLE protocol details are sys-18 owned and must not be changed by UX route work.

## Robot Management Flow

1. Production screen inventory: `SupportScreen`. The detailed robot-management and destructive-action screens remain registered but production-hidden.
2. Primary path: a mounted device/help surface opens `SupportScreen`.
3. Edge paths: support form completion or cancellation returns safely to the device home.
4. Entry route: `SupportScreen`.
5. Exit route: `DeviceHomeScreen`.
6. CTA map: "Send to support", "Cancel", and back -> `DeviceHomeScreen`.
7. Back behavior: support returns to `DeviceHomeScreen`; production never enters the hidden management stack.
8. State matrix: support remains local to the mounted help surface; unavailable device data returns to `DeviceHomeScreen`; unauthorized -> `LoginScreen`.
9. Accessibility notes: support controls remain large enough for one-handed use.
10. Acceptance tests: hidden management routes stay unmounted; every Support exit targets `DeviceHomeScreen`.
11. Open risks: diagnostics, firmware, and factory reset require backend/firmware confirmation before restoration.

## Fallback Flow

1. Production screen inventory: `NetworkErrorScreen`, `AppErrorScreen`, `MicMissingScreen`, `VoiceFailedScreen`, `AudioRecoveryScreen`, `SafetyRedirectScreen`, `HelpFaqScreen`, `ReconnectingOverlay`.
2. Primary path: fallback screens catch recoverable failures and return the parent/child to safe prior work.
3. Edge paths: network down, app crash boundary, microphone missing, voice failed, audio recovery, safety redirect, help, and reconnect overlay.
4. Entry route: any domain can enter fallback; specific routes are listed above.
5. Exit route: `HomeHubScreen`, `MicMissingScreen`, `ParentSummaryScreen`, previous route when safe, or `LoginScreen` on unauthorized.
6. CTA map: "Try again" -> source retry or `NetworkErrorScreen`; "Audio help" -> `AudioRecoveryScreen`; "Home" -> `HomeHubScreen`; "Parent help" -> `ParentGateScreen`; "FAQ" -> `HelpFaqScreen`; "Close" dismisses `ReconnectingOverlay`.
7. Back behavior: fallback entries with configured back targets return to safe homes; overlay modal dismiss is explicit; safety redirect does not back into unsafe content.
8. State matrix: loading only in `ReconnectingOverlay`; empty not entered; offline -> `NetworkErrorScreen`; error -> appropriate fallback; retry -> source retry; timeout -> `NetworkErrorScreen`; cancel -> safe home or prior allowed screen; unauthorized -> `LoginScreen`.
9. Accessibility notes: error copy names the next safe action, not technical cause; overlays trap focus; safety redirect is calm and does not expose scary detail.
10. Acceptance tests: hidden kid-settings/lesson-resume routes stay unmounted; every production fallback has an exit route; reconnect overlay can close; safety redirect cannot resume blocked content; mic recovery returns to a valid route.
11. Open risks: global error boundary must avoid swallowing errors silently; Sentry tagging should include feature and screen.

## Cross-Flow Acceptance Tests

1. Route validity: every production CTA route named in this spec exists in `ROUTES`, is present in `MVP_PRODUCTION_ROUTE_NAMES`, and is mounted.
2. Back behavior: auth root blocks protected back, onboarding stays linear, tab roots remain stable, and mounted stack/modal routes return to production-visible targets.
3. Persona boundary: parent-only routes never use child encouragement copy; child lesson screens never expose parent analytics or controls without gate.
4. State coverage: each domain documents loading, empty, offline, error, retry, timeout, cancel, unauthorized.
5. Safety copy: safety/fallback/parent screens use calm language and never imply blame.
6. Accessibility: all interactive controls are at least 44 pt and expose role/label/hint where needed.
7. Visibility: hidden routes are absent from mounted navigators and deep links, and visible routes never navigate into them.

## Risks Before Expanding the MVP

1. Legal-reviewed COPPA onboarding routes are absent by design.
2. Several route params are optional; restored screens must define behavior for missing IDs.
3. Purchase provider and BLE protocol states depend on external systems and cannot be invented in mobile UX.
4. Any restored route must be added deliberately to the production allowlist and rechecked for visible-to-hidden edges.
