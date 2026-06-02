# Child Profile Backend E2E Evidence

Task: `adhoc-2026-05-16-child-profile-backend-e2e`

| Screen | API | Current status | Fixed/tested evidence | Remaining risk |
|---|---|---|---|---|
| `ChildProfileScreen` | `POST /v1/households/:householdId/children` | Connected | `tests/api/households.test.ts` verifies payload + stable `X-Request-Id`; `tests/e2e/onboarding.test.tsx` verifies successful create and backend COPPA/limit messages. | Live backend not exercised in this run. |
| `HomeHubScreen` child selector | `POST /v1/profile/active-child` | Connected | `tests/contexts/household-context-race.test.tsx` verifies backend call before local active-child update; `tests/home/home-state.test.ts` stays green. | Switch error currently keeps previous child; no inline toast added. |
| Child list hydration | `GET /v1/households/:id/children` | Connected | `HouseholdContext.refresh()` loads children after household list; `tests/api/households.test.ts` verifies list call. | Active child source is local fallback to first child if backend response has no active marker. |
| Child edit/archive/delete API | `PUT /v1/households/:id/children/:childId`, `POST /v1/children/:childId/archive`, `PATCH /v1/identity/children/:childId` | API helpers connected; no dedicated screen found | `tests/api/households.test.ts` verifies route calls. | No edit/archive/delete child profile UI found in current mobile screens. |
| COPPA dependency | Backend 403 / `COPPA_REQUIRED` | Surfaced | `ChildProfileScreen` now shows `Verify parental consent before creating a child profile.` when backend rejects create. | Does not alter legal consent screen copy. |
| Child limit entitlement | Backend 4xx / `MAX_CHILD_LIMIT_REACHED` | Surfaced | `ChildProfileScreen` now shows `Your plan has reached its child profile limit.` when backend rejects create. | Exact entitlement source remains backend-owned. |
| Foreign child access | Backend 403 / `FORBIDDEN` | Surfaced by API layer | `tests/api/households.test.ts` verifies child list 403 is not rewritten; existing integration suite has learning child foreign-access 403 coverage. | No live child-list 403 request run in this turn. |
| Offline/retry duplicate guard | `POST /v1/households/:id/children` with stable `X-Request-Id` | Fixed | `tests/contexts/household-context-race.test.tsx` verifies retry reuses same request id and local state appends one child. | App process restart after failed create cannot reuse in-memory request id. |

Verification:
- `npm test -- --runTestsByPath tests/api/households.test.ts tests/e2e/onboarding.test.tsx tests/contexts/household-context-race.test.tsx tests/home/home-state.test.ts` -> PASS, 43 tests.
- `npx eslint src/services/api/households.ts src/contexts/HouseholdContext.tsx src/features/home/hooks/useHomeState.ts src/features/home/screens/HomeHubScreen.tsx src/features/onboarding/screens/ChildProfileScreen.tsx tests/api/households.test.ts tests/contexts/household-context-race.test.tsx tests/e2e/onboarding.test.tsx` -> PASS.
- `npx tsc --noEmit` -> PASS.
- `npm run lint` -> FAIL from unrelated React hooks lint issues in `src/features/course-library/screens/CourseLibraryScreen.tsx`, `src/features/course/screens/{CourseScreen,LessonListScreen}.tsx`, and `src/features/progress/screens/TodayProgressScreen.tsx`.
- `npm test` -> FAIL from unrelated voice timing/barge-in ordering suites: `tests/hooks/useGeminiConversation-timers.test.ts` and `tests/hooks/useGeminiConversation-bargein-ordering.test.ts`.
