# TBOT Mobile UX Flow Spec

Date: 2026-05-14
System: sys-16 parent mobile application
Scope: auth, onboarding, home, course, lesson-session, course-library, purchase, progress, parent, device, robot-mgmt, fallback
Route source: `src/navigation/routes.ts` and feature `navigation.ts` files

## Global Rules

- Priority order: safety, clarity, delight, speed.
- Parent surfaces use parent language: control, trust, review, consent, settings.
- Child-facing lesson surfaces use warm child language, but parent authority stays visible through safe exits and parent-stop states.
- Touch targets are at least 44 pt on iOS and Android.
- CTAs use route constants only. No CTA may point to an unavailable route.
- Back behavior follows route map categories: auth blocked, onboarding linear, tab roots stable, stack back explicit, modal dismiss explicit.
- Required state vocabulary: loading, empty, offline, error, retry, timeout, cancel, unauthorized. Domains mark non-applicable states as "not entered here" and send to a valid fallback route when needed.

## Auth Flow

1. Screen inventory: `LoginScreen`, `LoginErrorScreen`.
2. Primary path: parent opens app unauthenticated, lands on `LoginScreen`, enters credentials, succeeds, and root gate sends them to `SplashScreen` when onboarding is incomplete or `HomeHubScreen` when ready.
3. Edge paths: invalid credentials show `LoginErrorScreen`; network failure can route to `NetworkErrorScreen`; expired session returns to `LoginScreen`; repeated failed auth stays calm and offers help.
4. Entry route: `LoginScreen`.
5. Exit route: `SplashScreen` or `HomeHubScreen`, controlled by auth/onboarding gate.
6. CTA map: "Log in" submits on `LoginScreen`; "Try again" -> `LoginScreen`; "Get help" -> `HelpFaqScreen`; "Use a different account" -> `LoginScreen`.
7. Back behavior: auth blocked. Hardware back on `LoginScreen` does not reveal protected routes. `LoginErrorScreen` back target is `LoginScreen`.
8. State matrix: loading shows inline button spinner; empty is form fields empty with disabled submit; offline -> `NetworkErrorScreen`; error -> `LoginErrorScreen`; retry -> `LoginScreen`; timeout -> `NetworkErrorScreen`; cancel is not entered here; unauthorized -> `LoginErrorScreen` or root auth reset.
9. Accessibility notes: labels for email/password fields, `button` role on submit, password visibility control has label, error copy announced with polite live region.
10. Acceptance tests: unauthenticated launch never reaches protected tabs; failed login shows retry path; successful login exits to a valid root branch; back from error returns to login.
11. Open risks: signup and forgot-password routes are not present in current route constants, so spec cannot assign CTAs to them without route work.

## Onboarding Flow

1. Screen inventory: `SplashScreen`, `WelcomeScreen`, `IntroListenScreen`, `IntroSpeakScreen`, `IntroRetryScreen`, `IntroCelebrateScreen`, `TrustScreen`, `MicAskScreen`, `ChildProfileScreen`, `FirstLessonEntryScreen`.
2. Primary path: `SplashScreen` -> `WelcomeScreen` -> `IntroListenScreen` -> `IntroSpeakScreen` -> `IntroRetryScreen` -> `IntroCelebrateScreen` -> `TrustScreen` -> `MicAskScreen` -> `ChildProfileScreen` -> `FirstLessonEntryScreen`.
3. Edge paths: microphone permission denied routes to `MicMissingScreen`; network failure routes to `NetworkErrorScreen`; child profile save failure stays on `ChildProfileScreen` with retry; session entry failure routes to `VoiceFailedScreen`.
4. Entry route: `SplashScreen`.
5. Exit route: `FirstLessonEntryScreen`, then `ConnectingScreen` or `HomeHubScreen` depending chosen CTA.
6. CTA map: "Start" -> `WelcomeScreen`; "Listen" -> `IntroListenScreen`; "Try speaking" -> `IntroSpeakScreen`; "Try again" -> `IntroRetryScreen`; "Looks good" -> `IntroCelebrateScreen`; "How TBOT stays safe" -> `TrustScreen`; "Allow microphone" -> OS permission then `ChildProfileScreen`; "Save child profile" -> `FirstLessonEntryScreen`; "Start first lesson" -> `ConnectingScreen`; "Later" -> `HomeHubScreen`.
7. Back behavior: linear onboarding. Back targets follow configured route targets where present; random jumps to protected routes are blocked until auth plus household readiness.
8. State matrix: loading on splash/profile save/permission check; empty on child profile fields; offline -> `NetworkErrorScreen`; error -> inline warm message or `AppErrorScreen`; retry -> current screen; timeout -> `NetworkErrorScreen` or `VoiceFailedScreen`; cancel on permission prompt routes to `MicMissingScreen`; unauthorized -> `LoginScreen`.
9. Accessibility notes: every step has one primary heading, one primary CTA, skip/later only where safe; permission rationale is read before OS dialog; child age/profile inputs support screen readers.
10. Acceptance tests: onboarding cannot bypass auth; sequence proceeds linearly; microphone denial has recovery; first lesson CTA lands on `ConnectingScreen`; later CTA lands on `HomeHubScreen`.
11. Open risks: COPPA-specific onboarding route is intentionally absent until legal-reviewed flow returns.

