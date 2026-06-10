# AD-HOC: screen-by-screen i18n audit

Date: 2026-05-31
Owner: TJBot-mobile / sys-16
Status: REVIEW_READY

## Objective

Audit each active mobile screen once, starting from a deduped screen inventory, and check English/Vietnamese coverage.

## Inventory rule

- Source of truth: `src/features/*/navigation.ts` route registrations.
- Root gate added separately: `src/navigation/AgeScreen.tsx`.
- Excluded from active review: legacy alias files under `src/app/screens/*` because they re-export canonical screens and are listed as deleted/phantom aliases in `src/navigation/inventory.ts`.

## Active screen inventory

Total: 123 active screens/overlays = 122 feature routes + 1 root age gate.

- auth (8): IntroCelebrateScreen, IntroListenScreen, IntroRetryScreen, IntroSpeakScreen, LoginScreen, SplashScreen, TrustScreen, WelcomeScreen
- course (7): CourseScreen, DailyMissionScreen, LessonDetailScreen, LessonListScreen, LevelScreen, ReviewEntryScreen, UnitScreen
- course-library (12): BuyCourseScreen, CompanionScreen, CourseAddedScreen, CourseCompleteScreen, CourseDetailScreen, CourseLibraryScreen, CourseLockedScreen, NeedsSyncScreen, RobotReadyScreen, RunningScreen, SendToRobotScreen, UnlockConfirmScreen
- device (20): DeviceFirmwareScreen, DeviceHomeScreen, DeviceLostScreen, DeviceOverviewScreen, DeviceSessionScreen, LCDLessonTurnScreen, LCDLibraryScreen, PairAddScreen, PairCodeScreen, PairConnectingScreen, PairFailedScreen, PairFirstLessonScreen, PairFoundScreen, PairIntroScreen, PairOfflineScreen, PairRenameScreen, PairSearchScreen, PairSuccessScreen, PairWifiPasswordScreen, PairWifiScreen
- fallback (10): AppErrorScreen, AudioRecoveryScreen, HelpFaqScreen, KidSettingsScreen, LessonResumeScreen, MicMissingScreen, NetworkErrorScreen, ReconnectingOverlay, SafetyRedirectScreen, VoiceFailedScreen
- home (1): HomeHubScreen
- lesson-session (24): AbandonedDisconnectScreen, ActivityDoneScreen, ActivityIntroScreen, AudioErrorScreen, BargeinScreen, ConnectingScreen, CostCappedScreen, ExitConfirmScreen, GentleScreen, GreetingScreen, LessonDoneScreen, LessonReadyScreen, OfftopicScreen, ParentStoppedScreen, ReconnectingScreen, RetryScreen, RobotListeningScreen, RobotSpeakingScreen, SafetyScreen, SilenceScreen, SuccessScreen, ThinkingScreen, TimedOutScreen, UserSpeakingScreen
- onboarding (3): ChildProfileScreen, FirstLessonEntryScreen, MicAskScreen
- parent (8): ParentAccountPrivacyScreen, ParentGateScreen, ParentHistoryScreen, ParentLockedOutScreen, ParentSafetyScreen, ParentSettingsScreen, ParentSummaryScreen, ParentTodayScreen
- progress (5): CelebrationScreen, LessonSummaryScreen, ReviewNeededScreen, TodayProgressScreen, WordsPracticedScreen
- purchase (12): ActivateScreen, ArrivedScreen, BundleScreen, CheckoutScreen, FirstCourseScreen, HowItWorksScreen, IncludedScreen, OrderConfirmScreen, PrivacyScreen, PurchaseIntroScreen, ShippingScreen, SubscriptionsScreen
- robot-mgmt (12): FactoryResetScreen, MicTestScreen, MyRobotScreen, OfflineHelpScreen, RobotBatteryScreen, RobotFirmwareScreen, RobotSoundScreen, RobotStatusScreen, RobotStorageScreen, RobotWifiScreen, SpeakerTestScreen, SupportScreen
- root (1): AgeScreen

Note: device inventory initially had no route duplicates in the generated source list; this report keeps canonical route names only. Alias files `DevicePairWifiScreen`, `ListenScreen`, and `SpeakScreen` are excluded because each re-exports an already-listed canonical screen.

## Findings fixed in this pass

- `AgeScreen`: added EN/VI resources for all static age-gate copy and translated dynamic age-range accessibility labels.
- `ChildProfileScreen`: added EN/VI resources for buddy/age/level selector copy and translated dynamic selector accessibility labels.
- `LessonListScreen`: translated dynamic lesson metadata while preserving lesson titles and numeric values.
- `BuyCourseScreen`: translated dynamic add-course title and course duration metadata while preserving course title data.
- `ParentHistoryScreen`: translated retry accessibility label and dynamic minutes/turns metadata while preserving date/topic data.
- `PairWifiScreen`: translated Wi-Fi network accessibility-label template while preserving SSID data.
- Shared primitives: `Box` and `Pressable` now translate string `accessibilityLabel` values, matching the existing `Text` auto-translation path.
- Components and screens: patched direct React Native accessibility labels in top bars, fallback actions, lesson-session exits, pairing, checkout, and parent privacy/account actions.
- Locale catalogs: added EN/VI coverage for static screen copy, error/status copy, screen metadata, parent privacy messages, purchase labels, robot-management copy, and device-pairing recovery copy.
- Allowlist: documented the remaining intentional non-translated literals as curriculum content, sample data, exact confirmation tokens, backend metadata, or locale names shown in their own language.

