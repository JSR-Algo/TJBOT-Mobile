# Apple Review Build 9 Mobile E2E Sign-Off

**Date:** 2026-07-27  
**Platform:** iOS Simulator, iPhone 17 Pro  
**App version:** 1.0.0 (9)  
**Branch:** `fix/apple-review-build-9`  
**Scope:** Pre-deploy mobile validation for authentication, onboarding, Home, and representative main features. Running an actual lesson on the phone was intentionally excluded.

## Result

**PASS: 18/18 E2E checks.** The Release simulator bundle cold-started successfully, completed sign-up/sign-in validation, completed onboarding, reached HomeHub, opened protected tabs and representative feature entries, exercised primary CTAs and navigation, rendered recoverable fallback states, and remained alive after coverage.

## Verification

| Suite | Coverage | Result |
|---|---|---|
| `e2e/auth-signup-login.test.ts` | Sign-up validation, existing account, password visibility/mismatch, forgot password, removed deep-link fallback, sign-in to main tabs | PASS, 10/10 |
| `e2e/module-matrix.test.ts` | Cold start, sign-in, onboarding, HomeHub, protected tabs, module entries, primary CTAs, back navigation, modal fallback, course API error fallback, app-alive check | PASS, 8/8 |
| `scripts/runtime/mobile-env.test.mjs` | Detox Release/non-development bundle configuration and runtime environment | PASS, 5/5 |

Authoritative E2E commands:

```bash
E2E_IOS_SIMULATOR_DEVICE_TYPE='iPhone 17 Pro' \
npm run detox:test:ios -- e2e/auth-signup-login.test.ts --runInBand

E2E_IOS_SIMULATOR_DEVICE_TYPE='iPhone 17 Pro' \
npm run detox:test:ios -- e2e/module-matrix.test.ts --runInBand
```

Observed totals:

```text
auth-signup-login: 10 passed, 0 failed (731.864 s)
module-matrix:       8 passed, 0 failed (190.656 s)
combined:           18 passed, 0 failed
```

## Defect Found And Corrected

The original offline-course E2E used Detox `setURLBlacklist()` as if it blocked network requests. That API only excludes matching URLs from Detox synchronization, so the request still reached the local backend and returned an empty success response. The test now injects a deterministic `503` response for `GET /v1/courses` in the local mock backend and verifies that the app renders an actionable error state instead of hanging.

The iOS Detox artifact also uses a Release bundle (`--dev false`). This avoids Expo devtools websocket initialization in an embedded simulator bundle.

## Release Gate

- Sign up: PASS
- Sign in and reach main tabs: PASS
- First-run onboarding and reach HomeHub: PASS
- Protected tabs and representative main features: PASS
- Primary CTA and back navigation smoke coverage: PASS
- Offline/error fallback and app-alive checks: PASS
- Actual lesson execution on phone: NOT RUN, excluded by request

Based on the tested scope, build 1.0.0 (9) passes the mobile E2E gate for deploy/resubmission.