## Home Flow

1. Screen inventory: `HomeHubScreen`.
2. Primary path: parent sees today status, active child/device summary, next lesson, and safe shortcuts.
3. Edge paths: no device sends to device setup; no current lesson sends to library/course; microphone issue sends to fallback; offline keeps cached safe status.
4. Entry route: `HomeHubScreen`.
5. Exit route: `CourseLibraryScreen`, `DeviceHomeScreen`, `ParentSummaryScreen`, `ConnectingScreen`, or `NetworkErrorScreen`.
6. CTA map: "Start lesson" -> `ConnectingScreen`; "Choose course" -> `CourseLibraryScreen`; "Set up robot" -> `DeviceHomeScreen`; "Review summary" -> `ParentSummaryScreen`; "Fix microphone" -> `MicMissingScreen`; "Retry connection" -> `NetworkErrorScreen`.
7. Back behavior: tab root stable. Back from `HomeHubScreen` does not pop protected history; tab reselection returns here.
8. State matrix: loading uses skeleton cards; empty means no device/course and offers setup; offline shows cached data plus retry; error sends to `AppErrorScreen` if unrecoverable; retry is inline; timeout sends to `NetworkErrorScreen`; cancel is not entered here; unauthorized -> `LoginScreen`.
9. Accessibility notes: status chips have text equivalents; robot status is not color-only; start button is 44 pt and first in focus order.
10. Acceptance tests: tab root remains stable; every card CTA points to route constants; offline home does not hide safety status; protected data disappears on unauthorized reset.
11. Open risks: home has only one route, so complex drilldowns must use other domain routes.

## Course Flow

1. Screen inventory: `CourseScreen`, `LevelScreen`, `UnitScreen`, `LessonListScreen`, `LessonDetailScreen`, `ReviewEntryScreen`, `DailyMissionScreen`.
2. Primary path: `CourseScreen` -> `LevelScreen` -> `UnitScreen` -> `LessonListScreen` -> `LessonDetailScreen` -> `ConnectingScreen`.
3. Edge paths: daily mission can enter from home; review can enter from home/progress; locked course should defer to course-library/purchase; empty unit shows library CTA.
4. Entry route: `CourseScreen`, `ReviewEntryScreen`, or `DailyMissionScreen`.
5. Exit route: `LessonDetailScreen`, `ConnectingScreen`, `HomeHubScreen`, or `CourseLibraryScreen`.
6. CTA map: "Open level" -> `LevelScreen`; "Open unit" -> `UnitScreen`; "View lessons" -> `LessonListScreen`; "Lesson details" -> `LessonDetailScreen`; "Start" -> `ConnectingScreen`; "Review today" -> `ReviewEntryScreen`; "Daily mission" -> `DailyMissionScreen`; "Back home" -> `HomeHubScreen`.
7. Back behavior: stack back. Configured back targets are `LevelScreen` -> `CourseScreen`, `UnitScreen` -> `LevelScreen`, `LessonListScreen` -> `UnitScreen`, `LessonDetailScreen` -> `UnitScreen`, review/daily -> `HomeHubScreen`.
8. State matrix: loading lists use skeleton rows; empty course/unit offers `CourseLibraryScreen`; offline allows viewing cached course and blocks start with retry; error inline then `AppErrorScreen`; retry refreshes course data; timeout -> `NetworkErrorScreen`; cancel is only start cancellation before `ConnectingScreen`; unauthorized -> `LoginScreen`.
9. Accessibility notes: progress is numeric and textual; lesson rows are buttons with lesson name and state; completion is not color-only.
10. Acceptance tests: course hierarchy back targets match config; start CTA lands on `ConnectingScreen`; empty unit gives a valid library route; offline blocks unsafe start.
11. Open risks: route params are optional, so tests must cover missing `courseId`, `unitId`, and `lessonId`.

