# T33: Replace stub API-contract gate and split docs-integrity CI

## Status
Registry status: NOT_STARTED | Priority: P0 | Blast radius: MEDIUM

## Problem
The mobile repository ships a fake API-contract gate and overloads the `mobile-quality` CI job with documentation-integrity checks.

- `scripts/check-api-contract-sync.mjs` is a 5-line stub that unconditionally `process.exit(0)` (lines 1–5). The `mobile-api-contract-sync` job in `.github/workflows/ci.yml` (lines 67–79) runs `npm run api:contract-sync:check`, which is mapped in `package.json` (line 18) to that stub. The gate therefore never detects backend/mobile drift.
- `scripts/api-contract-sync.mjs` already implements the real OpenAPI-vs-mobile comparison, but it is not exercised in CI.
- The same `mobile-quality` job (lines 33–65) interleaves product-quality steps (`lint`, `typecheck`, `npm test`, integration tests, Expo config) with docs-integrity steps (`flows:validate`, `sequences:fast`, `erd:validate`, `usecases:check`). A stale Mermaid header or sequence-diagram allow-list therefore blocks the whole mobile-quality pipeline, which is the documented bottleneck in `reports/testing-quality.md` (lines 92–93, 100–101) and `reports/project-health.md` (lines 88–89).

Audit sources:
- `reports/testing-quality.md#improvements` (line 73) and `reports/testing-quality.md#simplifications` (lines 92–93)
- `reports/project-health.md#improvements` (line 55)

## Scope
### In scope
- `scripts/check-api-contract-sync.mjs` — delete or replace with a thin delegate.
- `.github/workflows/ci.yml` — rewire the API-contract job, remove docs-integrity steps from `mobile-quality`, and either add a new `docs-integrity` job in this file or create a separate workflow file.
- `package.json` — update the `api:contract-sync:check` script to invoke the real script and fail on drift.
- `tests/verification/T33-ci-contract-gate-docs-split.test.ts` — this PRD’s verification test.

### Out of scope
- `scripts/api-contract-sync.mjs` — the real comparison logic is already implemented; T33 only wires it into CI.
- `scripts/flows/validate-go-calls.mjs`, `scripts/sequences/validate-sequences.mjs` — behavior of the docs validators does not change; only where they run.
- Source code under `src/**`.
- Native build jobs (`mobile-android-build`, `mobile-ios-build`).

## Proposed solution
1. **Delete the stub or turn it into a delegate.** Remove `scripts/check-api-contract-sync.mjs`. Optionally keep a tiny wrapper that prints a deprecation warning and execs `api-contract-sync.mjs`, but deletion is preferred because the registry acceptance criterion explicitly says “deleted or delegates to the real script.”
2. **Point `api:contract-sync:check` at the real script with drift failure enabled.**
   ```json
   "api:contract-sync:check": "node scripts/api-contract-sync.mjs --fail-on-drift"
   ```
   The real script only exits non-zero when `--fail-on-drift` is passed, so this flag is required to satisfy “fails on endpoint drift.”
3. **Keep the `mobile-api-contract-sync` job but verify it still calls `npm run api:contract-sync:check`.** No other change is needed in that job block.
4. **Strip docs-integrity steps from `mobile-quality`.** Remove:
   - `npm run flows:validate`
   - `npm run sequences:fast`
   - `npm run erd:validate`
   - `npm run usecases:check`
   The job should retain lint, typecheck, unit tests, integration tests, token parity, screen-prop-types, route coverage, and Expo config validation.
5. **Create a separate docs-integrity workflow or job.** Recommended: add `.github/workflows/docs-integrity.yml` that runs the four removed validators on PRs touching `docs/**`, `scripts/flows/**`, `scripts/sequences/**`, `scripts/erd/**`, `scripts/usecases/**`, or `.github/workflows/docs-integrity.yml`. Alternatively, add a `docs-integrity` job to `ci.yml`. The acceptance criterion is satisfied as long as the four checks no longer live in `mobile-quality` and they run in their own job/workflow.
6. **Make the contract gate conditional on a stable OpenAPI fixture.** Because `scripts/api-contract-sync.mjs` resolves the OpenAPI file from `TBOT_BACKEND_OPENAPI_PATH` or from `../../backend/openapi.json` / `../tbot-backend/openapi.json`, the CI job should either set `TBOT_BACKEND_OPENAPI_PATH` to a checked-in fixture or coordinate with Backend to commit one. Until that path is stable, the gate will fail for the wrong reason.

