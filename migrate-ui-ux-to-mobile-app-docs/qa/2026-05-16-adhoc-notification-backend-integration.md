# AD-HOC: notification backend integration

Date: 2026-05-16
System: sys-16

## Scope

Validated notification backend integration in the mobile app:

- Push token register and unregister helpers
- Runtime duplicate-registration suppression
- Preference GET/PUT roundtrip
- Notification inbox API helper
- 401 and 429 propagation through the shared HTTP client
- Cold-start push payload deep-link routing
- Permission-denied and token-refresh state handling

## Evidence

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Register token success | `tests/api/notifications.test.ts`, `tests/hooks/usePushNotifications.test.ts` | PASS |
| Register token replay does not duplicate | `createPushTokenRegistrar().registerCurrentToken()` replay test | PASS |
| Delete/unregister token | DELETE `/notifications/push-token` with body `{ token }` test | PASS |
| Preferences GET/PUT roundtrip | Preferences service regression test | PASS |
| Backend 401 redirects auth | Notification service preserves shared-client 401 error; auth redirect remains in `src/services/http/client.ts` | PASS |
| Backend 429 shows retry state | Registrar maps retryable shared-client errors to `{ status: 'retry' }` | PASS |
| Cold start/deep link uses payload | `NAVIGATION_LINKING_CONFIG.getInitialURL` reads last notification response | PASS |

## Validation

- `npx tsc --noEmit`: PASS
- `npm test -- --runTestsByPath tests/navigation/notification-linking.test.ts tests/api/notifications.test.ts tests/hooks/usePushNotifications.test.ts`: PASS, 14 tests
- `npx eslint src/services/api/notifications.ts src/hooks/usePushNotifications.ts src/navigation/linking.ts tests/api/notifications.test.ts tests/hooks/usePushNotifications.test.ts tests/navigation/notification-linking.test.ts tests/__mocks__/expo-notifications.ts`: PASS
- `npm run check:route-coverage`: PASS, 122 routes registered
- `npm run check:screen-prop-types`: PASS, 122 screen files checked
- `npm run check:token-parity`: PASS, 7 token files verified

## Gaps

- `provider-live-smoke`: not run. No live FCM credential was provided, so no real provider token delivery smoke was attempted.
- Full `npm test`: PARTIAL. Existing Gemini voice source-shape tests fail outside notification scope.
- Full `npm run lint`: PARTIAL. Existing `src/features/course/screens/{CourseScreen,LessonListScreen}.tsx` React Hooks lint errors fail outside notification scope.