## Lesson Session Flow

1. Screen inventory: `ConnectingScreen`, `GreetingScreen`, `LessonReadyScreen`, `RobotListeningScreen`, `UserSpeakingScreen`, `RobotSpeakingScreen`, `ThinkingScreen`, `ActivityIntroScreen`, `ActivityDoneScreen`, `SuccessScreen`, `LessonDoneScreen`, `ExitConfirmScreen`, `RetryScreen`, `SilenceScreen`, `BargeinScreen`, `GentleScreen`, `OfftopicScreen`, `SafetyScreen`, `CostCappedScreen`, `ParentStoppedScreen`, `TimedOutScreen`, `AudioErrorScreen`, `AbandonedDisconnectScreen`, `ReconnectingScreen`.
2. Primary path: `ConnectingScreen` -> `GreetingScreen` -> `LessonReadyScreen` -> listening/speaking/thinking loop -> activity screens -> `SuccessScreen` -> `LessonDoneScreen`.
3. Edge paths: silence, barge-in, off-topic, safety redirect, cost cap, parent stop, timeout, audio error, reconnect, abandoned disconnect.
4. Entry route: `ConnectingScreen`, `LessonResumeScreen`, or lesson/course CTAs.
5. Exit route: `LessonDoneScreen`, `HomeHubScreen`, `ParentSummaryScreen`, or fallback route.
6. CTA map: "I am ready" -> `RobotListeningScreen`; "Pause" -> `ExitConfirmScreen`; "Keep going" -> prior lesson loop screen; "End lesson" -> `LessonDoneScreen`; "Try again" -> `RetryScreen` or `ReconnectingScreen`; "Ask parent" -> `ParentGateScreen`; "Home" -> `HomeHubScreen`; "Summary" -> `LessonSummaryScreen`.
7. Back behavior: lesson loop uses explicit exit confirm, not accidental pop. `ExitConfirmScreen` owns cancel/end choice. Error states use stack back only when safe.
8. State matrix: loading -> `ConnectingScreen`/`ThinkingScreen`; empty is not entered during live session; offline -> `ReconnectingScreen`; error -> `AudioErrorScreen` or `SafetyScreen`; retry -> `RetryScreen`; timeout -> `TimedOutScreen`; cancel -> `ExitConfirmScreen`; unauthorized -> `ParentStoppedScreen` or `LoginScreen` if token invalid.
9. Accessibility notes: audio state has visual text; large controls are reachable one-handed; child copy is short and reassuring; parent-only controls are gated.
10. Acceptance tests: accidental back opens exit confirm; safety path never resumes unsafe content; reconnect can retry and timeout; lesson completion reaches summary/progress route.
11. Open risks: child and parent personas coexist in this domain; copy review must enforce persona boundary per screen.

## Course Library Flow

