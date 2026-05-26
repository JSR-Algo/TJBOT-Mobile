# Mobile Stability Release Gate

Date: 2026-05-14 15:45 +07
Last refreshed: 2026-05-14 16:22 +07
Scope: Goal 10 from `docs/superpowers/plans/2026-05-14-mobile-stability-goals.md`
System: sys-16, tbot-mobile

## Verdict

Conditionally stable.

Required local release-gate commands pass with fresh evidence:

- `npm run typecheck`
- `npm run lint`
- `npm test -- --detectOpenHandles`
- `npm run test:integration`
- `npm run i18n:check`
- `npm run flows:fast`
- `npm run sequences:fast`
- `npm run erd:fast`
- `npm run usecases:check`

Optional local backend + AI smoke also passes when the local backend and AI
services are explicitly provisioned. This is still not fully stable for a
production release because Detox iOS runtime proof is blocked by local Xcode
destination/platform configuration before app compilation.

## Command Matrix

Run from `/Users/manhhodinh/Documents/TBOT/tbot-mobile` unless noted.

| Command | Exit | Result | Observed output |
| --- | ---: | --- | --- |
| `npm run typecheck` | 0 | PASS | `tsc --noEmit`; no TypeScript errors. |
| `npm run lint` | 0 | PASS | `eslint src/ tests/`; no lint output. |
| `npm test -- --detectOpenHandles` | 0 | PASS | `Test Suites: 1 skipped, 78 passed, 78 of 79 total`; `Tests: 19 skipped, 624 passed, 643 total`; no open-handle report after XState actor cleanup. |
| `npm run test:integration` | 0 | PASS | `PASS integration tests/integration/auth-isolation.test.ts`; `Test Suites: 1 passed, 1 total`; `Tests: 3 passed, 3 total`. |
| `npm run i18n:check` | 0 | PASS | `TOTAL hardcoded ...: 0`; `EN keys: 989`; `VI keys: 989`; `Delta: 0`; `bundle check: N/A (bare RN -- locales imported statically)`. |
| `npm run flows:fast` | 0 | PASS | `[flows:extract] {"states":127,"edges":0,"groups":15,"dynamicCalls":0,"orphanSubcomponents":0}`; `[flows:generate] wrote=0 files (check=false); total=27`; `[validate] generated-sha(15 files): OK`; `[validate] ALL CHECKS PASSED`. |
| `npm run sequences:fast` | 0 | PASS | `sequences:validate`: AC-1, AC-4, AC-9, AC-11, AC-13 all OK; `validate-mermaid`: `OK -- 102 files parsed as sequence diagrams`; `build-index`: `README.md is up to date`. |
| `npm run erd:fast` | 0 | PASS | `[validate-erd] dbml-syntax: OK (109 files)`; `entity-md-frontmatter: OK (107 entity .md files)`; `[validate-erd] ALL CHECKS PASSED`. |
| `npm run usecases:check` | 0 | PASS | `check-uc-sections: checked=154, skeletons=0, failures=0`; `PASS AC1 count=154`; `check-lane-coverage: 15 domains across 4 lanes`; `check-backend-sentinel: checked=154, failures=0`. |
| `npm run e2e:mobile:local` | 1 | FAIL | With backend only and default `AI: http://localhost:3001/api/ai`, backend/mobile flows passed but AI endpoints failed: `Results: 11/13 passed`; failures were `POST /v1/stt/transcribe` and `POST /v1/llm/chat` because no local AI service/proxy was available at the default hosted-path shape. |
| `TBOT_AI_URL=http://localhost:3001 npm run e2e:mobile:local` | 0 | PASS | With local Postgres, Redis, backend on `localhost:3000`, and AI service on `localhost:3001`, all mobile API smoke steps passed: `Results: 13/13 passed`; `All tests passed — app is ready for phone testing!`. |
| `cd /Users/manhhodinh/Documents/TBOT/tbot-backend && npm run typecheck` | 0 | PASS | Backend typecheck passed after narrow `jose` CommonJS/ESM runtime-import fix. |
| `cd /Users/manhhodinh/Documents/TBOT/tbot-backend && npm run build` | 0 | PASS | `nest build` completed; restarted backend from rebuilt `dist` before rerunning mobile E2E. |
| `cd /Users/manhhodinh/Documents/TBOT/tbot-backend && npx eslint --max-warnings=0 src/gateway/auth.guard.ts src/gateway/websocket.gateway.ts src/modules/auth/jwt-auth-service.ts` | 0 | PASS | Touched backend JWT files lint clean. `npm run lint -- --max-warnings=0 ...` was also attempted but the package script scans all `src,tests` and failed on 9 pre-existing unrelated warnings. |
| `cd /Users/manhhodinh/Documents/TBOT/tbot-backend && DATABASE_URL=postgresql://tbot:tbot@localhost:5432/tbot node scripts/migrate.js` | 0 | PASS | Applied 71 UP migration files to throwaway local Postgres. |
| `cd /Users/manhhodinh/Documents/TBOT/tbot-ai-services && uv pip install -r requirements.txt` | 0 | PASS | Installed missing local AI runtime packages including `python-multipart==0.0.28`; required because `uv sync` from `pyproject.toml` alone omitted it. |
| `npm run detox:build:ios` | 1 | FAIL | Simulator service is reachable and lists iOS 26.4 devices, but Detox build fails before app compilation: `xcodebuild: error: Found no destinations for the scheme 'TJBotMobile' and action build.` `xcodebuild -showdestinations -sdk iphonesimulator` only reports an ineligible placeholder: `iOS 26.5 is not installed`. |
| `npm run detox:test:ios` | not run | BLOCKED | Skipped because `npm run detox:build:ios` did not produce `ios/build/Build/Products/Debug-iphonesimulator/TJBotMobile.app`. |

