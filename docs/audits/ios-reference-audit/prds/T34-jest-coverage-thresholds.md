# T34: Add Jest coverage thresholds

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: LOW

## Problem
The TJBot-mobile Jest configuration has no coverage gate. `package.json` defines a multi-project Jest setup (lines 116–163) but omits `collectCoverage`, `coverageThreshold`, and `coveragePathIgnorePatterns`. Consequently:

- New source files can land without any unit-test coverage.
- CI has no coverage job and no artifact, so the team has no measurable signal of test-health drift.
- The audit explicitly flags this as a gap: `reports/testing-quality.md` line 88 notes the missing Jest coverage fields, and the top-3 quick wins (line 109) recommend adding thresholds and a coverage job starting at 50 % lines for `src/`.

## Scope
### In scope
- `package.json` — add root-level (and/or per-project) Jest coverage configuration.
- `.github/workflows/ci.yml` — add a `mobile-coverage` CI job that runs the unit tests with coverage, enforces the threshold, and uploads the report.
- `tests/verification/T34-jest-coverage-thresholds.test.ts` — this PRD’s verification test.

### Out of scope
- Source code under `src/**` (registry `non_scope`).
- Existing tests under `tests/**` (registry `non_scope`); this task does not require writing new behavioral tests to raise coverage.
- Native build jobs (`mobile-android-build`, `mobile-ios-build`).
- Docs-integrity workflow split (handled by T33).

## Proposed solution
1. **Add root-level Jest coverage configuration in `package.json`.**
   Example shape:
   ```json
   "jest": {
     "collectCoverage": true,
     "coverageDirectory": "coverage",
     "coverageReporters": ["text", "lcov", "json-summary"],
     "coverageThreshold": {
       "global": {
         "lines": 50
       }
     },
     "coveragePathIgnorePatterns": [
       "node_modules/",
       "tests/",
       "ios/",
       "android/",
       "src/__generated__/",
       "src/native/",
       "src/components/gemini/",
       "src/hooks/useGeminiConversation.ts",
       "src/audio/PcmStreamPlayer.ts",
       "src/services/ai/liveMessageAudio.ts"
     ],
     "projects": [ ... ]
   }
   ```
   - `coverageThreshold.global.lines` starts at `50` (the registry’s recommended starting point) and can be ratcheted upward as coverage improves.
   - `coveragePathIgnorePatterns` excludes generated code, native module glue, and dead code scheduled for deletion by T18/T19 so that the gate measures meaningful source files only.
2. **Propagate coverage settings to each Jest project if Jest requires per-project thresholds.**
   If the multi-project runner does not honor root-level `coverageThreshold`, add `collectCoverage`, `coverageThreshold`, and `coveragePathIgnorePatterns` to each project object as well, matching the root values.
3. **Add a `mobile-coverage` job in `.github/workflows/ci.yml`.**
   - Run after the unit-test job (or in parallel with it) using `npm test -- --coverage`.
   - The `--coverage` flag combined with the configured threshold causes Jest to exit non-zero when coverage drops below 50 %.
   - Upload the `coverage/` directory as an artifact using `actions/upload-artifact@v4`.
4. **Validate locally before merging.**
   Run `npm test -- --coverage` and confirm the generated `coverage/lcov-report/index.html` shows the threshold line at 50 %.

## Acceptance criteria
1. `package.json` adds `collectCoverage` and `coverageThreshold` for `src/` (start at 50 % lines).
2. `coveragePathIgnorePatterns` excludes generated, native, and dead code scheduled for deletion.
3. CI has a coverage job that fails when coverage drops below the threshold.
4. Coverage report is uploaded as an artifact.

## Dependencies
- **T32 — Fix failing test baseline.** Coverage is meaningless while nine test suites fail; the baseline must be green before the coverage gate is enforced. T32 also closes the broken OpenAPI path issues that currently pollute `npm test` output.
- **T33 — Replace stub API-contract gate and split docs-integrity CI.** T33 reorganizes `.github/workflows/ci.yml`. Sequence T33 before T34 so the new `mobile-coverage` job lands in the already-split workflow layout and avoids merge conflicts on `package.json`/`ci.yml`.

## Exclusions / anti-overlap
- Do not edit `src/**` or existing test files to raise coverage as part of this task.
- No other task should modify the Jest coverage block in `package.json` or the coverage job in `.github/workflows/ci.yml` while T34 is in flight.
- Coordinate with T33 to avoid parallel edits to `.github/workflows/ci.yml` and `package.json`.

## Verification test plan
- **Test file:** `tests/verification/T34-jest-coverage-thresholds.test.ts`
- **What it proves:** `package.json` declares `collectCoverage`, a `global.lines` threshold of at least 50 %, and a non-empty `coveragePathIgnorePatterns` list; `.github/workflows/ci.yml` contains a `mobile-coverage` job that runs tests with `--coverage` and uploads a coverage artifact.
- **How to run it:** `npx jest tests/verification/T34-jest-coverage-thresholds.test.ts`
- **Expected state before fix:** FAIL
- **Expected state after fix:** PASS

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Enforcing a 50 % threshold fails CI immediately because many files are currently uncovered. | Set `coveragePathIgnorePatterns` to exclude generated, native, and dead code before the gate is enabled; run `npm test -- --coverage` locally and ratchet the threshold to the actual passing value if 50 % is too high. |
| Multi-project Jest ignores root-level `coverageThreshold`. | Add the same threshold block to each project object, or run coverage from a single merged project in the CI job. |
| Coverage collection slows local `npm test` if `collectCoverage: true` is set globally. | Make `collectCoverage` conditional on `process.env.CI` so local runs stay fast while CI always collects coverage. |
| The coverage artifact grows large or retains indefinitely. | Configure `retention-days: 14` on the `actions/upload-artifact` step and exclude `coverage/` from git via `.gitignore`. |

## Coordination notes
- **Infra/Release role:** Review the new CI job placement, artifact retention policy, and branch-protection rule so `mobile-coverage` becomes a required check after the threshold is stable.

## Implementation hints
- Read `package.json` lines 116–163 for the current Jest project structure.
- Read `.github/workflows/ci.yml` lines 33–65 for the existing `mobile-quality` job layout; model the new `mobile-coverage` job on the same checkout/setup-node/install pattern.
- Reference `reports/testing-quality.md` line 88 for the audit finding and line 109 for the quick-win recommendation.
- Keep the threshold at exactly 50 % unless local coverage is already higher; ratcheting up is easier than explaining an unexpectedly strict gate.