1. Screen inventory: `CourseLibraryScreen`, `CourseDetailScreen`, `BuyCourseScreen`, `CourseAddedScreen`, `CourseCompleteScreen`, `CourseLockedScreen`, `NeedsSyncScreen`, `SendToRobotScreen`, `RobotReadyScreen`, `RunningScreen`, `CompanionScreen`, `UnlockConfirmScreen`.
2. Primary path: `CourseLibraryScreen` -> `CourseDetailScreen` -> `CourseAddedScreen` -> `SendToRobotScreen` -> `RobotReadyScreen` -> `RunningScreen`.
3. Edge paths: locked course, purchase needed, robot needs sync, robot not ready, unlock confirmation modal.
4. Entry route: `CourseLibraryScreen`.
5. Exit route: `RunningScreen`, `DeviceHomeScreen`, `PurchaseIntroScreen`, or `HomeHubScreen`.
6. CTA map: "Open course" -> `CourseDetailScreen`; "Add course" -> `CourseAddedScreen`; "Buy" -> `BuyCourseScreen`; "Unlock" -> `UnlockConfirmScreen`; "Send to robot" -> `SendToRobotScreen`; "Robot ready" -> `RobotReadyScreen`; "Start" -> `RunningScreen`; "Companion" -> `CompanionScreen`.
7. Back behavior: library tab root stable; detail stacks back to library; unlock modal dismisses to `BuyCourseScreen`; send flow backs through device readiness screens.
8. State matrix: loading grid skeleton; empty library suggests available courses or sync; offline -> `NeedsSyncScreen`; error -> inline then `AppErrorScreen`; retry -> `NeedsSyncScreen`; timeout -> `NeedsSyncScreen`; cancel -> modal dismiss from `UnlockConfirmScreen`; unauthorized -> `CourseLockedScreen`.
9. Accessibility notes: course cards expose title, level, locked state, and price; lock state is verbal; modal buttons are 44 pt.
10. Acceptance tests: locked course never starts lesson; modal dismiss returns to buy screen; send flow cannot skip robot ready; tab root remains stable.
11. Open risks: purchase ownership state must be sourced from backend; UI must avoid implying content is free before entitlement confirms.

## Purchase Flow

1. Screen inventory: `PurchaseIntroScreen`, `HowItWorksScreen`, `IncludedScreen`, `BundleScreen`, `SubscriptionsScreen`, `PrivacyScreen`, `CheckoutScreen`, `OrderConfirmScreen`, `ShippingScreen`, `ArrivedScreen`, `ActivateScreen`, `FirstCourseScreen`.
2. Primary path: `PurchaseIntroScreen` -> `HowItWorksScreen` -> `IncludedScreen` -> `BundleScreen` -> `SubscriptionsScreen` -> `PrivacyScreen` -> `CheckoutScreen` -> `OrderConfirmScreen` -> `ShippingScreen` -> `ArrivedScreen` -> `ActivateScreen` -> `FirstCourseScreen`.
3. Edge paths: cancel purchase, checkout timeout, payment failure, unavailable subscription, privacy review, shipping delay.
4. Entry route: `PurchaseIntroScreen`.
5. Exit route: `DeviceHomeScreen`, `OrderConfirmScreen`, `FirstCourseScreen`, or `HomeHubScreen`.
6. CTA map: "See how it works" -> `HowItWorksScreen`; "What is included" -> `IncludedScreen`; "Choose bundle" -> `BundleScreen`; "Choose plan" -> `SubscriptionsScreen`; "Privacy details" -> `PrivacyScreen`; "Checkout" -> `CheckoutScreen`; "Track order" -> `ShippingScreen`; "Activate" -> `ActivateScreen`; "Pick first course" -> `FirstCourseScreen`; "Close" -> `DeviceHomeScreen`.
7. Back behavior: modal stack back. Each purchase screen has explicit back target; dismiss is clear and never hides cost or commitment.
8. State matrix: loading on checkout/order; empty means no available plan and offers close; offline blocks checkout with retry; error shows recoverable payment message; retry reattempts checkout; timeout stays on `CheckoutScreen`; cancel dismisses modal; unauthorized -> `LoginScreen`.
9. Accessibility notes: price, renewal, trial, and cancel terms are screen-reader visible; no prechecked upsell; destructive/financial CTAs require explicit label.
10. Acceptance tests: price review appears before checkout; cancel route exits modal; timeout does not double-submit payment; first course CTA points to valid route.
11. Open risks: payment provider state is outside sys-16; final copy requires legal/commercial review.

## Progress Flow