## Continuation Refresh

Fresh required local gates were rerun at 2026-05-14 16:22 +07 from `/Users/manhhodinh/Documents/TBOT/tbot-mobile`.

| Command | Exit | Result | Observed output |
| --- | ---: | --- | --- |
| `npm run typecheck -- --pretty false` | 0 | PASS | `tsc --noEmit --pretty false`; no TypeScript errors. |
| `npm run flows:fast` | 0 | PASS | `states=127`, `generated-sha(15 files): OK`, `ALL CHECKS PASSED`. |
| `npm run usecases:check` | 0 | PASS | `checked=154`, `skeletons=0`, `failures=0`, `check-backend-sentinel: checked=154, failures=0`. |
| `npm run lint` | 0 | PASS | `eslint src/ tests/`; no lint output. |
| `npm test -- --detectOpenHandles` | 0 | PASS | `Test Suites: 1 skipped, 78 passed, 78 of 79 total`; `Tests: 19 skipped, 624 passed, 643 total`; no open-handle failure. |
| `npm run test:integration` | 0 | PASS | `PASS integration tests/integration/auth-isolation.test.ts`; `Tests: 3 passed, 3 total`. |
| `npm run i18n:check` | 0 | PASS | hardcoded strings `0`; EN keys `989`; VI keys `989`; delta `0`. |
| `npm run sequences:fast` | 0 | PASS | `102 files parsed as sequence diagrams`; `README.md is up to date`. |
| `npm run erd:fast` | 0 | PASS | `dbml-syntax: OK (109 files)`; `ALL CHECKS PASSED`. |

## Failing Tests

None in required Jest gates.

- `npm test`: no failing test suites; 1 suite skipped, 78 passed.
- `npm run test:integration`: no failing test suites; 1 passed.
- Optional default `npm run e2e:mobile:local`: AI service failures only under default `/api/ai` local URL shape; rerun with `TBOT_AI_URL=http://localhost:3001` passes 13/13.

## Closed Blockers

| Blocker | Evidence | Closure |
| --- | --- | --- |
| Lint debt blocked release gate. | Previous `npm run lint` exited 1 with 256 problems. | Narrow lint cleanup was applied; fresh `npm run lint` exits 0 with no output. |
| Sequence Mermaid validator dependency missing. | Previous `npm run sequences:fast` could not import `@mermaid-js/parser`. | Added `@mermaid-js/parser` and `mermaid` dev dependencies; fresh validator imports and runs. |
| Sequence Mermaid parse errors. | After dependency install, `validate-mermaid` failed 17 `.sequence.mmd` files, then 3 remaining files after first cleanup. | Simplified parser-hostile note/message punctuation in hand-authored sequence files and regenerated `sequences/README.md`; fresh `npm run sequences:fast` exits 0. |
| Unit suite teardown warning. | Previous `npm test` exited 0 but reported a Jest worker force-exit leak warning. `npm test -- --detectOpenHandles` traced 3 open XState timers to `tests/state/machines/devicePairing.machine.test.ts`. | Added `afterEach` actor cleanup and timer reset. Fresh `npm test -- --detectOpenHandles` exits 0 with no open-handle report. |
| Optional local backend E2E was previously unavailable. | Docker was started; Postgres and Redis throwaway containers were created; backend migrations applied. | Local backend started on port 3000; mobile backend/API smoke passed. |
| Backend JWT verification failed under CommonJS runtime. | `npm run e2e:mobile:local` initially failed `POST /auth/consent` and `POST /households` with `ERR_REQUIRE_ESM` from compiled `dist/gateway/auth.guard.js` requiring `jose`. | Narrow backend fix preserves runtime `import('jose')` via `new Function(...)` in JWT auth paths; `npm run typecheck`, `npm run build`, and rerun E2E pass. |
| Local AI service could not start. | `uvicorn src.main:app --port 3001` failed: `Form data requires "python-multipart" to be installed`. | `uv pip install -r requirements.txt` installed missing runtime dependency; AI service started and full mobile E2E passed with explicit `TBOT_AI_URL=http://localhost:3001`. |

