# T13: Delete dead providers and unused hooks/components

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: LOW

## Problem
The mobile codebase contains provider wrappers and hooks that are either unused or have no production callers. They still ship in the bundle, confuse new contributors, and make dead-code reports noisy.

Cited findings:

- `src/app/providers/AppProviders.tsx` lines 8–19 contains a comment claiming `QueryProvider`, `I18nextProvider`, and `ErrorBoundary` will be "restored after dependency promotion," but the file is not imported anywhere. `src/App.tsx` lines 71–87 mounts its own provider tree instead (`src/app/providers/AppProviders.tsx`, `src/app/providers/ThemeProvider.tsx`, `src/App.tsx` — from `reports/state-architecture.md` lines 88–89).
- `src/app/providers/ThemeProvider.tsx` is also unused and only referenced by the dead `AppProviders.tsx` wrapper (`reports/state-architecture.md` line 89).
- `useOfflineSync.ts`, `useStreamingTranscript.ts`, `useVoiceActivity.ts`, `useLatencyBudget.ts`, and `LatencyHud.tsx` have no callers in `src/` other than their own files (`reports/state-architecture.md` line 90).
- MASTER_AUDIT.md cross-cutting theme 4 (line 32) lists the same files as orphaned/dead code and flags the risk that "Dead native modules and hooks ship in the binary, tests give false confidence, and new engineers copy stale patterns." The umbrella fix (line 36) is to "Delete confirmed-dead files."

Registry naming note: the registry lists `src/hooks/useStreamingTranscript.ts` and `src/hooks/useVoiceActivity.ts` in camelCase, but the actual files on disk are `src/hooks/use-streaming-transcript.ts` and `src/hooks/use-voice-activity.ts` (kebab-case). This PRD uses the real paths.

## Scope
### In scope
Files to delete:

- `src/app/providers/AppProviders.tsx`
- `src/app/providers/ThemeProvider.tsx`
- `src/hooks/useOfflineSync.ts`
- `src/hooks/use-streaming-transcript.ts`
- `src/hooks/use-voice-activity.ts`
- `src/hooks/useLatencyBudget.ts`
- `src/components/robot/LatencyHud.tsx`

Companion test files that import the deleted symbols must also be removed so `npm test` and typecheck still pass:

- `tests/hooks/useOfflineSync.test.ts`
- `tests/hooks/use-streaming-transcript.test.ts`
- `tests/hooks/use-voice-activity.test.ts`
- `tests/hooks/useLatencyBudget.test.ts`

### Out of scope
- `src/App.tsx` — already owns the live provider tree; do not change its structure.
- `src/design-system/theme/*` — `ThemeContext` and theme tokens remain in use by the live theme system.
- `src/api/*` — covered by T12.
- Gemini voice layer deletion — covered by T18/T19 and gated by T00.
- Legacy screens and navigation artifacts — covered by other audit tasks.

## Proposed solution
1. Run an import-search across `src/` for each symbol listed above to confirm no production caller exists.
2. Delete the seven scoped source files.
3. Delete the four scoped test files that import the deleted hooks/components.
4. Re-run `npm test` and `npm run typecheck`.
5. If either command fails because of a hidden import, restore the offending file and reassess before re-deleting.

No new code is added; this is a pure deletion task.

## Acceptance criteria
- Listed source files are deleted and git history is the only reference.
- Listed test files that import deleted symbols are deleted.
- No production source file imports any deleted symbol.
- `npm test` and `npm run typecheck` still pass after deletion.
- Dead-code coverage of these files drops to zero.

## Dependencies
None.

## Exclusions / anti-overlap
- T12 (`remove-api-shims-consolidate-storage`) touches `src/contexts/AuthContext.tsx` and `src/contexts/HouseholdContext.tsx`; T13 does not touch context files.
- T18/T19 delete the orphaned Gemini Live JS/native layer; T13 does not touch Gemini files.

## Verification test plan
- Test file: `tests/verification/T13-delete-dead-state-wrappers-hooks.test.ts`
- What it proves: every scoped dead file is removed from `src/` and no production source file imports any deleted symbol.
- How to run it: `npx jest tests/verification/T13-delete-dead-state-wrappers-hooks.test.ts`
- Expected state before fix: FAIL — the dead files still exist.
- Expected state after fix: PASS — files are gone and no source imports their symbols.

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| A deleted hook is actually used by a screen through an aliased/dynamic import | The verification test scans all `src/**/*.ts{x}` for import statements mentioning every deleted symbol. If any violation is found, restore and reassess. |
| Tests fail because stale unit tests still import deleted hooks | Delete the four companion test files listed in scope as part of the same PR. |
| TypeScript path alias `@/hooks/useOfflineSync` etc. leaks into untracked files | Run `npm run typecheck` locally before opening the PR. |
| Future contributor reintroduces one of these hooks for an upcoming feature | Add a code-review note: if `useVoiceActivity` is needed again, reintroduce it under T21 instead of restoring the old file verbatim. |

## Coordination notes
No coordination required (registry `coordination_required: false`).

## Implementation hints
- The live provider tree is in `src/App.tsx` lines 71–87; verify it already includes `SafeAreaProvider`, `AuthProvider`, `ToastProvider`, `QueryProvider`, and `RootErrorBoundary` before deleting `AppProviders.tsx`.
- `ThemeProvider.tsx` only consumes `@/design-system/theme/ThemeContext`; deleting it does not affect the theme context definition.
- `LatencyHud.tsx` imports `LATENCY_TARGETS` and `LatencyBudgetSample` from `useLatencyBudget.ts`; deleting both together avoids orphan imports.
- Use kebab-case paths for the two transcript/VAD hooks in shell commands and test code; the registry entry uses camelCase by mistake.
