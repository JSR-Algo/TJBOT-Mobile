# Remove Assignment PIN Verification

- Task: `adhoc-2026-08-18-remove-assignment-pin`
- Scope: `sys-16` mobile course-library assignment confirmation
- Implementation commits: `8a2bee33`, `f078e875`, `45b8ef23`
- Validation date: 2026-08-18
- Status: `DONE_WITH_CONCERNS` (all gates pass after exposing the bundled Node runtime to child processes; the first unit-suite attempt failed because `node` was absent from child-process `PATH`)

## Acceptance Criteria

1. Assignment confirmation renders no PIN prompt and makes no parent-auth API call.
2. Course enrollment remains single-submit and preserves errors, cache invalidation, and navigation.
3. Parent Settings PIN behavior remains unchanged.

## Acceptance Verdicts

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| PIN-free assignment confirmation | PASS | Focused Jest: 2 suites and 49 tests passed. Course-library production has no scope-scan match; the two test matches are negative assertions that the old PIN copy is absent. |
| Single-submit enrollment and retained behavior | PASS | Focused Jest includes the pending duplicate-action regression and assignment error/navigation coverage; 49/49 tests passed. Full unit and integration suites also passed. |
| Parent Settings remains PIN-protected | PASS | Parent scope scan retained `authenticateParent`, PIN entry, rejection, lockout, and re-enable coverage; `parent-settings.test.tsx` passed in the full unit suite. |

## Validation Evidence

| Check | Exact command | Exit | Key evidence |
| --- | --- | ---: | --- |
| TypeScript | `/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc --noEmit` | 0 | No TypeScript diagnostics. |
| ESLint | `/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js src/ tests/ --max-warnings=0` | 0 | No warnings or errors. |
| Unit Jest, initial environment attempt | `/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/jest/bin/jest.js --selectProjects unit --runInBand` | 1 | 225 suites passed, 4 failed; 2,710 tests passed and 17 failed. All failures were `spawnSync node ENOENT` in tests that launch child Node processes. |
| Unit Jest, child runtime available | `PATH=/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node node_modules/jest/bin/jest.js --selectProjects unit --runInBand` | 0 | 229 suites passed, 1 skipped; 2,727 tests passed, 19 skipped. |
| Focused assignment Jest | `PATH=/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node node_modules/jest/bin/jest.js --selectProjects unit --runTestsByPath tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx --runInBand` | 0 | 2 suites passed; 49 tests passed. |
| Integration Jest | `PATH=/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node node_modules/jest/bin/jest.js --selectProjects integration --runInBand` | 0 | 3 suites passed; 6 tests passed. |
| Flow validator | `/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/flows/validate-go-calls.mjs` | 0 | Generated SHA checked for 16 files; 13 domain README files scanned; all checks passed. |
| Sequence validators | `/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sequences/validate-sequences.mjs && /Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sequences/validate-mermaid.mjs && /Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sequences/build-index.mjs --check` | 0 | 22 systems and 103 sequence files validated; 103 Mermaid files parsed; index current. |
| ERD validator | `/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/erd/validate-erd.mjs` | 0 | 109 DBML files and 107 entity Markdown files validated; all checks passed. |
| Use-case validators | `/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/usecases/check-uc-sections.mjs && /Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/usecases/check-index-coverage.mjs && /Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/usecases/check-lane-coverage.mjs && /Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/usecases/check-edge-case-enum.mjs && /Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/usecases/check-backend-sentinel.mjs` | 0 | 157 use cases checked; 154 indexed IDs; 15 domains across 4 lanes; zero failures. |
| Token parity | `/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/check-token-parity.mjs` | 0 | 7 token files verified. |
| Route coverage | `/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/check-route-coverage.mjs` | 0 | 135 screen files, 127 routes, 127 feature registrations, zero duplicates. |
| Screen prop types | `/Users/manhhodinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/check-screen-prop-types.mjs` | 0 | 135 screen files checked. |
| Parent PIN scope scan | `rg -n "authenticateParent|Parent PIN" src/features/parent tests/e2e/parent-settings.test.tsx` | 0 | Retained parent gate production matches and parent-settings success, rejection, lockout, and re-enable test coverage. |
| Course-library PIN scope scan | `rg -n "authenticateParent|Parent PIN|PARENT PIN" src/features/course-library tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx` | 0 | Only two negative assertions remain in `course-library-flow.test.tsx`; no production or authentication-call match. |
| Cumulative diff check and status | `git diff --check ce94b256..HEAD && git status --short` | 0 | No whitespace errors; worktree was clean before this QA file was created. |
| Changed-file forbidden-pattern scan | `rg -n "TODO|FIXME|HACK|@ts-ignore|@ts-expect-error|unknown as|\bany\b" src/features/course-library/UnlockConfirmModal.tsx tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx` | 0 | Two pre-existing test-language matches: `expect.any(Array)` and prose containing `any`; neither is a TypeScript suppression. |
| Added-line forbidden-pattern scan | `git diff -U0 ce94b256..HEAD -- src/features/course-library/UnlockConfirmModal.tsx tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx \| rg -n '^\+[^+].*(TODO\|FIXME\|HACK\|@ts-ignore\|@ts-expect-error\|unknown as\|\bany\b)'` | 1 | Expected no-match exit; no forbidden pattern was introduced in added production/test lines. |

## Scope Findings

- The implementation diff from `ce94b256..HEAD` changes only `UnlockConfirmModal.tsx` and the two planned course-library test files: 50 insertions and 204 deletions.
- Course-library production no longer references `authenticateParent` or PIN copy. The focused test retains only explicit absence assertions for `Parent PIN required` and `PARENT PIN`.
- Parent PIN behavior remains present in `ParentGateScreen.tsx` and is exercised by `parent-settings.test.tsx`, including accepted PIN, rejected PIN, lockout, and retry behavior.
- No API endpoint, request payload, route, parent production file, or unrelated test file changed in the cumulative implementation diff.

## Honest Notes

- The first full unit invocation used the bundled Node executable directly, but child tests resolve `node` through `PATH`; it failed for that environment reason. The complete suite passed after adding the same bundled runtime directory to `PATH`. This is recorded as a validation-environment concern, not hidden as a green first attempt.
- TypeScript and ESLint are legitimately silent on success; the file-count requirement applies to documentation validators, all of which emitted non-zero coverage.
- No native Detox build or simulator run was requested for this ad-hoc evidence task. Residual risk is limited to unverified device-level rendering/tap behavior; Jest covers the accessible action and submission logic.
