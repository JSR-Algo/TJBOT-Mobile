# Remove Assignment PIN Verification

- Task: `adhoc-2026-08-18-remove-assignment-pin`
- Scope: `sys-16` course-library assignment and its parent-gate/use-case documentation
- Validation date: 2026-08-18
- Commit A: `d277d7b305d8320071da45d1eae7b115b2636203`
- Audited range: `ce94b256..d277d7b305d8320071da45d1eae7b115b2636203`
- Range rule: the audit includes Commit A and excludes this QA refresh commit (Commit B).
- Status: `VERIFIED_WITH_RESIDUALS`

## Acceptance Criteria

1. Course assignment confirmation renders no PIN prompt, makes no parent-auth call, and remains single-submit.
2. Assignment errors, query invalidation, metadata forwarding, navigation, and English/Vietnamese copy remain covered.
3. Parent Summary and Parent Settings open directly; `ParentGateScreen` authenticates only when explicitly navigated.
4. Parent-gate documentation contains no duplicate Robot activation use case; purchase UC-BU13 / `UC_BUY_ACTIVATE` remains canonical.
5. Use-case generators reproduce the PIN-free assignment aliases and edges without a course-library parent-gate dependency.
6. The exact range above is reproducible, and this QA commit is not part of the audited evidence.

## Acceptance Verdicts

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| PIN-free, single-submit assignment | PASS | Fresh course-library and progress suites passed within the 4-suite focused run; production course-library code has no PIN/auth match. |
| Retained assignment behavior and localization | PASS | Fresh focused run passed 103/103 tests, including assignment errors, metadata/navigation, duplicate-submit, Parent Settings, and i18n coverage. |
| Current parent-gate behavior documented accurately | PASS | Home routes open Parent Summary/Settings directly; `useParentGateGuard` is a no-op; explicit gate success calls `markGated()` and replaces to the requested target. |
| Duplicate activation retired | PASS | Active docs contain no retired parent-gate unlock alias; parent-gate diagrams contain only `UC_PG_PASS`; purchase index retains UC-BU13 alias `UC_BUY_ACTIVATE`. |
| Generators preserve the current model | PASS | Full regeneration emits 154 index entries and 89 cross-domain edges; UC-CL04 maps to `UC_CL_CONFIRM_ADD`, and no UC-CL01 to UC-PR01 edge exists. |
| Exact audit boundary | PASS | `git log`, `git diff --name-status`, `git diff --stat`, and `git diff --check` were run against `ce94b256..d277d7b3...`; Commit B is excluded by construction. |

## Fresh Validation Evidence

| Check | Exact command | Exit | Key evidence |
| --- | --- | ---: | --- |
| Focused Jest | `PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH npx jest --selectProjects unit --runInBand --runTestsByPath tests/e2e/course-library-flow.test.tsx tests/e2e/course-progress-stability.test.tsx tests/e2e/parent-settings.test.tsx tests/services/i18n-app-language.test.ts` | 0 | 4 suites passed; 103 tests passed; 0 snapshots. |
| TypeScript | `PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH npx tsc --noEmit` | 0 | No diagnostics. |
| ESLint | `PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH npm run lint` | 0 | `eslint src/ tests/ --max-warnings=0`; no warnings or errors. |
| Flow validator | `PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH npm run flows:validate` | 0 | Generated SHA checked for 16 files; 13 domain READMEs scanned; all checks passed. |
| Use-case validators | `PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH npm run usecases:check` | 0 | 157 use cases checked; 154 indexed IDs; 15 domains across 4 lanes; zero failures. |
| Index generator | `PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH node scripts/usecases/_build-index.mjs` | 0 | Wrote 154 index entries and 38 alias overrides. |
| Cross-domain generator | `PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH node scripts/usecases/_build-cross-domain.mjs` | 0 | Wrote 55 base edges. |
| Lane-edge merge | `PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH node scripts/usecases/_merge-lane-edges.mjs` | 0 | Added 34, skipped 16 duplicates, total 89 edges. |
| Second regeneration | Run the same three generator commands again and compare `git diff --binary` SHA-256 before/after | 0 | Hash remained `de190f16cd1c40766e83726584b718b967e16b09dc5a93365b75ab29e11fed34`; clean/idempotent. |
| Generator ESLint | `PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH npx eslint scripts/usecases/_build-index.mjs scripts/usecases/_build-cross-domain.mjs --max-warnings=0` | 0 | No warnings or errors. |
| Generator syntax | Bundled Node `--check` for both changed builder scripts | 0 | Both modules parse. |
| JSON parse/counts | Bundled Node parsed the three generated reference JSON files and compared each `total` to its array length | 0 | Index 154; overrides 38; edges 89. |
| PlantUML syntax/render | `plantuml --check-syntax ...parent-gate.usecase.puml .../diagrams/parent-gate.usecase.puml && plantuml --png ...parent-gate.usecase.puml` | 0 | Both sources parse; rerender completed. |
| Render determinism | SHA-256 before and after rerender | 0 | Both hashes: `3374ef0fc2e22024a726074de1e62ba0a2a10e1431aa0887307b6e1066909b9d`. |
| Exact-range whitespace | `git diff --check ce94b256..d277d7b305d8320071da45d1eae7b115b2636203` | 0 | No whitespace errors. |
| i18n hardcoded scan | `PATH=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH npm run i18n:scan` | 1 | 23 unrelated pre-existing hardcoded strings; none are in files changed by this task's implementation/localization commits. |

