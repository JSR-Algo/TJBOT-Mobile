# Mobile-backend integration audit — 2026-05-16

Task: `AD-HOC: adhoc-2026-05-16-mobile-backend-integration-audit`

Decision: `NOT COMPLETE`

## Summary

- Main navigation route registrations checked: 122.
- Many screens remain static, mocked, partial, or blocked by missing backend contract.
- Mobile contract fixes applied for route version prefix, auth refresh body, account export projection, strict device payload types, and notification/linking test typings.
- Backend verification commands passed, but backend status docs still say not production-ready and several mobile-required routes are missing or contract-divergent.

## Verification

- `cd /Users/manhhodinh/Documents/TBOT/tbot-backend && npm run openapi:check`: exit 0; generated OpenAPI 3.1.0 with 61 paths and modular route contract with 75 routes; Spectral no warn+ results.
- `cd /Users/manhhodinh/Documents/TBOT/tbot-backend && npm run typecheck`: exit 0.
- `cd /Users/manhhodinh/Documents/TBOT/tbot-backend && npm run test:e2e`: exit 0; 1 file, 7 tests passed.
- `cd /Users/manhhodinh/Documents/TBOT/tbot-mobile && npm run test:integration`: exit 0; 1 suite, 3 tests passed.
- `cd /Users/manhhodinh/Documents/TBOT/tbot-mobile && npx tsc --noEmit`: exit 0.
- `cd /Users/manhhodinh/Documents/TBOT/tbot-mobile && npx jest --selectProjects unit --runTestsByPath tests/api/purchase-billing.test.ts tests/api/notifications.test.ts tests/navigation/notification-linking.test.ts tests/navigation/navigation-architecture.test.ts`: exit 0; 4 suites, 28 tests passed.

## Blocking Gaps

- Course library list/detail, course catalog/lesson list, parent summary/today/history/safety/settings, progress summary, robot management telemetry/actions, many device/pairing and lesson-session routes are not connected to backend APIs.
- Backend has no confirmed `GET /v1/billing/provider-status`, public `POST /v1/content/entitlements`, AI REST endpoints (`/v1/stt/transcribe`, `/v1/llm/chat`, `/v1/tts/synthesize`), or `/v1/learning/progress/:childId` alias in first-class OpenAPI paths.
- OpenAPI top-level `paths` and `x-tbot-modular-route-contract` diverge, so generated clients would miss modular billing/notification routes.
- Backend readiness audit documents remaining production risks: full backend test suite failure, live harness/provider proof gaps, and billing portal unresolved.