## Recurring gate promotion

- Promoted the stricter TypeScript AST scan into `scripts/i18n/scan-hardcoded.mjs`, preserving the existing `npm run i18n:scan` command.
- The scanner now covers `src/**/*.{jsx,tsx}` JSX text, accessibility/copy JSX props, and common feature copy object/call sites.
- Added regression tests for missing `accessibilityLabel` copy, feature object copy, and EN-catalog allow behavior.
- Added EN/VI catalog coverage for 10 copy strings surfaced by the recurring scanner and allowlisted 2 intentional curriculum/brand fragments.

## Intentional non-translated exclusions

- Curriculum / English-learning content: lesson titles and practice phrases such as `Say hi`, `I am happy`, `Goodbye`, and `Review · 3 tricky words` remain English by design.
- Sample / data values: timestamps, Wi-Fi SSID examples, order/customer data, and prices are treated as data, not UI copy.
- Operational constants: `EXPORT` and `DELETE my account` remain exact typed confirmation phrases; only their labels/instructions are translated.
- Backend reason string `Requested from mobile parent settings.` stays stable for API payload semantics.
- Locale autonym `Tiếng Việt` is shown in Vietnamese intentionally.

## Evidence collected

| Check | Command | Result |
|---|---|---|
| Active inventory generation | one-off Node parse of `src/features/*/navigation.ts` + root `AgeScreen` | 123 active screens/overlays |
| Red regression | `npm test -- --runInBand tests/navigation/age-screen.test.tsx` before locale fix | failed on missing EN key |
| Green regression | `npm test -- --runInBand tests/navigation/age-screen.test.tsx` | 3 tests passed |
| Strict JSX/a11y one-off scan | TypeScript AST scan over `src/**/*.tsx` for JSX text and direct `accessibilityLabel` / `placeholder` string props | count 0 |
| Broader active-feature string scan | TypeScript AST scan over feature string props/calls (`title`, `body`, `label`, `message`, etc.) using `scripts/i18n/.i18n-allowlist` | count 0 |
| Scanner regression red | `npx jest --selectProjects unit --runTestsByPath tests/i18n/scan-hardcoded.test.ts --runInBand` before scanner promotion | failed: expected direct `accessibilityLabel` leak to be reported |
| Scanner regression green | `npx jest --selectProjects unit --runTestsByPath tests/i18n/scan-hardcoded.test.ts --runInBand` | 1 suite, 3 tests passed |
| Official i18n check | `npm run i18n:check` | hardcoded 0; EN keys 1604, VI keys 1604, delta 0; bundle N/A |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Focused regression tests | `npm test -- --runInBand tests/navigation/age-screen.test.tsx tests/e2e/onboarding.test.tsx tests/features/parent/parent-history-screen.test.tsx tests/services/i18n-app-language.test.ts` | 4 suites, 34 tests passed |
| Full unit suite | `npm test -- --runInBand` | 136 suites passed, 1 skipped; 1080 tests passed, 19 skipped |
| ESLint | `npm run lint` | exit 0; 58 existing warnings, 0 errors |
| Integration tests | `npm run test:integration` | 1 suite, 3 tests passed |
| Flow validator | `npm run flows:validate` | 15 generated files verified; all checks passed |
| Sequence validator | `npm run sequences:fast` | 102 files validated; README up to date |
| ERD validator | `npm run erd:validate` | 109 DBML files + 107 entity docs validated |
| Use-case checker | `npm run usecases:check` | checked 154 use cases; failures 0 |
| Token parity | `npm run check:token-parity` | 7 token files verified |
| Route coverage | `npm run check:route-coverage` | 130 screen files, 122 routes, 0 duplicate registrations |
| Screen prop types | `npm run check:screen-prop-types` | 130 screen files checked |
| Detox iOS | `npm run detox:test:ios` | exit 1; 3 suites failed, 20 tests failed; app did not expose `emailInput`, Detox reported main run loop busy + pending main-queue work |
| Whitespace | `git diff --check` | exit 0 |

## Remaining audit risk

The screen inventory and current source tree pass the recurring AST-backed `npm run i18n:scan` gate. Remaining risk is heuristic scope: single identifier-like strings and data-like literals are ignored to avoid false positives, so code review should still check any newly introduced short UI labels.

Detox iOS remains outside the i18n claim. The latest run failed before auth assertions could exercise screen copy: screenshots show the app already on Home for some auth smoke failures, and Detox repeatedly reported a busy main run loop while waiting for `emailInput`.