## Historical Broad-Suite Evidence

These earlier runs remain relevant to the audited range and are not represented as fresh runs for this QA refresh:

- Full unit suite: 229 suites passed, 1 skipped; 2,727 tests passed, 19 skipped after adding the bundled Node directory to child-process `PATH`.
- Initial full-unit environment attempt: 225 suites passed and 4 failed because child processes could not resolve `node` (`spawnSync node ENOENT`).
- Integration suite: 3 suites passed; 6 tests passed.

## Exact Range Commits

Command:

```sh
git log --reverse --format='%H %s' ce94b256..d277d7b305d8320071da45d1eae7b115b2636203
```

Output:

```text
8a2bee333f4f6b1167aa0a72f4a8770d329c14a7 test(course-library): require PIN-free assignment confirmation
f078e875bdb9d937cfe41b8b3e50a4c65defafdd fix(course-library): remove assignment PIN gate
45b8ef235d241dd80dedc524860590b414a08f8d fix(course-library): prevent duplicate course assignment
8224de39da75a88cae44f734f87b6920d955cce3 docs(course-library): record assignment PIN removal evidence
efafd0200ea4068d68f47d72150191760576ee5f docs(course-library): correct assignment evidence range
8d2dbf1e70029bb51e240772d7e005f4fef4db6d docs(course-library): make assignment evidence reproducible
621b7027686b4214ca36129359e0db27c4e4f62c fix(course-library): localize PIN-free assignment flow
4a3f9e232429735bde145d04c7a72173a19a3b2b docs(course-library): detach assignment from parent PIN gate
07c8bbe90a8e375927b678a1366c23aad9cfc4a9 docs(course-library): correct parent gate model and renders
bbcaed1aed6d3bead4d6f24f0bd038f1745083c7 docs(parent-gate): retire duplicate activation use case
3744769c2dfed6f201249ed4277e4855d194eb14 docs(course-library): refresh PIN removal evidence
d277d7b305d8320071da45d1eae7b115b2636203 fix(usecases): keep PIN-free assignment generators current
```

## Exact Range File Audit

Command:

```sh
git diff --name-status ce94b256..d277d7b305d8320071da45d1eae7b115b2636203
```

Output:

