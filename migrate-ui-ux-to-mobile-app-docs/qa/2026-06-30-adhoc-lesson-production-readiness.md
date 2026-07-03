# AD-HOC: lesson production readiness entry points

Date: 2026-06-30
Owner: TJBot-mobile / sys-16
Status: REVIEW

## Objective

Remove mobile entry points that could start the deprecated demo lesson-session path
instead of the real course-library assignment flow. The app should not fake lesson
progression with timers or hardcoded recap counts when real robot progress is not
available.

## Changes covered

- Home `idle`, `greeting`, and `daily_available` primary CTAs now target
  `SendToRobotScreen`.
- Static course, review, mission, lesson-summary, and review-needed CTAs now
  target `SendToRobotScreen`.
- First child handoff after onboarding now stores/navigates to `SendToRobotScreen`.
- `ConnectingScreen` no longer auto-enters `GreetingScreen` by timer.
- `ThinkingScreen` no longer auto-completes to `SuccessScreen` by timer.
- `LessonDoneScreen` no longer hardcodes "You learned 3 words today" when no
  real `wordsLearned` progress was supplied.
- `navigation-forward-edges.json` was regenerated with
  `npm run navigation:forward-edges`.
- `SendToRobotScreen` is now a `stack-entry` route because it is the production
  parent/child entry for assigning a lesson to Robot from outside the
  course-library stack.
- `UnlockConfirmModal` now validates the entered parent PIN with the existing
  `/parent/auth` mobile API before device resolution or course enrollment.
- `UnlockConfirmModal` no longer renders a hardcoded challenge number and no
  longer accepts a local literal PIN.
- Missing `courseId` now stops the unlock flow with explicit copy instead of
  falling back to demo course `c_food`.
- Wrong parent PIN now blocks `getDeviceStatus` and `enrollCourse`.
- `CourseScreen` now opens the real course-library detail/add flow instead of
  the static `LevelScreen` prototype.
- `course.api.ts` now reads the documented public catalog endpoints
  `/courses` and `/courses/:courseId/lessons`; course APIs without documented
  backend contracts return `BACKEND_CONTRACT_UNAVAILABLE` instead of raw
  `not implemented`.
- `lesson-session.api.ts` now returns `BACKEND_CONTRACT_UNAVAILABLE` for its
  REST placeholder surface because production lesson runtime is the
  robot/realtime path, not a fabricated mobile REST session.
- The legacy `lesson-session` prototype routes remain registered only for
  type/state-machine drift detection, but are now marked production-hidden,
  excluded from the mounted protected stack, excluded from deep-link generation,
  and rejected as stale protected initial routes.
- The legacy static course branch (`LevelScreen`, `UnitScreen`,
  `LessonListScreen`, `LessonDetailScreen`) is also marked production-hidden;
  `CourseScreen` now remains the production course entry and routes to the
  course-library detail/add flow.
- `route-mapping.json` now records `productionVisible:false` on hidden
  lesson-session/course routes and omits their `deepLinkPath`.
- Hidden lesson-session and static course prototype routes now carry explicit
  `productionHiddenReason` metadata so production exclusion is intentional and
  regression-guarded, not an accidental route-map side effect.
- `production-hidden-routes.test.ts` now scans runtime source and confirms
  `createLessonSessionMachine(` has no production caller outside its own
  definition.
- `DailyMissionScreen`, `ReviewEntryScreen`, and `ReviewNeededScreen` now show
  neutral live-progress placeholders instead of hardcoded missions, rewards,
  word counts, fake review words, or last-seen claims.
- `LessonResumeScreen` is now classified as a `fallback-entry`, matching its
  fallback state-machine role and keeping route reachability green after the
  fail-closed fallback resume change.
- `RobotReadyScreen` now stops repeated nonterminal preload polling after a
  bounded wait and offers retry or lesson repick instead of leaving only a
  disabled `Preparing...` CTA.
- `RobotReadyScreen` now treats missing `deviceId` route state as a recoverable
  local state: it performs no backend preload/current-assignment polls, shows
  explicit recovery copy, and routes the parent back to lesson selection instead
  of leaving the primary CTA disabled on `Preparing...`.
- `RunningScreen` now stops repeated pre-live `currentAssignment=null` polling
  after a bounded wait and offers retry or exit without faking lesson
  completion.
- `CompanionScreen` now stops repeated missing-assignment mirror polling after a
  bounded wait and offers retry or return to lesson status without routing into
  the hidden demo lesson-session path.
