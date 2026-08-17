# T5.4 Parent Realtime Current-Step Implementation Plan

**Goal:** Make the first complete realtime `currentStep` visible immediately when the cached
parent learning status has `currentStep = null`, while retaining fail-safe HTTP recovery for
incomplete deltas.

**Scope:** Only the parent learning-status merge and its focused tests. Do not change transport,
backend contracts, reconnect behavior, navigation, or UI layout.

## Task 1: Add regression coverage

**Files:**
- Modify: `tests/features/parent/use-parent-learning-status-query.test.tsx`

1. Add a test whose initial HTTP snapshot has `currentStep = null`.
2. Hold the invalidating HTTP refresh unresolved.
3. Deliver a contiguous realtime frame with every required current-step field.
4. Assert the cached step and percentage update immediately before HTTP resolves.
5. Add a test delivering an incomplete first-step delta and assert the cache retains `null`
   while the HTTP invalidation still starts.
6. Run the focused test file and record the expected RED failure for complete-step creation.

## Task 2: Implement the guarded merge

**Files:**
- Modify: `src/features/parent/hooks/useParentLearningStatusQuery.ts`

1. Add a narrow type guard for a complete valid first-step delta.
2. Preserve the existing partial merge when a cached step already exists.
3. Create a first step only when the guard passes; otherwise retain `null`.
4. Run the focused test file and confirm GREEN.

## Task 3: Verify and integrate

1. Run the focused suite, typecheck, lint, full test suite, integration checks, and repository
   validators required by `AGENTS.md`.
2. Review the diff for scope and contract compliance.
3. Commit the implementation, run the repository merge gate, merge to `main`, and verify the
   merged commit from a clean checkout/worktree.
4. Build and install the Android app from merged `main` if the mobile change requires deployment.

## Task 4: Complete physical T5.4 evidence

1. Use a fresh no-PIN assignment while the robot is connected and Parent Today is already open.
2. Start through the normal spoken trigger so interactive listening is active.
3. Capture automatic realtime step/percent updates without foreground refreshes.
4. Require terminal `COMPLETED`, normal-face restoration, three-layer/audio/motion evidence, and
   final verifier `ok=true`, `101/101`, `failed=[]`.
5. Route any newly discovered out-of-scope defect to `LESSON_PRODUCTION_PLAN.md` section 5.

## Task 5: Ship T5.4

1. Update the T5.4 evidence and task files with exact commands, results, commits, and artifacts.
2. Re-run the Ship checklist in `lesson-prod/t54-e2e-live.md` against branch tip.
3. Merge all in-scope changes to `main`, deploy where required, and re-test on `main`.
4. Remove completed worktrees/branches.
5. Set T5.4 to `DONE` only after every acceptance item has evidence.
