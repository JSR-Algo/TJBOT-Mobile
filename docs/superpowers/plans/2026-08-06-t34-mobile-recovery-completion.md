# T3.4 Mobile Recovery Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete production mobile recovery across process death and authentication while proving that only a matching authoritative live assignment can resume.

**Architecture:** Store a versioned fallback-owned checkpoint in secure storage, refresh it from the production Running/Companion observer surfaces, and let protected navigation restore it after boot/login. `LessonResumeScreen` validates the checkpoint against `getCurrentAssignment(deviceId)` before routing to `RunningScreen`; it never starts a new assignment.

**Tech Stack:** React Native, TypeScript strict mode, React Navigation, SecureStore wrapper, existing course-library API/observer client, Jest and React Native Testing Library.

---

## File Map

- Create `src/features/fallback/recoveryCheckpointStore.ts`: versioned secure persistence and fail-closed parsing.
- Modify `src/features/fallback/recoveryTypes.ts`: production identity, authoritative decision helpers, phase mapping.
- Modify `src/features/fallback/screens/LessonResumeScreen.tsx`: asynchronous authority check and safe resume UI.
- Modify `src/features/course-library/screens/RunningScreen.tsx`: persist/clear production checkpoint.
- Modify `src/features/course-library/screens/CompanionScreen.tsx`: persist/clear production checkpoint and observer phase.
- Modify `src/navigation/RootStackNavigator.tsx`: boot/post-auth pending recovery entry.
- Modify `src/navigation/routes.ts`: production recovery route params and reconnect target preservation.
- Modify `src/features/fallback/screens/NetworkErrorScreen.tsx` and `src/features/fallback/ReconnectingOverlay.tsx`: carry custom failure target through every hop.
- Modify/add focused tests under `tests/features/fallback/**`, `tests/features/course-library-lesson-screens.test.tsx`, and `tests/navigation/root-navigator.test.tsx`.

### Task 1: Versioned Recovery Checkpoint Persistence

**Files:**
- Create: `src/features/fallback/recoveryCheckpointStore.ts`
- Modify: `src/features/fallback/recoveryTypes.ts`
- Create: `tests/features/fallback/recovery-checkpoint-store.test.ts`

- [ ] **Step 1: Write failing storage/parser tests**

Cover a full checkpoint round-trip, missing storage, invalid JSON, partial JSON,
unsupported `version`, missing `deviceId`/`assignmentId`, storage read failure, and
terminal clear. Require all malformed cases to return `null`, never a resumable
checkpoint.

Use a production checkpoint fixture with:

```ts
const checkpoint: LessonCheckpoint = {
  version: 1,
  lessonTitle: 'Greetings',
  progressLabel: '2 of 5',
  resumeTarget: ROUTES.RunningScreen,
  reason: 'network',
  phase: 'listening',
  sessionState: 'active',
  authState: 'authenticated',
  deviceId: 'device-1',
  assignmentId: 'assignment-1',
  sessionId: 'session-1',
  childId: 'child-1',
};
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npx jest --selectProjects unit --runInBand tests/features/fallback/recovery-checkpoint-store.test.ts
```

Expected: FAIL because the store and versioned production checkpoint contract do not exist.

- [ ] **Step 3: Implement the minimal store and parser**

In `recoveryTypes.ts`:

- add `version: 1`, required `deviceId` and `assignmentId`, optional `sessionId`;
- change `ResumeTarget` to `RunningScreen | HomeHubScreen`;
- export `parseLessonCheckpoint(input: unknown): LessonCheckpoint | null`;
- make `decideLessonRecovery` consume the parser and preserve terminal fail-closed behavior;
- update `fallbackCheckpoint()` to return a complete production-shaped fixture.

In `recoveryCheckpointStore.ts`, use `@/services/storage/secureStore` with key
`tbot.lesson-recovery.v1` and export:

```ts
export async function readRecoveryCheckpoint(): Promise<LessonCheckpoint | null>
export async function writeRecoveryCheckpoint(checkpoint: LessonCheckpoint): Promise<void>
export async function clearRecoveryCheckpoint(): Promise<void>
```

Reads catch storage/JSON errors, report them with existing observability, and return
`null`. Writes require `parseLessonCheckpoint(checkpoint)` to succeed before JSON serialization.

- [ ] **Step 4: Verify GREEN and regressions**

Run the focused test plus:

```bash
npx jest --selectProjects unit --runInBand tests/features/fallback/mobile-recovery-matrix.test.tsx
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/features/fallback/recoveryTypes.ts src/features/fallback/recoveryCheckpointStore.ts tests/features/fallback
git commit -m "feat(fallback): persist production recovery checkpoints" -m "Refs: T3.4"
```

