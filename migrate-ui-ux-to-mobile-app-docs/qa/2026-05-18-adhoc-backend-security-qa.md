# Backend Security QA - 2026-05-18

Task: `AD-HOC: adhoc-2026-05-18-backend-security-qa`
Repo scope: `tbot-mobile` sys-16 API consumer tests.

## Result

Status: PARTIAL for backend release security, PASS for deterministic mobile integration contract coverage.

The mobile repo cannot validate live backend internals, DB state, admin MFA, or production gateway rate limiting without editing or exercising backend-owned systems. This pass adds deterministic integration tests for the security contracts the mobile app consumes and records backend-only follow-up risk.

## Tests Added

File: `tests/integration/auth-isolation.test.ts`

Covered:
- unauthenticated learning request returns 401
- wrong child ownership returns 403
- wrong household child create returns 403 or 404
- wrong device ownership returns 403 or 404
- invalid access token returns 401
- revoked token returns 401 after logout
- refresh token replay returns 401 after first rotation
- parent PIN wrong attempts lock out
- parent PIN lockout clear requires auth
- rate limit returns controlled 429
- error responses do not expose password hash, token hash, secrets, stack traces, or test passwords
- account export/delete status cannot be read by a different owner

Mock backend support added:
- `tests/integration/__setup__/mock-server.ts`

## Vulnerabilities / Gaps

| Severity | Finding | Evidence | Recommendation |
|---|---|---|---|
| High | Live backend security behavior is not proven by this repo. | Tests run against deterministic in-process mock backend. | Run a staging-equivalent matrix against `tbot-backend` using documented endpoints and seeded users/devices; preserve HTTP transcript/log evidence. |
| High | Admin auth/MFA is out of mobile scope and not validated here. | sys-16 does not own admin/support tools. | Backend/admin QA must verify MFA required, recovery flows audited, and admin errors redacted. |
| Medium | Production rate-limit buckets are only contract-simulated here. | Mock returns 429 after repeated login failures. | Verify gateway Redis/Lua limits for login, refresh, PIN, export/delete on staging. |
| Medium | Access-token expiry is not proven by this repo. | The mobile integration fixture can reject invalid/revoked tokens, but it does not mint signed JWTs with `exp`. | Backend QA must assert expired RS256 JWTs are rejected and session cleanup/revocation state is honored. |
| Medium | Backend PII redaction is only response-contract tested here. | Mock negative responses are checked for sensitive keys. | Add backend assertions on real exception paths and log sinks for password/token hashes, secrets, and stack traces. |

## Verification

| Gate | Command | Result | Evidence |
|---|---|---|---|
| Red proof | `npm run test:integration -- --runInBand tests/integration/auth-isolation.test.ts` before mock implementation | FAIL expected | 6 failing tests: missing household/device, refresh replay, parent PIN, rate limit, export/delete behavior |
| Targeted integration | `npm run test:integration -- --runInBand tests/integration/auth-isolation.test.ts` | PASS | 1 suite, 9 tests passed |
| Typecheck | `npx tsc --noEmit --pretty false` | PASS | exit 0 |
| Lint | `npm run lint -- --quiet` | PASS | exit 0 |
| Unit suite | `npm test -- --runInBand` | PASS | 100 suites passed, 1 skipped; 832 tests passed, 19 skipped |
| Integration suite | `npm run test:integration -- --runInBand` | PASS | 1 suite passed; 9 tests passed |
| Flows validator | `npm run flows:validate` | PASS | 15 generated files verified; all checks passed |
| Sequences validator | `npm run sequences:fast` | PASS | 102 sequence files parsed/validated; index up to date |
| ERD validator | `npm run erd:validate` | PASS | 109 DBML files and 107 entity markdown files validated |
| Use-case checker | `npm run usecases:check` | PASS | 154 use cases checked |
| Token parity | `npm run check:token-parity` | PASS | 7 token files verified |
| Route coverage | `npm run check:route-coverage` | PASS | 123 screen files, 123 routes registered |
| Screen prop types | `npm run check:screen-prop-types` | PASS | 123 screen files checked |
| Detox iOS build | `npm run detox:build:ios` | FAIL | `xcodebuild: error: Found no destinations for the scheme 'TJBotMobile' and action build` |
| Detox iOS e2e | `npm run detox:test:ios` | FAIL | smoke test saw none of expected launch/login/home labels; module matrix failed and teardown timed out |
| Detox Android build | `npm run detox:build:android` | FAIL | Java Runtime missing for Gradle |
| Detox Android e2e | `npm run detox:test:android` | FAIL | Detox exited `-1`; Android build separately reports missing Java Runtime |

## Native Gate Follow-up - 2026-05-18

Additional mobile E2E hardening:
- Suppressed React Native LogBox only in `__DEV__` + `Config.QA_MODE` so Detox can reach the Welcome CTA.
- Added stable Welcome screen/test IDs and made blank-screen checks prefer native IDs before visible text.
- Increased Detox setup/teardown and Jest E2E timeouts for slow iOS 26 simulator boot/install.
- Added Android Studio bundled JBR discovery for local Gradle when present.

Additional native evidence:
- `npx tsc --noEmit --pretty false`: PASS, exit 0.
- `npm run lint -- --quiet`: PASS, exit 0.
- `npx jest --selectProjects unit --runInBand tests/e2e-native-coverage-contract.test.ts tests/ui-validation/accessibility-primitives.test.tsx tests/App.test.tsx`: PASS, 3 suites / 21 tests.
- `xcodebuild -workspace ios/TJBotMobile.xcworkspace -scheme TJBotMobile -configuration Debug -sdk iphonesimulator -showdestinations`: FAIL, no eligible simulator destination listed; only physical iOS device destinations are shown, blocked by missing iOS 26.5 platform.
- `xcrun simctl list devices available`: local simulators exist for iOS 26.4, including `iPhone 17 Pro`.
- `/usr/libexec/java_home -V`: FAIL, no system Java runtime; Android remains blocked unless Android Studio JBR exists or a JDK is installed.

Native verdict:
- iOS build/e2e remains BLOCKED by local Xcode destination/runtime mismatch: Xcode SDK is `iphonesimulator26.5`, available simulator runtime is iOS 26.4, and `xcodebuild -showdestinations` exposes no eligible simulator for `TJBotMobile`.
- Android build/e2e remains BLOCKED by missing Java runtime unless the Android Studio bundled JBR path is available locally.

## Verdict

Mobile-consumed security contracts now have deterministic integration tests. Backend release security remains PARTIAL until an equivalent matrix is run against staging/prod-like backend services and admin MFA paths.