- `TodayProgressScreen`, `ParentTodayScreen`, and `ParentHistoryScreen` now use
  the shared child lesson-progress query and refetch on later navigation focus,
  so returning from robot/lesson flow refreshes real backend progress instead of
  leaving a stale snapshot.
- `useChildLessonProgressQuery` preserves the existing child-scoped query key
  and backend endpoint, and fails closed if a disabled/no-child query is
  manually refetched instead of returning a fake empty progress list.
- The hidden lesson-session state model now accepts a typed
  `TURN_COMPLETE` machine event and maps backend uppercase `TURN_COMPLETE`
  frames through `lessonSessionEventFromRealtimeFrame`; a server turn-complete
  while the UI is in `ACTIVE.THINKING` returns to listening without marking the
  session completed.
- Existing Gemini playback guards were reverified: silent server responses
  move `WAITING_AI` back to listening, queued-audio drains remain
  playback-finish authoritative, and `PcmStreamPlayer` keeps its native-drain
  timeout fallback when the native playback-drained event is missed.
- First child lesson handoff now shows a starter lesson preview card on
  `FirstLessonEntryScreen` before the child taps `Yes!`; the CTA still enters
  `SendToRobotScreen`, not the hidden demo lesson-session path.
- I18n catalog coverage now includes the previously flagged lesson/course,
  pairing, fallback, and parent strings so `npm run i18n:check` reports zero
  hardcoded user-facing strings.

## Evidence collected

