# T02: Jest, lint, and package hygiene

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: MEDIUM

## Problem
The mobile project's package-level tooling is inconsistent and allows lint/test misconfiguration to persist:

- `package.json` lines 10–11 define both `"build"` and `"typecheck"` as `tsc --noEmit`, giving two names for the same command.
- `package.json` line 127 maps `expo-av` in Jest's `moduleNameMapper`, but `expo-av` is not a dependency (`expo-audio` is used instead). The stale mapper can hide missing-dependency errors.
- `package.json` lines 143–145 `transformIgnorePatterns` only whitelists `react-native`, `@react-native`, `@react-navigation`, `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `expo-secure-store`, and `expo`. It omits the ESM packages used at runtime: `@orbital-systems/react-native-esp-idf-provisioning`, `@google/genai`, `lucide-react-native`, `posthog-react-native`, `@sentry/react-native`, and `axios`, so Jest can fail on untransformed imports.
- `eslint.config.js` line 42 disables `@typescript-eslint/no-require-imports` globally because `metro.config.js` uses `require`. This weakens linting across `src/` and `tests/`.
- `package.json` does not declare `engines.node` or `browserslist`, so Node and bundle targets are unconstrained.

Sources:
- `docs/audits/ios-reference-audit/reports/project-health.md#improvements` (duplicate scripts, stale mapper, transform-ignore list, eslint override, missing engines/browserslist)
- `docs/audits/ios-reference-audit/reports/project-health.md#simplifications` (keep `typecheck`, delete `build`)
- `docs/audits/ios-reference-audit/reports/testing-quality.md#improvements` (Jest configuration baseline)

## Scope
### In scope
- `package.json`
  - `scripts` block: deduplicate `build` / `typecheck`
  - `jest.moduleNameMapper`: remove `expo-av` mapping
  - `jest.projects[*].transformIgnorePatterns`: whitelist missing ESM packages
  - Add `engines.node` and `browserslist`
- `eslint.config.js`
  - Move `@typescript-eslint/no-require-imports: off` from the global rules into a scoped override for config files only

### Out of scope
- `src/**` — no source code changes
- `tests/__mocks__/expo-av.ts` — the mock file itself is explicitly excluded; deleting it is not required for this task (it simply becomes unreferenced)
- `metro.config.js` / `babel.config.js` content changes
- Upgrading dependencies
- Adding coverage thresholds or additional Jest projects

## Proposed solution
1. **Deduplicate scripts.** Remove the `"build"` script; keep `"typecheck": "tsc --noEmit"`. Update any CI or documentation references to `npm run build` to use `npm run typecheck` if found in this repo.
2. **Remove stale `expo-av` mapper.** Delete the `expo-av: "<rootDir>/tests/__mocks__/expo-av.ts"` entry from both Jest projects' `moduleNameMapper`. `expo-audio` remains mapped to its mock.
3. **Expand `transformIgnorePatterns`.** Update both unit and integration project configs to include the runtime ESM packages. A single regex pattern should preserve the existing whitelists and add:
   - `@orbital-systems`
   - `@google/genai`
   - `lucide-react-native`
   - `posthog-react-native`
   - `@sentry/react-native`
   - `axios`

   Example shape:
   ```json
   "transformIgnorePatterns": [
     "node_modules/(?!((react-native|@react-native|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|expo-secure-store|expo|@orbital-systems|@google/genai|lucide-react-native|posthog-react-native|@sentry/react-native|axios)/))"
   ]
   ```
4. **Scope the `no-require-imports` override.** In `eslint.config.js`, remove `'@typescript-eslint/no-require-imports': 'off'` from the global `**/*.{js,jsx,ts,tsx}` block. Add a new config object:
   ```js
   {
     files: ['metro.config.js', 'babel.config.js'],
     rules: {
       '@typescript-eslint/no-require-imports': 'off',
     },
   }
   ```
5. **Declare environment targets.** Add to `package.json`:
   ```json
   "engines": {
     "node": ">=20.0.0"
   },
   "browserslist": [
     "> 1%",
     "last 2 versions",
     "not dead"
   ]
   ```
   (Use the project's actual Node minimum; if unknown, `>=20.0.0` is a safe starting point consistent with React Native 0.83 tooling.)

## Acceptance criteria
1. Only one of `build` or `typecheck` scripts remains (keep `typecheck`).
2. `expo-av` `moduleNameMapper` is removed from Jest config.
3. `transformIgnorePatterns` whitelists `@orbital-systems`, `@google/genai`, `lucide-react-native`, `posthog-react-native`, `@sentry/react-native`, and `axios`.
4. `@typescript-eslint/no-require-imports` override is scoped to `metro.config.js` and `babel.config.js` only.
5. `engines.node` and `browserslist` are declared.

## Dependencies
None.

## Exclusions / anti-overlap
- **T01** (`canonical-env-schema`) also edits `package.json`. Coordinate to avoid merge conflicts in the `scripts`, `jest`, `engines`, and `browserslist` blocks.
- Do not touch `src/` or runtime logic; this keeps the PR reviewable and avoids overlap with behavior tasks (T04–T16).

## Verification test plan
- Test file: `tests/verification/T02-jest-package-hygiene.test.ts`
- What it proves: `package.json` and `eslint.config.js` satisfy all five acceptance criteria; Jest will transform the ESM packages used at runtime; the `no-require-imports` lint override no longer weakens `src/` or `tests/`.
- How to run it: `npx jest tests/verification/T02-jest-package-hygiene.test.ts`
- Expected state before fix: FAIL
- Expected state after fix: PASS

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Removing `expo-av` mapper breaks any test still importing `expo-av`. | Grep `src/` and `tests/` for `expo-av` imports before merging. If any exist, fix them as part of this task (still within `src/**` edits, but minimal). |
| Expanded `transformIgnorePatterns` increases Jest startup time. | The change only adds packages already imported at runtime; total transform cost is small. |
| Re-enabling `no-require-imports` globally surfaces pre-existing `require()` uses in `src/` or `tests/`. | Run `npm run lint` after the change; fix any violations in the same PR to keep CI green. |
| `engines.node` constraint breaks contributors on older Node. | Set the minimum to the lowest Node version verified locally/CI; document in PR if raised. |
| T01 also edits `package.json`. | Rebase sequentially or split `package.json` edits so the second PR only resolves conflicts in non-overlapping keys. |

## Coordination notes
No cross-role coordination required. However, because **T01** touches the same `package.json` file, the implementer should confirm ordering with the T01 owner or land T01/T02 in a single coordinated PR if the registry allows.

## Implementation hints
- Read `package.json` lines 10–11, 116–163, and the end of the file for `engines`/`browserslist`.
- Read `eslint.config.js` as a whole; the scoped override should be appended after the global block.
- After editing, run `npm run lint` and `npm run typecheck` to confirm the `no-require-imports` change did not introduce lint failures.
- The verification test reads both config files as text/JSON and asserts each acceptance criterion; it does not execute ESLint or Jest beyond that.
