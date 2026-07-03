# Mobile No-Fake Lesson Session Design

## Goal

Close the remaining mobile `G-MOBILE-NO-FAKE` risk by making the legacy lesson-session and static course prototype routes explicitly production-hidden and regression-guarded, while leaving the QA-only files available for tests until the real backend/realtime lesson contract exists.

## Approved Approach

Keep the hidden QA-only screen files and typed fail-closed API, but add a stricter production contract test/source gate proving no production import, mounted navigation, deep link, fallback checkpoint, or CTA can enter `lesson-session`. This is lower risk than deleting 24 screens and the state-machine tests in the current dirty repo.

## Architecture

The app already filters `productionVisible:false` screens out of mounted protected navigation and generated deep links. This design adds explicit `productionHiddenReason` metadata so hiding legacy screens is intentional, reviewable, and regression-tested. The production path remains `SendToRobotScreen` and course-library assignment; the legacy lesson-session REST API continues to reject with `BACKEND_CONTRACT_UNAVAILABLE`.

## Components

- `src/navigation/types.ts`: extend `FeatureStackScreen` with optional `productionHiddenReason`.
- `src/features/lesson-session/navigation.ts`: mark every legacy lesson-session screen hidden with reason `backend-contract-unavailable`.
- `src/features/course/navigation.ts`: mark static course prototype screens hidden with reason `static-prototype-hidden`.
- `tests/navigation/production-hidden-routes.test.ts`: assert hidden route metadata exists, hidden routes stay unmounted/deep-link-invisible, and runtime source does not call `createLessonSessionMachine`.

## Data Flow

No new backend endpoint, WebSocket frame, BLE schema, or API call is introduced. Existing child CTAs keep routing to `SendToRobotScreen`. Hidden route metadata is consumed only by navigation tests and route-map export behavior.

## Error Handling

The fail-closed API remains unchanged: REST lesson-session calls reject with `BACKEND_CONTRACT_UNAVAILABLE`. This avoids fake sessions and avoids inventing a backend contract in the mobile repo.

## Testing

TDD sequence:

1. Add a failing navigation test requiring `productionHiddenReason` on every hidden route.
2. Add the metadata type and route metadata.
3. Re-run focused unit tests.
4. Run typecheck, lint, route-map check, route coverage, and touched-file hygiene.

## Non-Goals

- Do not implement realtime lesson-session networking in mobile.
- Do not change backend, firmware, BLE, or WebSocket contracts.
- Do not delete the hidden screen files in this slice.
- Do not modify COPPA legal copy.