## Remaining Blockers And Owners

| Blocker | Evidence | Next owner goal |
| --- | --- | --- |
| Optional iOS Detox not proven. | `xcrun simctl list devices available` succeeds, but `npm run detox:build:ios` exits 1: Xcode finds no eligible destination for scheme `TJBotMobile`; `-showdestinations` reports only an ineligible iOS placeholder with `iOS 26.5 is not installed`. | iOS tooling owner: install matching iOS 26.5 platform/runtime or adjust Xcode/Detox destination config to an eligible installed simulator, then run `npm run detox:build:ios && npm run detox:test:ios`. |
| Default local AI URL shape is not standalone-service compatible. | `npm run e2e:mobile:local` derives `http://localhost:3001/api/ai`, while local `tbot-ai-services` exposes `/v1/...` at root. | Mobile/config owner: decide whether local script should default to root AI service URL for local runs or keep hosted proxy shape and document `TBOT_AI_URL=http://localhost:3001`. |
| AI service dependency source of truth is split. | `requirements.txt` includes `python-multipart`, but `pyproject.toml` does not; `uv sync` omitted it and service failed at import time. | AI service owner: add `python-multipart` and other runtime-only requirements to `pyproject.toml`, then regenerate lock and verify `uv sync && uv run uvicorn src.main:app`. |
| Backend worker jobs emit errors against throwaway schema during local E2E. | While server stayed up, background `AnalyticsAggregationService` and `CostAnomalyWorker` logged missing-table/missing-column errors against migrated local DB. | Backend owner: either disable scheduled workers in local mobile E2E mode or align worker queries/migrations with throwaway schema. |
| Dependency/runtime hygiene remains. | `npm install` reported Node engine warnings: current Node `v20.18.1`; RN packages request `>=20.19.4`; `npm audit` reports 24 vulnerabilities. | Toolchain owner: upgrade Node to `>=20.19.4`, then triage `npm audit` separately. |

## QA Handoff

QA can start local functional review from this build under a conditionally
stable verdict. Required static, unit, integration, and docs validators are
green. Optional API smoke is green when local backend and AI services are
started with the explicit AI URL override:

```sh
cd /Users/manhhodinh/Documents/TBOT/tbot-mobile
TBOT_AI_URL=http://localhost:3001 npm run e2e:mobile:local
```

Treat Detox simulator behavior as unverified until the iOS destination blocker
is closed.

Files changed in this gate include:

- `package.json`
- `package-lock.json`
- `src/hooks/useGeminiConversation.ts`
- `tests/state/machines/devicePairing.machine.test.ts`
- Lint cleanup across touched `src/**` and `tests/**` files
- `migrate-ui-ux-to-mobile-app-docs/sequences/README.md`
- `migrate-ui-ux-to-mobile-app-docs/sequences/01-identity/account-delete.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/01-identity/account-export.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/01-identity/child-add.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/01-identity/child-delete.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/01-identity/coppa-consent-record.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/01-identity/logout.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/01-identity/pin-recovery.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/01-identity/session-revoke.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/04-realtime/session-start-mobile.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/06-content/entitlement-grant-mobile.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/07-parent/freshness-refresh.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/07-parent/household-transfer-primary.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/07-parent/parent-gate-validate.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/19-billing/checkout-initiate-mobile.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/19-billing/invoice-history.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/19-billing/refund-request.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/sequences/19-billing/subscription-lifecycle.sequence.mmd`
- `migrate-ui-ux-to-mobile-app-docs/architecture/TEST_MATRIX.md`
- `migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-05-14-mobile-stability-release-gate.md`
- `../tbot-backend/src/gateway/auth.guard.ts`
- `../tbot-backend/src/gateway/websocket.gateway.ts`
- `../tbot-backend/src/modules/auth/jwt-auth-service.ts`