1. Screen inventory: `TodayProgressScreen`, `WordsPracticedScreen`, `LessonSummaryScreen`, `ReviewNeededScreen`, `CelebrationScreen`.
2. Primary path: parent opens progress tab, reviews today, drills into words, lesson summary, review needs, and celebration.
3. Edge paths: no lessons yet, summary not ready, offline cached progress, stale review queue.
4. Entry route: `TodayProgressScreen`, `LessonSummaryScreen`, or `ReviewNeededScreen`.
5. Exit route: `HomeHubScreen`, `CourseScreen`, `ConnectingScreen`, or `ParentSummaryScreen`.
6. CTA map: "Words practiced" -> `WordsPracticedScreen`; "Lesson summary" -> `LessonSummaryScreen`; "Review needed" -> `ReviewNeededScreen`; "Celebrate" -> `CelebrationScreen`; "Practice now" -> `ConnectingScreen`; "Back home" -> `HomeHubScreen`.
7. Back behavior: progress tab root stable; words backs to today; review can back to home; summary entry is stack-entry and must provide explicit home/progress exit.
8. State matrix: loading progress skeleton; empty shows first-lesson CTA; offline shows cached progress timestamp; error inline; retry refreshes progress; timeout -> `NetworkErrorScreen`; cancel is not entered here; unauthorized -> `LoginScreen`.
9. Accessibility notes: charts have textual summaries; celebration animation respects reduced motion; progress deltas are not color-only.
10. Acceptance tests: empty progress offers valid first-lesson path; cached offline timestamp is visible; summary route handles missing `lessonId`; back returns to correct route.
11. Open risks: progress source must avoid exposing child-sensitive transcript details beyond parent summary policy.

## Parent Flow

1. Screen inventory: `ParentSummaryScreen`, `ParentGateScreen`, `ParentTodayScreen`, `ParentHistoryScreen`, `ParentSafetyScreen`, `ParentSettingsScreen`, `ParentLockedOutScreen`.
2. Primary path: parent tab opens `ParentSummaryScreen`; sensitive actions pass through `ParentGateScreen`; parent reviews today/history/safety/settings.
3. Edge paths: failed gate, lockout, expired auth, empty summaries, offline cached summaries.
4. Entry route: `ParentSummaryScreen` or `ParentGateScreen`.
5. Exit route: `ParentTodayScreen`, `ParentHistoryScreen`, `ParentSafetyScreen`, `ParentSettingsScreen`, `ParentLockedOutScreen`, `HomeHubScreen`.
6. CTA map: "Review today" -> `ParentTodayScreen`; "History" -> `ParentHistoryScreen`; "Safety" -> `ParentSafetyScreen`; "Settings" -> `ParentSettingsScreen`; "Unlock parent area" -> `ParentGateScreen`; "Back home" -> `HomeHubScreen`; "Help" -> `HelpFaqScreen`.
7. Back behavior: profile tab root stable; gate failure can route to `ParentLockedOutScreen`; locked-out backs to `HomeHubScreen`; child should not navigate parent stacks.
8. State matrix: loading summary skeleton; empty says "No summary yet" and offers home; offline shows last updated time; error inline or `AppErrorScreen`; retry refreshes summaries; timeout -> `ParentLockedOutScreen` for gate timeout or `NetworkErrorScreen` for data; cancel exits gate to `HomeHubScreen`; unauthorized -> `ParentGateScreen` or `LoginScreen` for token invalid.
9. Accessibility notes: gate inputs are labeled; safety items avoid alarmist copy; summaries use plain language and avoid raw transcript exposure.
10. Acceptance tests: parent gate blocks sensitive routes; lockout cannot be bypassed with back; no child persona copy appears in parent settings; summaries work empty/offline.
11. Open risks: legal/privacy review needed for exact safety-summary copy and retention wording.

## Device Flow

