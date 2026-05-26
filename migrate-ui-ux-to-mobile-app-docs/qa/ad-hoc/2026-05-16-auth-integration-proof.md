# Auth integration proof — 2026-05-16

## Scope

- Mobile auth screen actions: signup, login, logout, refresh, session expiry/revocation, parent fresh-auth.
- Backend contract source: `migrate-ui-ux-to-mobile-app-docs/api/openapi.json`.
- Mobile code source: `src/features/auth/`, `src/contexts/AuthContext.tsx`, `src/services/api/auth.ts`, `src/services/http/`.

## Evidence

| Claim | Evidence | Verdict |
|---|---|---|
| Signup and login call backend auth routes and store returned tokens | `src/services/api/auth.ts`; targeted auth Jest suite | PASS |
| Protected 401 refresh uses one refresh call for concurrent requests | `tests/api/http-client.test.ts`; `tests/api/refresh-queue.test.ts` | PASS |
| Domain-auth 401s do not trigger token refresh loops | `tests/api/http-client.test.ts` fresh-auth regression | PASS |
| Refresh failure clears SecureStore and invalidates React auth state | `tests/api/http-client.test.ts`; `tests/contexts/auth-invalidation.test.tsx` | PASS |
| Logout cleans local tokens even when backend revoke fails | `src/services/api/auth.ts`; `src/contexts/AuthContext.tsx`; `tests/e2e/parent-settings.test.tsx` | PASS |
| Parent fresh-auth screens can read HTTP status and retry-after metadata | `src/utils/errors.ts`; `tests/utils/errors.test.ts`; `tests/e2e/parent-settings.test.tsx` | PASS |

## Commands

- `npx jest tests/api/http-client.test.ts tests/utils/errors.test.ts tests/api/errors-stability.test.ts tests/contexts/auth-invalidation.test.tsx tests/e2e/auth.test.tsx tests/e2e/parent-settings.test.tsx tests/api/refresh-queue.test.ts --runInBand` → PASS, 7 suites / 53 tests.
- `npm run test:integration -- --runInBand tests/integration/auth-isolation.test.ts` → PASS, 1 suite / 3 tests.
- `npm run lint` → PASS.
- `npx tsc --noEmit` → PASS.
- `npm test -- --runInBand` → PASS, 86 suites / 706 tests, 1 suite skipped / 19 tests skipped.
- `npx jest --selectProjects unit --runInBand --no-cache` → PASS, 86 suites / 706 tests, 1 suite skipped / 19 tests skipped.
- `npm run test:integration -- --runInBand` → PASS, 1 suite / 3 tests.
- `npm run flows:validate` → PASS, ALL CHECKS PASSED.
- `npm run sequences:fast` → PASS, 102 sequence diagrams parsed, index up to date.
- `npm run erd:fast` → PASS, 109 DBML files and 107 entity docs checked.
- `npm run usecases:check` → PASS, 154 use cases checked.
- `npm run check:token-parity` → PASS, 7 token files verified.
- `npm run check:route-coverage` → PASS, 122 routes registered.
- `npm run check:screen-prop-types` → PASS, 122 screen files checked.
- `npm run erd:validate` → FAIL, script does not exist in `package.json`; equivalent repo script is `erd:fast`.

## Remaining risks

- No mobile UI exists for reset-password token entry or email verification.
- `auth.refresh()` service helper is not wired to screens and does not send a refresh-token body; actual interceptor path uses `refreshAuthTokens()` and is covered.
- Detox native simulator gates were not run in this pass.