## Acceptance criteria
1. CI runs `scripts/api-contract-sync.mjs` instead of the stub and fails on endpoint drift.
2. `scripts/check-api-contract-sync.mjs` is deleted or delegates to the real script.
3. Docs-integrity checks (flows, sequences, ERD, usecases) run in a separate workflow/job.
4. `mobile-quality` job focuses on lint, typecheck, unit/integration tests, and Expo config.

## Dependencies
- **T32 — Fix failing test baseline.** T32 is a fleet-wide integration prerequisite. The real contract gate will run against mobile source and a backend OpenAPI fixture; it must not be added while the baseline test suite is red. T32 also fixes the broken `openapi.json` symlink/path issues referenced in `reports/testing-quality.md` (line 74), which the real script depends on.

## Exclusions / anti-overlap
- No other task should modify `.github/workflows/ci.yml` or `package.json` scripts `api:contract-sync:check` while T33 is in flight.
- T34 (Jest coverage thresholds) also touches `.github/workflows/ci.yml` and `package.json`. Sequence T33 before T34 so the coverage job is added to the already-split workflow layout.

## Verification test plan
- **Test file:** `tests/verification/T33-ci-contract-gate-docs-split.test.ts`
- **What it proves:** The stub script is gone, the npm contract-sync script invokes the real script with `--fail-on-drift`, the `mobile-quality` job no longer runs docs-integrity validators, and the docs validators live in a separate CI job or workflow.
- **How to run it:** `npx jest tests/verification/T33-ci-contract-gate-docs-split.test.ts`
- **Expected state before fix:** FAIL
- **Expected state after fix:** PASS

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| The real `api-contract-sync.mjs` fails in CI because the backend OpenAPI fixture is missing or the symlink is unresolved. | Coordinate with Backend to commit a canonical `openapi.json` fixture and set `TBOT_BACKEND_OPENAPI_PATH` in the CI job. Do not merge T33 until a green contract-sync run is observed in CI. |
| Removing docs-integrity from `mobile-quality` hides docs rot if the new workflow has overly narrow path filters. | Trigger the docs-integrity workflow on any change to `docs/**`, the four validator scripts, or the workflow file itself; schedule a nightly run as a backstop. |
| Other PRs rely on `check-api-contract-sync.mjs` existing. | Delete it as part of the same PR that updates the npm script and workflow, and update the verification test to assert absence. |
| `--fail-on-drift` exposes a large backlog of drift. | Run the real script locally first; fix known drift under separate tasks or with Backend, then enable the gate. |

## Coordination notes
- **Backend role:** Confirm the canonical backend OpenAPI fixture path and ownership. The real script reads `backend/openapi.json` or `tbot-backend/openapi.json` by default, but a checked-in fixture under the mobile repo or a stable artifact URL may be preferable.
- **Infra/Release role:** Review the new workflow/job split and path filters. If docs-integrity is moved to a separate workflow, align branch protection rules so both `mobile-quality` and `docs-integrity` are required checks.

## Implementation hints
- Read `scripts/api-contract-sync.mjs` lines 20–23 to confirm the CLI flags (`--json`, `--no-write`, `--fail-on-drift`).
- Read `.github/workflows/ci.yml` lines 33–79 to see the current layout.
- Read `package.json` line 18 for the script mapping.
- If you choose a separate workflow, copy the checkout/setup-node/install pattern from `ci.yml`; keep the Node version at 22 and `cache-dependency-path: package-lock.json`.
- Consider setting an `artifacts/` upload step on `mobile-api-contract-sync` so the generated `api-contract-sync-report.md` is visible in PRs.