1. Screen inventory: `DeviceHomeScreen`, `DeviceOverviewScreen`, `PairAddScreen`, `PairIntroScreen`, `PairSearchScreen`, `PairFoundScreen`, `PairCodeScreen`, `PairWifiScreen`, `PairWifiPasswordScreen`, `PairConnectingScreen`, `PairSuccessScreen`, `PairRenameScreen`, `PairFirstLessonScreen`, `PairOfflineScreen`, `PairFailedScreen`, `DeviceFirmwareScreen`, `DeviceSessionScreen`, `DeviceLostScreen`, `LCDLessonTurnScreen`, `LCDLibraryScreen`.
2. Primary path: `DeviceHomeScreen` -> `DeviceOverviewScreen` -> `PairAddScreen` -> `PairIntroScreen` -> `PairSearchScreen` -> `PairFoundScreen` -> `PairCodeScreen` -> `PairWifiScreen` -> `PairWifiPasswordScreen` -> `PairConnectingScreen` -> `PairSuccessScreen` -> `PairRenameScreen` -> `PairFirstLessonScreen`.
3. Edge paths: no Bluetooth permission, no robot found, wrong code, Wi-Fi failure, pair timeout, offline robot, firmware needed, lost device.
4. Entry route: `DeviceHomeScreen` or `DeviceOverviewScreen`.
5. Exit route: `PairFirstLessonScreen`, `HomeHubScreen`, `DeviceHomeScreen`, `DeviceLostScreen`, or `PairFailedScreen`.
6. CTA map: "Add robot" -> `PairAddScreen`; "Start pairing" -> `PairIntroScreen`; "Search" -> `PairSearchScreen`; "This robot" -> `PairFoundScreen`; "Enter code" -> `PairCodeScreen`; "Choose Wi-Fi" -> `PairWifiScreen`; "Continue" -> `PairWifiPasswordScreen`; "Connect" -> `PairConnectingScreen`; "Name robot" -> `PairRenameScreen`; "First lesson" -> `PairFirstLessonScreen`; "Retry" -> `PairSearchScreen`; "Help offline" -> `PairOfflineScreen`.
7. Back behavior: stack back with explicit configured targets. Pairing retry group returns to safe earlier steps. No BLE write is repeated by back alone.
8. State matrix: loading search/connect/firmware; empty no device found -> retry/help; offline -> `PairOfflineScreen`; error -> `PairFailedScreen`; retry -> `PairSearchScreen`; timeout -> `PairFailedScreen` or `DeviceLostScreen`; cancel exits to `DeviceHomeScreen`; unauthorized -> `LoginScreen`.
9. Accessibility notes: Bluetooth/Wi-Fi permission text is explicit; code entry supports numeric keypad and screen reader; progress text mirrors spinner state.
10. Acceptance tests: pairing can recover from not found; timeout lands on valid failure screen; back never resubmits credentials; success path reaches first lesson route.
11. Open risks: BLE protocol details are sys-18 owned and must not be changed by UX route work.

## Robot Management Flow

1. Screen inventory: `MyRobotScreen`, `RobotStatusScreen`, `RobotBatteryScreen`, `RobotStorageScreen`, `RobotFirmwareScreen`, `RobotWifiScreen`, `RobotSoundScreen`, `MicTestScreen`, `SpeakerTestScreen`, `FactoryResetScreen`, `OfflineHelpScreen`, `SupportScreen`.
2. Primary path: parent opens `MyRobotScreen`, reviews status, battery, storage, firmware, Wi-Fi, sound, microphone/speaker tests, and support.
3. Edge paths: offline robot, firmware timeout, low battery, storage full, factory reset cancel, support escalation.
4. Entry route: `MyRobotScreen`.
5. Exit route: `ParentSummaryScreen`, `DeviceHomeScreen`, `OfflineHelpScreen`, or `SupportScreen`.
6. CTA map: "Status" -> `RobotStatusScreen`; "Battery" -> `RobotBatteryScreen`; "Storage" -> `RobotStorageScreen`; "Firmware" -> `RobotFirmwareScreen`; "Wi-Fi" -> `RobotWifiScreen`; "Sound" -> `RobotSoundScreen`; "Test mic" -> `MicTestScreen`; "Test speaker" -> `SpeakerTestScreen`; "Factory reset" -> `FactoryResetScreen`; "Offline help" -> `OfflineHelpScreen`; "Support" -> `SupportScreen`.
7. Back behavior: stack back to `MyRobotScreen`; support can enter directly but backs to `MyRobotScreen`; factory reset has explicit cancel and confirmation.
8. State matrix: loading status/firmware; empty not entered except missing robot -> `DeviceHomeScreen`; offline -> `OfflineHelpScreen`; error inline or `AppErrorScreen`; retry refreshes status; timeout -> `OfflineHelpScreen`; cancel -> `MyRobotScreen`; unauthorized -> `LoginScreen`.
9. Accessibility notes: diagnostics include clear text result; reset is destructive and requires explicit confirmation; controls are large enough for one-handed use.
10. Acceptance tests: every management row routes validly; reset can cancel; offline help is reachable; timeout does not show successful firmware state.
11. Open risks: factory reset implications need backend/firmware confirmation before final copy.