| Check | Command | Result |
|---|---|---|
| Red regression | `npm test -- tests/features/lesson-production-readiness.test.tsx --runInBand` | failed on old `LessonReadyScreen` targets, timer navigation, and hardcoded recap; command also ran the broader unit project due npm arg forwarding |
| Green focused regression | `npx jest --selectProjects unit --runTestsByPath tests/features/lesson-production-readiness.test.tsx --runInBand` | 1 suite passed; 7 tests passed |
| Focused lesson/navigation regression | `npx jest --selectProjects unit --runTestsByPath tests/features/lesson-production-readiness.test.tsx tests/features/lesson-onboarding-pairing-screens.test.tsx tests/features/lesson-detail-screen.test.tsx tests/features/progress/lesson-summary-screen.test.tsx tests/e2e/onboarding.test.tsx tests/home/home-state.test.ts tests/navigation/navigation-architecture.test.ts --runInBand` | 7 suites passed; 76 tests passed |
| Adjacent coverage test | `npx jest --selectProjects unit --runTestsByPath tests/features/course-robot-screen-coverage-round1.test.tsx --runInBand` | 1 suite passed; 24 tests passed |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| ESLint | `npm run lint` | exit 0 |
| Route coverage | `npm run check:route-coverage` | 133 screen files, 125 routes, 0 duplicate registrations |
| Forward-edge artifact | `npm run navigation:forward-edges` | wrote `navigation-forward-edges.json` with 202 forward edges |
| Parent gate RED | `npx jest --selectProjects unit --runTestsByPath tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx --runInBand` | failed on old local `7 3 5 1` gate, disabled non-7351 PIN submit, and missing `courseId` fallback behavior |
| Parent gate focused green | `npx jest --selectProjects unit --runTestsByPath tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx --runInBand` | 2 suites passed; 31 tests passed |
| Course/API RED | `npx jest --selectProjects unit --runTestsByPath tests/api/learning-flow-coverage-gaps.test.ts tests/features/course-lesson-branch-coverage.test.tsx --runInBand` | failed on old `listCourseCatalog`/`getLessonList` raw `not implemented`, wrong error type, and `CourseScreen` navigating to `LevelScreen` |
| Course/API focused green | `npx jest --selectProjects unit --runTestsByPath tests/api/learning-flow-coverage-gaps.test.ts tests/features/course-lesson-branch-coverage.test.tsx --runInBand` | 2 suites passed; 26 tests passed |
| Adjacent course regression | `npx jest --selectProjects unit --runTestsByPath tests/e2e/course-progress-stability.test.tsx tests/features/course-lesson-branch-coverage-round2.test.tsx tests/features/course-lesson-branch-coverage.test.tsx tests/api/learning-flow-coverage-gaps.test.ts tests/api/course-progress-normalization.test.ts tests/api/course-lesson-normalizer-fallbacks.test.ts --runInBand` | 6 suites passed; 102 tests passed |
| Combined lesson/course gate | `npx jest --selectProjects unit --runTestsByPath tests/features/lesson-production-readiness.test.tsx tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx --runInBand` | 3 suites passed; 38 tests passed |
| Navigation contract regression | `npx jest --selectProjects unit --runTestsByPath tests/navigation/route-reachability.test.ts tests/navigation/feature-owned-navigation.test.ts tests/api/learning-flow-coverage-gaps.test.ts tests/features/course-lesson-branch-coverage.test.tsx --runInBand` | 4 suites passed; 37 tests passed |
| Lesson-session hidden-route RED | `npx jest --selectProjects unit --runTestsByPath tests/navigation/production-hidden-routes.test.ts tests/navigation/root-navigator.test.tsx --runInBand` | failed before the production-hidden route metadata and stale-initial-route guard existed |
| Lesson-session hidden-route focused green | `npx jest --selectProjects unit --runTestsByPath tests/navigation/production-hidden-routes.test.ts tests/navigation/root-navigator.test.tsx --runInBand` | 2 suites passed; 15 tests passed |
| Static-course hidden-route RED | `npx jest --selectProjects unit --runTestsByPath tests/navigation/production-hidden-routes.test.ts --runInBand` | failed while `LevelScreen` and `LessonDetailScreen` were still mounted/deep-linkable |
| Static-course hidden-route focused green | `npx jest --selectProjects unit --runTestsByPath tests/navigation/navigation-architecture.test.ts tests/navigation/production-hidden-routes.test.ts --runInBand` | 2 suites passed; 19 tests passed |
| Adjacent hidden-route/navigation regression | `npx jest --selectProjects unit --runTestsByPath tests/ble/blufiProtocol.test.ts tests/features/lesson-production-readiness.test.tsx tests/features/course-lesson-branch-coverage.test.tsx tests/features/course-lesson-branch-coverage-round2.test.tsx tests/features/lesson-detail-screen.test.tsx tests/navigation/production-hidden-routes.test.ts tests/navigation/root-navigator.test.tsx tests/navigation/navigation-architecture.test.ts tests/navigation/feature-owned-navigation.test.ts tests/navigation/route-map.test.ts tests/navigation/route-reachability.test.ts tests/navigation/app-navigator-deep-link.test.tsx --runInBand` | 12 suites passed; 141 tests passed |
| Route-map artifact check | `npm run navigation:route-map -- --check` | 125 routes checked |
| Whitespace | `git diff --check` | exit 0 |
| Full unit suite | `npx jest --selectProjects unit --runInBand --silent --json --outputFile=/tmp/tbot-mobile-jest-full-after-hidden-routes.json` | 188 suites passed, 1 skipped, 1 failed; 1982 tests passed, 19 skipped, 1 failed. Remaining failure is `tests/e2e-native-coverage-contract.test.ts` expecting iOS `DEVELOPMENT_TEAM = "";` while local project has `DEVELOPMENT_TEAM = B45DG8CLV9`. |
| Pairing recovery focused regression | `npx jest --selectProjects unit --runTestsByPath tests/e2e/ux-redesign-accessibility.test.tsx tests/features/device/pair-connecting-flow.test.tsx tests/features/device/pair-wifi-flow.test.tsx tests/features/device/pair-failed-screen.test.tsx --runInBand` | 4 suites passed; 172 tests passed |
| Pair failed isolation check | `npx jest --selectProjects unit --runTestsByPath tests/features/device/pair-failed-screen.test.tsx --runInBand --silent` | 1 suite passed; 68 tests passed |
| Pair rename isolation check | `npx jest --selectProjects unit --runTestsByPath tests/features/device/pair-rename-screen.test.tsx --runInBand --silent` | 1 suite passed; 37 tests passed |
| BLE focused regression | `npx jest --selectProjects unit --runTestsByPath tests/ble/permissions.test.ts tests/ble/config-allowlist.test.ts tests/ble/service.test.ts --runInBand --silent` | 3 suites passed; 122 tests passed |
| TypeScript rerun | `npx tsc --noEmit` | exit 0 |
| ESLint rerun | `npm run lint` | exit 0; `eslint src/ tests/ --max-warnings=0` |
| Full unit suite rerun | `npx jest --selectProjects unit --runInBand --silent --json --outputFile=/tmp/tbot-mobile-jest-full-current-3.json` | 188 suites passed, 1 skipped, 1 failed; 1992 tests passed, 19 skipped, 1 failed. Only remaining failure is `tests/e2e-native-coverage-contract.test.ts`, which still expects iOS `DEVELOPMENT_TEAM = "";` while the local project contains `DEVELOPMENT_TEAM = B45DG8CLV9`. |
| Mission/review static-card RED | `npx jest --selectProjects unit --runTestsByPath tests/features/lesson-production-readiness.test.tsx --runInBand` | failed while mission/review screens still rendered hardcoded lesson/reward/word/last-seen claims |
| Mission/review focused green | `npx jest --selectProjects unit --runTestsByPath tests/features/lesson-production-readiness.test.tsx --runInBand` | 1 suite passed; 8 tests passed |
| Mission/review combined gate | `npx jest --selectProjects unit --runTestsByPath tests/features/lesson-production-readiness.test.tsx tests/navigation/production-hidden-routes.test.ts tests/ui-validation/fallback-offline.test.tsx tests/features/course-robot-screen-coverage-round1.test.tsx --runInBand` | 4 suites passed; 56 tests passed |
| TypeScript rerun after mission/review | `npx tsc --noEmit` | exit 0 |
| ESLint rerun after mission/review | `npm run lint` | exit 0; `eslint src/ tests/ --max-warnings=0` |
| Static fake-string source scan | `rg -n "Lesson 3|How are you|Review 4 words|1 mini-game|Finish all 3|\\+50 stars|1/3|4 words|Hello|\\bHi\\b|Friend|Happy|3 words|Dog|Morning|Last seen|2 days ago|3 days ago|5 days ago" src/features/course/screens/DailyMissionScreen.tsx src/features/course/screens/ReviewEntryScreen.tsx src/features/progress/screens/ReviewNeededScreen.tsx tests/features/lesson-production-readiness.test.tsx` | production files have no matches; matches remain only in the test deny-list |
| Hidden-route source scan | `rg -n "ROUTES\\.(LessonReadyScreen|UserSpeakingScreen|RobotListeningScreen|ConnectingScreen|ThinkingScreen|SuccessScreen)" src/features/course/screens/DailyMissionScreen.tsx src/features/course/screens/ReviewEntryScreen.tsx src/features/progress/screens/ReviewNeededScreen.tsx` | exit 1; no matches |
| Touched-file whitespace after mission/review | `git diff --check -- src/features/course/screens/DailyMissionScreen.tsx src/features/course/screens/ReviewEntryScreen.tsx src/features/progress/screens/ReviewNeededScreen.tsx tests/features/lesson-production-readiness.test.tsx` | exit 0 |
| Route reachability RED from full suite | `npx jest --selectProjects unit --runInBand --silent --json --outputFile=/tmp/tbot-mobile-jest-full-after-mission-review.json` | failed on `LessonResumeScreen` hidden without static inbound navigation or explicit entry role, plus the pre-existing iOS signing failure |
| Route map regeneration | `npm run navigation:route-map` | wrote `route-mapping.json` with 125 routes |
| Affected route/title regression | `npx jest --selectProjects unit --runTestsByPath tests/features/lesson-production-readiness.test.tsx tests/e2e/course-progress-stability.test.tsx tests/navigation/route-reachability.test.ts tests/navigation/production-hidden-routes.test.ts --runInBand` | 4 suites passed; 24 tests passed |
| TypeScript rerun after route metadata | `npx tsc --noEmit` | exit 0 |
| ESLint rerun after route metadata | `npm run lint` | exit 0; `eslint src/ tests/ --max-warnings=0` |
| Touched-file whitespace after route metadata | `git diff --check -- src/features/course/screens/DailyMissionScreen.tsx src/features/course/screens/ReviewEntryScreen.tsx src/features/progress/screens/ReviewNeededScreen.tsx src/features/fallback/navigation.ts tests/features/lesson-production-readiness.test.tsx migrate-ui-ux-to-mobile-app-docs/architecture/route-mapping.json migrate-ui-ux-to-mobile-app-docs/qa/2026-06-30-adhoc-lesson-production-readiness.md` | exit 0 |
| Full unit suite after route metadata | `npx jest --selectProjects unit --runInBand --silent --json --outputFile=/tmp/tbot-mobile-jest-full-after-mission-review-routefix.json` | 187 suites passed, 1 skipped, 1 failed; 1988 tests passed, 19 skipped, 1 failed. Only remaining failure is `tests/e2e-native-coverage-contract.test.ts`, which still expects iOS `DEVELOPMENT_TEAM = "";` while the local project contains `DEVELOPMENT_TEAM = B45DG8CLV9`. |
| Route-map artifact check | `npm run navigation:route-map -- --check` | 125 routes checked |
| Route coverage after route metadata | `npm run check:route-coverage` | 133 screen files, 125 routes, 0 duplicate registrations |
| Explicit hidden-reason RED | `npx jest --selectProjects unit --runTestsByPath tests/navigation/production-hidden-routes.test.ts --runInBand` | failed because hidden route entries had `productionHiddenReason === undefined` |
| Explicit hidden-reason focused GREEN | `npx jest --selectProjects unit --runTestsByPath tests/navigation/production-hidden-routes.test.ts --runInBand` | 1 suite passed; 4 tests passed |
| Final mobile no-fake focused gate | `npx jest --selectProjects unit --runTestsByPath tests/navigation/production-hidden-routes.test.ts tests/api/learning-flow-coverage-gaps.test.ts tests/features/lesson-production-readiness.test.tsx --runInBand` | 3 suites passed; 28 tests passed |
| TypeScript after explicit hidden reasons | `npx tsc --noEmit` | exit 0 |
| ESLint after explicit hidden reasons | `npm run lint` | exit 0; `eslint src/ tests/ --max-warnings=0` |
| Route-map check after explicit hidden reasons | `npm run navigation:route-map -- --check` | 125 routes checked |
| Route coverage after explicit hidden reasons | `npm run check:route-coverage` | 133 screen files, 125 routes, 0 duplicate screen registrations |
| Touched-file whitespace after explicit hidden reasons | `git diff --check -- src/navigation/types.ts src/features/lesson-session/navigation.ts src/features/course/navigation.ts tests/navigation/production-hidden-routes.test.ts docs/superpowers/specs/2026-06-30-mobile-no-fake-lesson-session-design.md docs/superpowers/plans/2026-06-30-mobile-no-fake-lesson-session.md` | exit 0 |
| Full unit suite after explicit hidden reasons | `npx jest --selectProjects unit --runInBand --silent --json --outputFile=/tmp/tbot-mobile-jest-full-after-hidden-reason-final.json` | 187 suites passed, 1 skipped, 1 failed; 1990 tests passed, 19 skipped, 1 failed. Only failure remains `tests/e2e-native-coverage-contract.test.ts`, expecting `DEVELOPMENT_TEAM = "";` while local iOS project has `DEVELOPMENT_TEAM = B45DG8CLV9`. |
| Runtime recovery RED | `npx jest --selectProjects unit --runTestsByPath tests/features/course-library-lesson-screens.test.tsx --runInBand` | failed while repeated `PRELOADING`, repeated pre-live `currentAssignment=null`, and repeated missing companion assignment kept the UI in nonterminal wait states with no recovery |
| Runtime recovery focused GREEN | `npx jest --selectProjects unit --runTestsByPath tests/features/course-library-lesson-screens.test.tsx --runInBand` | 1 suite passed; 8 tests passed |
| Runtime recovery adjacent coverage | `npx jest --selectProjects unit --runTestsByPath tests/features/course-library-screen-coverage-gaps.test.tsx --runInBand` | 1 suite passed; 28 tests passed |
| TypeScript after runtime recovery | `npx tsc --noEmit` | exit 0 |
| ESLint after runtime recovery | `npm run lint` | exit 0; `eslint src/ tests/ --max-warnings=0` |
| Lesson-session terminal guard RED | `npx jest --selectProjects unit --runTestsByPath tests/state/machines/lessonSession.machine.test.ts --runInBand` | failed while stale `SESSION_END` from `IDLE` and `CONNECTING` reached terminal states before `SESSION_STARTED` |
| Lesson-session terminal guard GREEN | `npx jest --selectProjects unit --runTestsByPath tests/state/machines/lessonSession.machine.test.ts tests/navigation/state-machine-executable-alignment.test.ts --runInBand` | 2 suites passed; 34 tests passed |
| TypeScript after terminal guard | `npx tsc --noEmit` | exit 0 |
| ESLint after terminal guard | `npm run lint` | exit 0; `eslint src/ tests/ --max-warnings=0` |
| Progress focus hook focused GREEN | `npx jest --selectProjects unit --runTestsByPath tests/features/progress/use-child-lesson-progress-query.test.tsx --runInBand` | 1 suite passed; 3 tests passed |
| Progress/parent focus screen GREEN | `npx jest --selectProjects unit --runTestsByPath tests/features/progress/use-child-lesson-progress-query.test.tsx tests/features/progress/today-progress-screen.test.tsx tests/features/parent/parent-today-screen.test.tsx tests/features/parent/parent-history-screen.test.tsx --runInBand` | 4 suites passed; 20 tests passed |
| Progress adjacent e2e GREEN | `npx jest --selectProjects unit --runTestsByPath tests/api/learning-flow-coverage-gaps.test.ts tests/e2e/course-progress-stability.test.tsx tests/e2e/parent-settings.test.tsx --runInBand` | 3 suites passed; 70 tests passed |
| TypeScript after progress focus refresh | `npx tsc --noEmit` | exit 0 |
| ESLint after progress focus refresh | `npm run lint` | exit 0; `eslint src/ tests/ --max-warnings=0` |
| Touched-file whitespace after progress focus refresh | `git diff --check -- src/features/progress/hooks/useChildLessonProgressQuery.ts tests/features/progress/use-child-lesson-progress-query.test.tsx tests/e2e/course-progress-stability.test.tsx tests/e2e/parent-settings.test.tsx src/features/progress/screens/TodayProgressScreen.tsx src/features/parent/screens/ParentTodayScreen.tsx src/features/parent/screens/ParentHistoryScreen.tsx tests/features/progress/today-progress-screen.test.tsx tests/features/parent/parent-today-screen.test.tsx tests/features/parent/parent-history-screen.test.tsx src/features/course-library/screens/RobotReadyScreen.tsx src/features/course-library/screens/RunningScreen.tsx src/features/course-library/screens/CompanionScreen.tsx src/state/machines/lessonSession.machine.ts tests/state/machines/lessonSession.machine.test.ts` | exit 0 |
| TURN_COMPLETE adapter/state GREEN | `npx jest --selectProjects unit --runTestsByPath tests/state/machines/lessonSession.machine.test.ts tests/state/machines/lessonSessionRealtimeAdapter.test.ts tests/navigation/state-machine-executable-alignment.test.ts --runInBand` | 3 suites passed; 39 tests passed |
| Gemini playback/reconnect guard GREEN | `npx jest --selectProjects unit --runTestsByPath tests/audio/PcmStreamPlayer.test.ts tests/native/voice-session-events.test.ts tests/hooks/useGeminiConversation-timers.test.ts tests/hooks/useGeminiConversation-reconnect.test.ts --runInBand` | 4 suites passed; 68 tests passed |
| Starter lesson preview focused GREEN | `npx jest --selectProjects unit --runTestsByPath tests/features/lesson-onboarding-pairing-screens.test.tsx --runInBand` | 1 suite passed; 14 tests passed |
| TypeScript after starter preview/i18n | `npx tsc --noEmit` | exit 0 |
| ESLint after starter preview/i18n | `npm run lint` | exit 0; `eslint src/ tests/ --max-warnings=0` |
| I18n hardcoded scan/parity | `npm run i18n:check` | hardcoded total 0; EN keys 1753; VI keys 1753; delta 0 |
| Use-case checker after starter preview | `npm run usecases:check` | checked 154 use cases; failures 0 |
| PR validator bundle after starter preview | `npm run flows:validate && npm run sequences:fast && npm run erd:validate && npm run check:token-parity && npm run check:route-coverage && npm run check:screen-prop-types` | all checks passed; 15 generated flow files, 102 sequences, 109 DBML files, 7 token files, 133 screen files, 125 routes |
| Full unit suite after starter preview | `npm test -- --runInBand` | 192 suites passed, 1 skipped; 2075 tests passed, 19 skipped |
| Integration suite after starter preview | `npm run test:integration` | 1 suite passed; 3 tests passed |
| Whitespace/secret scan after starter preview | `git diff --check` plus diff secret/conflict-marker scan | exit 0; no hits |

## Remaining risk

This record covers mobile sys-16 fake-success, bounded runtime-recovery,
stale terminal-event guarding plus `TURN_COMPLETE` handling in the hidden
lesson-session state model, focus-refresh of child lesson-progress screens,
and existing Gemini playback/reconnect watchdog coverage. It does not prove
the managed backend/robot deploy, Google Live hardware session, robot audio,
native/Detox navigation lifecycle, or production lesson runtime. Those remain
gated by the robot/backend production-readiness checklist and CP-7.

The current live blocker evidence is tracked in
`../../../docs/qa/ad-hoc/2026-06-30-endpoint-diagnosis/live_cp7_blocker_reprobe_20260630T0921Z.md`:
stable `esp.tjbot.vn` URLs are published, but the plugged board still has
`claim:null`, parent auth is expired, mint/factory secrets are unavailable,
Render CLI is unauthorized, and runtime serial is silent.
