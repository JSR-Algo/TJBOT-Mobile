# UX Backend State Reliability Audit

Task: `AD-HOC: adhoc-2026-05-16-ux-backend-state-reliability`

Scope: tbot-mobile sys-16 API-facing screens. Backend contracts were not changed.

## Matrix

| screen | API | states covered | missing state | user impact | fix |
|---|---|---|---|---|---|
| LoginScreen | `POST /auth/login`, `POST /auth/signup` | loading, success, generic failure | 400, 403, 409, 410, 429, 502, offline, timeout | signup/login errors can look like bad credentials | pending follow-up: route auth errors through shared API state copy |
| ChildProfileScreen | `POST /households`, `POST /households/:id/children` | loading, success, no-household, generic failure | 400, 401, 403, 409, 410, 429, 502, offline, timeout | validation/conflict/rate-limit copy is generic | pending follow-up: map `AppError` status/code in onboarding |
| HomeHubScreen | `getHomeHub`, `POST /profile/active-child` | loading, success variants, payload offline, generic error | 400, 401, 403, 409, 410, 429, 502, transport offline, timeout | refresh/switch-child failures can hide cause | pending follow-up: apply `describeApiFailure` in `useHomeState` |
| CourseScreen | `listCourseCatalog` | loading, success, empty, 429 Retry-After, 502, offline, timeout, retry | 400, 401, 403, 409, 410 | course catalog no longer collapses rate/outage/offline to one toast | fixed in `CourseScreen` with `describeApiFailure` |
| LessonListScreen | `getLessonList` | loading, success, empty, 410, 502, offline, timeout, retry | 400, 401, 403, 409, 429 | expired/moved lesson list now gets actionable copy | fixed in `LessonListScreen` with `describeApiFailure` |
| CourseLibraryScreen | `listLibrary` | loading, success, empty, 502, offline, timeout, retry | 400, 401, 403, 409, 410, 429 | library outage/offline no longer generic | fixed in `CourseLibraryScreen` with `describeApiFailure` |
| TodayProgressScreen | `getProgressSummary` | loading, success, empty, 429, 502, offline, timeout, retry | 400, 401, 403, 409, 410 | zero progress no longer renders fake metrics; failures hide stale data | fixed in `TodayProgressScreen` |
| ParentGateScreen | `POST /v1/parent/auth` | submitting, success, 401, 423, 429 Retry-After, generic | empty, 400, 403, 409, 410, 502, offline, timeout | parent cannot distinguish network/session/provider failure | pending follow-up: apply shared state classifier |
| ParentLockedOutScreen | `POST /v1/parent/lockout/clear` | success, generic failure | loading, 400, 401, 403, 409, 410, 429, 502, offline, timeout | repeated taps and generic failure copy | pending follow-up: submitting state + classifier |
| ParentSummaryScreen | `getParentSummary` | loading, success, 429 Retry-After, 502, offline, timeout, retry | empty payload, 400, 401, 403, 409, 410 | stale summary hidden on reload failure; successful response no longer leaves loading UI | fixed screen state; API remains backend-contract stub |
| ParentTodayScreen | `getParentToday` | loading, success, timeout, retryable failure classes | empty payload, 400, 401, 403, 409, 410 exact-copy coverage | stale today data hidden on error; successful response no longer leaves loading UI | fixed screen state; API remains backend-contract stub |
| ParentHistoryScreen | `getParentHistory` | loading, success, offline, retryable failure classes | empty payload, 400, 401, 403, 409, 410 exact-copy coverage | parent history no longer renders generated local rows; successful response no longer leaves loading UI | fixed in current branch; API remains backend-contract stub |
| ParentSettingsScreen / ParentSafetyScreen | settings/safety stubs | local-only UI | all backend states | settings appear saved but are not persisted | pending backend contract wiring |
| CheckoutScreen | `POST /v1/billing/checkout-session` | missing profile, submitting, paid success, unpaid, generic failure | 400, 401, 403, 409, 410, 429, 502, offline, timeout | current saved checkout request is always null | pending follow-up: real saved shipping request + classifier |
| OrderConfirmScreen | `GET /v1/billing/orders/:id`, entitlement refresh | loading, retry error, missing id, unpaid, paid success | 400, 401, 403, 409, 410, 429, 502, offline, timeout | order retry copy generic | pending follow-up: classifier; entitlement refresh failure surfacing/logging |
| ShippingScreen | `GET /v1/billing/orders/:id` | loading, retry error, missing id, success | empty, 400, 401, 403, 409, 410, 429, 502, offline, timeout | carrier/order failures indistinct | pending follow-up: classifier and pending tracking empty state |
| SubscriptionsScreen | billing provider/cancel/refund | provider loading, unavailable, success, cancel/refund submitting, generic action errors | 400, 401, 403, 409, 410, 429, 502, offline, timeout | provider downtime vs offline/rate limit unclear | pending follow-up: classifier for provider/actions |
| Robot status/battery/mic/speaker | device telemetry stubs | loading-ish, stale, generic unavailable | all HTTP error states | API screens are structurally wired but not backed by routes | pending backend/device API contract wiring |
| Robot firmware/Wi-Fi/factory reset | device action stubs | success nav, generic action error | loading/in-flight, all listed failures | destructive/action failures generic | pending backend/device API contract wiring |
| PairWifiScreen | device provisioning / Wi-Fi scan contract | manual SSID path, unavailable scan copy, no fabricated SSIDs | real scanned-network success/empty/error states | guessed SSIDs would send child/parent down fake setup path | fixed test contract to forbid hardcoded scan rows until device provisioning exists |

## Verification

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit --pretty false` | PASS, exit 0 |
| Lint | `npm run lint` | PASS, exit 0 |
| Targeted mobile tests | `npm test -- --runTestsByPath tests/api/api-state.test.ts tests/e2e/course-progress-stability.test.tsx tests/e2e/parent-settings.test.tsx` | PASS |
| Full mobile tests | `npm test -- --runInBand` | PASS, 86 suites passed, 1 skipped, 710 tests passed |
| Backend e2e | not run | Not applicable: no backend route contract changed |