```text
M	migrate-ui-ux-to-mobile-app-docs/architecture/use-case-diagram.md
M	migrate-ui-ux-to-mobile-app-docs/architecture/usecases/README.md
M	migrate-ui-ux-to-mobile-app-docs/architecture/usecases/TBOT-CourseLibrary.png
M	migrate-ui-ux-to-mobile-app-docs/architecture/usecases/TBOT-ParentGate.png
M	migrate-ui-ux-to-mobile-app-docs/architecture/usecases/course-library.usecase.puml
M	migrate-ui-ux-to-mobile-app-docs/architecture/usecases/parent-gate.usecase.puml
M	migrate-ui-ux-to-mobile-app-docs/migration/usecase-model-mobile.md
M	migrate-ui-ux-to-mobile-app-docs/qa/2026-06-30-adhoc-lesson-production-readiness.md
A	migrate-ui-ux-to-mobile-app-docs/qa/ad-hoc/2026-08-18-remove-assignment-pin.md
M	migrate-ui-ux-to-mobile-app-docs/qa/usecase-model-verification-2026-05-11.md
M	migrate-ui-ux-to-mobile-app-docs/usecases/actors/parent.md
M	migrate-ui-ux-to-mobile-app-docs/usecases/domains/course-library/backend-mapping.md
M	migrate-ui-ux-to-mobile-app-docs/usecases/domains/course-library/diagrams/course-library.usecase.puml
M	migrate-ui-ux-to-mobile-app-docs/usecases/domains/course-library/edge-cases.md
M	migrate-ui-ux-to-mobile-app-docs/usecases/domains/course-library/use-cases.md
M	migrate-ui-ux-to-mobile-app-docs/usecases/domains/parent-gate/diagrams/parent-gate.usecase.puml
M	migrate-ui-ux-to-mobile-app-docs/usecases/domains/parent-gate/hot/UC-PR01.md
M	migrate-ui-ux-to-mobile-app-docs/usecases/domains/parent-gate/use-cases.md
M	migrate-ui-ux-to-mobile-app-docs/usecases/reference/alias-overrides.json
M	migrate-ui-ux-to-mobile-app-docs/usecases/reference/backend-mapping.md
M	migrate-ui-ux-to-mobile-app-docs/usecases/reference/clean-architecture-recs.md
M	migrate-ui-ux-to-mobile-app-docs/usecases/reference/cross-domain-edges.json
M	migrate-ui-ux-to-mobile-app-docs/usecases/reference/use-case-index.json
M	scripts/usecases/_build-cross-domain.mjs
M	scripts/usecases/_build-index.mjs
M	src/features/course-library/UnlockConfirmModal.tsx
M	src/services/i18n/locales/en.json
M	src/services/i18n/locales/vi.json
M	tests/e2e/course-library-flow.test.tsx
M	tests/e2e/course-progress-stability.test.tsx
M	tests/services/i18n-app-language.test.ts
```

The QA path appears as added because earlier commits in the audited range created it. The Commit B update to that path is outside the range.

Command:

```sh
git diff --stat ce94b256..d277d7b305d8320071da45d1eae7b115b2636203
```

Summary:

```text
31 files changed, 387 insertions(+), 384 deletions(-)
```

## Scope Scans

### Course-Library PIN Removal

```sh
rg -n 'authenticateParent|Parent PIN|PARENT PIN' \
  src/features/course-library \
  tests/e2e/course-library-flow.test.tsx \
  tests/e2e/course-progress-stability.test.tsx
```

Only the two intended negative assertions remain:

```text
tests/e2e/course-library-flow.test.tsx:177:    expect(screen.queryByText('Parent PIN required')).toBeNull();
tests/e2e/course-library-flow.test.tsx:178:    expect(screen.queryByText('PARENT PIN')).toBeNull();
```

### Current Parent-Gate Boundary

- `HomeHubScreen` navigates directly to Parent Summary and Parent Settings.
- `SafetyRedirectScreen` is the current explicit in-app entry to `ParentGateScreen`.
- `ParentGateScreen` calls `authenticateParent({ pin })`; success calls the in-memory `markGated()` helper and replaces to the requested target.
- A false auth response stays on the gate; `423` routes to lockout; `429` applies a timed cooldown; other failures show retry copy.
- `useParentGateGuard` intentionally does not redirect, so parent surfaces are not automatically protected by this compatibility route.

### Use-Case Alias Audit

```sh
rg -n 'UC_PG_''UNLOCK' scripts/usecases migrate-ui-ux-to-mobile-app-docs
```

Result: no active generator or documentation matches.

Purchase activation remains canonical in `use-case-index.json`:

```text
"id": "UC-BU13"
"UC_BUY_ACTIVATE"
```

The generators now contain the same canonical mapping:

```text
UC-CL04 -> UC_CL_CONFIRM_ADD
UC-CL03 -> UC-CL04: PIN-free Add to Robot confirmation
UC-CL01 -> UC-PR01: absent
```

## Residual Risk

- `npm run i18n:scan` still reports 23 unrelated pre-existing strings across fallback, course detail, progress, onboarding, device pairing, and parent safety screens.
- Detox/native simulator testing was not run, so device-level rendering and tap behavior remain outside this evidence set.
- Locale bundle freshness is not a separate artifact concern: `resources.ts` statically imports `en.json` and `vi.json`; fresh JSON parsing and i18n tests cover the changed locale resources.