## Fallback Flow

1. Screen inventory: `NetworkErrorScreen`, `AppErrorScreen`, `MicMissingScreen`, `VoiceFailedScreen`, `AudioRecoveryScreen`, `SafetyRedirectScreen`, `HelpFaqScreen`, `KidSettingsScreen`, `LessonResumeScreen`, `ReconnectingOverlay`.
2. Primary path: fallback screens catch recoverable failures and return the parent/child to safe prior work.
3. Edge paths: network down, app crash boundary, microphone missing, voice failed, audio recovery, safety redirect, child trying settings, lesson resume, reconnect overlay.
4. Entry route: any domain can enter fallback; specific routes are listed above.
5. Exit route: `HomeHubScreen`, `MicMissingScreen`, `ParentSummaryScreen`, `LessonResumeScreen`, previous route when safe, or `LoginScreen` on unauthorized.
6. CTA map: "Try again" -> source retry or `NetworkErrorScreen`; "Audio help" -> `AudioRecoveryScreen`; "Home" -> `HomeHubScreen`; "Parent help" -> `ParentGateScreen`; "FAQ" -> `HelpFaqScreen`; "Resume lesson" -> `LessonResumeScreen`; "Close" dismisses `ReconnectingOverlay`.
7. Back behavior: fallback entries with configured back targets return to safe homes; overlay modal dismiss is explicit; safety redirect does not back into unsafe content.
8. State matrix: loading only in `ReconnectingOverlay`; empty not entered; offline -> `NetworkErrorScreen`; error -> appropriate fallback; retry -> source retry; timeout -> `NetworkErrorScreen` or `TimedOutScreen`; cancel -> safe home or prior allowed screen; unauthorized -> `LoginScreen`.
9. Accessibility notes: error copy names the next safe action, not technical cause; overlays trap focus; safety redirect is calm and does not expose scary detail.
10. Acceptance tests: every fallback has an exit route; reconnect overlay can close; safety redirect cannot resume blocked content; mic recovery returns to valid route.
11. Open risks: global error boundary must avoid swallowing errors silently; Sentry tagging should include feature and screen.

## Cross-Flow Acceptance Tests

1. Route validity: every CTA route named in this spec exists in `ROUTES`.
2. Back behavior: auth root blocks protected back, onboarding stays linear, tab roots remain stable, modal purchase dismisses explicitly, lesson session uses exit confirm.
3. Persona boundary: parent-only routes never use child encouragement copy; child lesson screens never expose parent analytics or controls without gate.
4. State coverage: each domain documents loading, empty, offline, error, retry, timeout, cancel, unauthorized.
5. Safety copy: safety/fallback/parent screens use calm language and never imply blame.
6. Accessibility: all interactive controls are at least 44 pt and expose role/label/hint where needed.
7. No dark pattern: purchase shows cost before checkout, cancel remains available, safety alerts cannot be disabled by hidden UI promises.

## Route Risks To Resolve Before Implementation

1. Auth has no signup/forgot-password routes in current constants.
2. Legal-reviewed COPPA onboarding routes are absent by design.
3. Several route params are optional; screen tests must define behavior for missing IDs.
4. Purchase provider and BLE protocol states depend on external systems and cannot be invented in mobile UX.
5. Current Ultragoal story only covers Entry Flow, while this artifact covers all requested domains for continuity.