### Task 2: Authoritative Lesson Resume

**Files:**
- Modify: `src/features/fallback/screens/LessonResumeScreen.tsx`
- Modify: `src/navigation/routes.ts`
- Modify: `tests/features/fallback/mobile-recovery-matrix.test.tsx`

- [ ] **Step 1: Write failing authority tests**

Mock `getCurrentAssignment` and assert:

- matching `RUNNING`, `READY`, `PRELOADING`, `ASSIGNED`, or `PAUSED` assignment exposes `Keep going`;
- `COMPLETED`, `FAILED`, `CANCELLED`, null, assignment mismatch, and session mismatch render ended and never navigate;
- request rejection renders `We can't confirm this lesson yet` plus `Try again`, without clearing or navigating;
- `Keep going` navigates once to `RunningScreen` with authoritative `deviceId`, `assignmentId`, `sessionId`, `childId`, and lesson title;
- no path navigates to `SendToRobotScreen`.

- [ ] **Step 2: Verify RED**

```bash
npx jest --selectProjects unit --runInBand tests/features/fallback/mobile-recovery-matrix.test.tsx
```

- [ ] **Step 3: Implement async validation**

On mount or checkpoint change:

1. parse the route checkpoint;
2. render loading while `getCurrentAssignment(deviceId)` runs;
3. require matching assignment ID and, when both are non-null, matching session ID;
4. treat only non-terminal assignment states as resumable;
5. clear the persisted checkpoint for terminal/missing/mismatched results;
6. preserve it on query errors and expose an explicit retry action;
7. on resume, guard with the existing ref latch and navigate to `RunningScreen`.

Remove course-resume/`SendToRobotScreen` logic.

- [ ] **Step 4: Verify GREEN, lint, and typecheck**

Run the focused matrix, fallback UI suite, scoped ESLint, and `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/features/fallback/screens/LessonResumeScreen.tsx src/navigation/routes.ts tests/features/fallback/mobile-recovery-matrix.test.tsx tests/ui-validation/fallback-offline.test.tsx
git commit -m "fix(fallback): revalidate assignments before resume" -m "Refs: T3.4"
```

### Task 3: Production Checkpoint Lifecycle

**Files:**
- Modify: `src/features/course-library/screens/RunningScreen.tsx`
- Modify: `src/features/course-library/screens/CompanionScreen.tsx`
- Modify: `src/features/fallback/recoveryTypes.ts`
- Modify: `tests/features/course-library-lesson-screens.test.tsx`

- [ ] **Step 1: Write failing production-lifecycle tests**

Assert both production screens:

- persist a versioned checkpoint after observing a live assignment;
- include assignment/session/device/child/lesson identity;
- update the checkpoint phase for supported observer snapshot/turn frames;
- clear the checkpoint for `COMPLETED`, `FAILED`, `CANCELLED`, terminal observer frames, and live-to-null completion;
- never persist when `deviceId` or assignment identity is missing.

- [ ] **Step 2: Verify RED**

```bash
npx jest --selectProjects unit --runInBand tests/features/course-library-lesson-screens.test.tsx
```

- [ ] **Step 3: Implement shared checkpoint construction**

Add pure helpers in `recoveryTypes.ts` that map a live `CurrentAssignment`-shaped
input plus `deviceId` and optional observer phase into a valid checkpoint. Keep
the helper independent of course-library imports to avoid feature cycles.

In each production screen, write after a live poll result, update after supported
observer frames, and clear on every terminal path. Storage failures are captured
but do not crash or change the server-derived UI.

- [ ] **Step 4: Verify GREEN and regressions**

Run course-library lesson tests, the recovery store/matrix tests, scoped ESLint,
and typecheck.

- [ ] **Step 5: Commit**

```bash
git add src/features/course-library/screens/RunningScreen.tsx src/features/course-library/screens/CompanionScreen.tsx src/features/fallback/recoveryTypes.ts tests/features/course-library-lesson-screens.test.tsx
git commit -m "feat(course-library): maintain lesson recovery checkpoints" -m "Refs: T3.4"
```

### Task 4: Cold Start and Post-Auth Recovery Entry

**Files:**
- Modify: `src/navigation/RootStackNavigator.tsx`
- Modify: `tests/navigation/root-navigator.test.tsx`

- [ ] **Step 1: Write failing bootstrap/auth tests**

Mock `readRecoveryCheckpoint` and assert:

- authenticated + onboarded boot with a checkpoint initializes protected stack at `LessonResumeScreen` with params;
- unauthenticated boot still mounts auth;
- rerender after authentication mounts protected recovery using the same persisted checkpoint;
- pending device setup and incomplete onboarding retain precedence;
- invalid/missing/read-error checkpoint falls back to the existing protected initial route.

- [ ] **Step 2: Verify RED**

```bash
npx jest --selectProjects unit --runInBand tests/navigation/root-navigator.test.tsx
```

- [ ] **Step 3: Implement boot loading and precedence**

Read recovery checkpoint alongside the age gate in a dedicated state. Include it
in the loading gate. Select recovery only after authentication, onboarding, and
pending-device-setup checks. Pass `{ checkpoint }` as initial params. Do not clear
the checkpoint in the navigator.

- [ ] **Step 4: Verify GREEN and navigation regressions**

Run root navigator test, `npm run test:navigation`, scoped ESLint, and typecheck.

- [ ] **Step 5: Commit**

```bash
git add src/navigation/RootStackNavigator.tsx tests/navigation/root-navigator.test.tsx
git commit -m "feat(navigation): restore pending lesson recovery after auth" -m "Refs: T3.4"
```

### Task 5: Preserve Reconnect Failure Targets

**Files:**
- Modify: `src/navigation/routes.ts`
- Modify: `src/features/fallback/screens/NetworkErrorScreen.tsx`
- Modify: `src/features/fallback/ReconnectingOverlay.tsx`
- Modify: `tests/features/fallback/mobile-recovery-matrix.test.tsx`

- [ ] **Step 1: Add failing multi-hop test**

Start `NetworkErrorScreen` with `failureTarget: HomeHubScreen`, advance through an
intermediate overlay timeout and the next retry, and assert the final escalation
still targets `HomeHubScreen` rather than Help FAQ.

- [ ] **Step 2: Verify RED**

Run the focused recovery matrix and confirm the target is dropped today.

- [ ] **Step 3: Carry the target through every hop**

Add `failureTarget` to `NetworkErrorScreen` params. Read it with Help FAQ default,
pass it to `ReconnectingOverlay`, and include it when the overlay navigates back to
`NetworkErrorScreen`.

- [ ] **Step 4: Verify GREEN and commit**

Run focused fallback suites, typecheck, and scoped ESLint, then commit:

```bash
git add src/navigation/routes.ts src/features/fallback/screens/NetworkErrorScreen.tsx src/features/fallback/ReconnectingOverlay.tsx tests/features/fallback/mobile-recovery-matrix.test.tsx
git commit -m "fix(fallback): preserve reconnect escalation targets" -m "Refs: T3.4"
```

### Task 6: Evidence, Final Review, and Ship

**Files:**
- Modify: `docs/qa/ad-hoc/2026-08-06-t34-mobile-recovery.md`
- Modify: `/Users/manhhodinh/Documents/TBOT/lesson-prod/repros/t34.sh` if the existing repro does not cover completion regressions
- Modify: `/Users/manhhodinh/Documents/TBOT/lesson-prod/t34-mobile-recovery.md`
- Modify: `/Users/manhhodinh/Documents/TBOT/LESSON_PRODUCTION_PLAN.md`

- [ ] **Step 1: Run focused and repository verification at branch tip**

```bash
npm run typecheck
npm run lint
npm run test:state-machines
npm run test:navigation
npm run test:screens
npm run api:contract-sync:check
npm test
```

Record exact non-zero suite/test counts and route unrelated failures to the findings log.

- [ ] **Step 2: Update executable repro and prove RED/GREEN**

The repro must test cold-start persistence, authoritative terminal rejection,
post-auth return, and multi-hop target preservation. It must fail at base
`f4435e44` and pass at branch tip without referencing the task branch.

- [ ] **Step 3: Update evidence and deep-dive matrix**

Record each checkpoint phase, assignment outcome, auth state, persistence
corruption case, reconnect hop, exact commands, commit SHAs, and no-deploy decision.

- [ ] **Step 4: Run final spec and quality reviews**

Resolve every Critical/High/Medium or spec-compliance issue, then re-run affected
tests. Dispatch a final whole-branch reviewer after per-task reviews pass.

- [ ] **Step 5: Rebase, gate, merge, and push**

Rebase onto latest local `main`, rerun all verification, run T0.4 gate and merge
protocol, and push mobile `main` because mobile has no automatic server deploy.

- [ ] **Step 6: Re-test main and clean up**

Run `npm run test:screens` and `npm test` plus focused recovery/navigation tests on
main. Append results to evidence. Confirm branch ancestry and clean worktree,
remove `.worktrees/t34-completion`, delete local/remote completion branch, and set
T3.4 DONE with the evidence link in both trackers.
