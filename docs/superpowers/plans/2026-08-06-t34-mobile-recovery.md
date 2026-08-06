# T3.4 Mobile Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mobile lesson recovery deterministic, safe against terminal or corrupt checkpoints, and covered by an executable failure-point matrix.

**Architecture:** Keep all product behavior inside `src/features/fallback/**`. Add a pure recovery-decision model in `recoveryTypes.ts`; screens consume that model and perform navigation only for explicit outcomes. Existing route types remain unchanged because the new checkpoint fields are optional at the navigation boundary and validated before use.

**Tech Stack:** TypeScript, React Native, React Navigation, Jest, React Native Testing Library.

---

### Task 1: Recovery decision model and matrix

**Files:**
- Modify: `src/features/fallback/recoveryTypes.ts`
- Create: `tests/features/fallback/mobile-recovery-matrix.test.tsx`

- [ ] **Step 1: Write the failing pure-model matrix tests**

Create checkpoints for `connecting`, `greeting`, `listening`, `speaking`, and `done`. Assert that the first four return `resume`, `done` returns `ended`, terminal/expired sessions never return `resume`, an expired auth state returns `reauth`, a second evaluation after authentication returns `resume`, and partial objects return `ended` with reason `invalid_checkpoint`.

```ts
const activeCheckpoint = (phase: LessonPhase): LessonCheckpoint => ({
  lessonTitle: 'Food Words',
  progressLabel: '40%',
  resumeTarget: ROUTES.SendToRobotScreen,
  reason: 'network',
  phase,
  sessionState: 'active',
  authState: 'authenticated',
});

expect(decideLessonRecovery(activeCheckpoint('listening'))).toMatchObject({ kind: 'resume' });
expect(decideLessonRecovery({ ...activeCheckpoint('speaking'), sessionState: 'terminated' })).toEqual({
  kind: 'ended',
  reason: 'terminated',
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx jest --selectProjects unit --runInBand tests/features/fallback/mobile-recovery-matrix.test.tsx
```

Expected: FAIL because `LessonPhase`, `decideLessonRecovery`, and exhaustive recovery-screen mapping do not exist.

- [ ] **Step 3: Implement the minimal pure decision API**

Add these types and functions in `recoveryTypes.ts`:

```ts
export type LessonPhase = 'connecting' | 'greeting' | 'listening' | 'speaking' | 'done';
export type RecoverySessionState = 'active' | 'terminated' | 'expired';
export type RecoveryAuthState = 'authenticated' | 'expired';

export type RecoveryDecision =
  | { readonly kind: 'resume'; readonly checkpoint: LessonCheckpoint }
  | { readonly kind: 'reauth'; readonly checkpoint: LessonCheckpoint }
  | { readonly kind: 'ended'; readonly reason: 'done' | 'terminated' | 'expired' | 'invalid_checkpoint' };
```

Extend `LessonCheckpoint` with optional `phase`, `sessionState`, and `authState`. `decideLessonRecovery(unknown)` must require complete core checkpoint strings plus a known phase/session/auth value; missing or malformed data returns `invalid_checkpoint`. `done`, `terminated`, and expired session states return terminal outcomes before any resume target is used. Add `recoveryScreenForReason(reason)` with a `never` default so every `RecoveryReason` maps to a screen. Add `audio_route_changed` to the reason union. Update `fallbackCheckpoint()` to return a complete active speaking checkpoint.

- [ ] **Step 4: Run the pure-model tests and verify GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit the decision layer**

```bash
git add src/features/fallback/recoveryTypes.ts tests/features/fallback/mobile-recovery-matrix.test.tsx
git commit -m "feat: add safe lesson recovery decisions"
```

### Task 2: Wire resume, network, and audio screens

**Files:**
- Modify: `src/features/fallback/screens/LessonResumeScreen.tsx`
- Modify: `src/features/fallback/screens/NetworkErrorScreen.tsx`
- Modify: `src/features/fallback/ReconnectingOverlay.tsx`
- Modify: `src/features/fallback/screens/AudioRecoveryScreen.tsx`
- Modify: `tests/features/fallback/mobile-recovery-matrix.test.tsx`
- Modify: `tests/ui-validation/fallback-offline.test.tsx`
- Modify: `tests/features/course-robot-screen-coverage-round1.test.tsx`

- [ ] **Step 1: Add failing screen behavior tests**

Add React Native Testing Library assertions that:

```ts
fireEvent.press(screen.getByText('Keep going'));
fireEvent.press(screen.getByText('Keep going'));
expect(navigation.navigate).toHaveBeenCalledTimes(1);
```

Also assert a terminal checkpoint renders `Lesson ended`, never renders `Keep going`, and never navigates to `SendToRobotScreen`; expired auth renders `Sign in again`; network retry preserves the checkpoint; intermediate reconnect timeout navigates to `NetworkErrorScreen` with `attemptCount + 1`; the last attempt navigates to the configured failure target; and `Audio is working` routes a valid checkpoint to `LessonResumeScreen` with reason `audio_recovered`.

- [ ] **Step 2: Run the focused test and verify RED**

Run the Task 1 Jest command. Expected: FAIL on the current static screen behavior, discarded checkpoint, fixed 2400 ms timer, and duplicate navigation.

- [ ] **Step 3: Implement minimal screen wiring**

In `LessonResumeScreen`, call `decideLessonRecovery(route.params?.checkpoint)`. Render the existing resume card only for `resume`; render a sign-in action for `reauth`; render clean ended copy and a home action for `ended`. Guard the resume handler with a `React.useRef(false)` latch before navigation.

In `NetworkErrorScreen`, pass `route.params?.checkpoint` to `ReconnectingOverlay` and retain the clamped attempt.

In `ReconnectingOverlay`, use `route.params?.reconnectDelayMs ?? 2400`. When the timer expires before `maxAttempts`, navigate to `NetworkErrorScreen` with the same checkpoint and `attemptCount: attempt + 1`; at the threshold, navigate to the explicit failure target.

In `AudioRecoveryScreen`, accept `route`, preserve its checkpoint, and add an `Audio is working` action that navigates to `LessonResumeScreen` with a copied checkpoint whose reason is `audio_recovered`. With no checkpoint, the action returns home safely.

- [ ] **Step 4: Update legacy expectations to the safe contract**

Existing fallback tests that expect resume from absent or partial checkpoints must use a complete active checkpoint or expect the clean ended path. Existing reconnect expectations must assert checkpoint preservation and the intermediate `NetworkErrorScreen` transition.

- [ ] **Step 5: Run focused and existing fallback tests**

```bash
npx jest --selectProjects unit --runInBand tests/features/fallback/mobile-recovery-matrix.test.tsx tests/ui-validation/fallback-offline.test.tsx tests/features/course-robot-screen-coverage-round1.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit screen behavior**

```bash
git add src/features/fallback tests/features/fallback/mobile-recovery-matrix.test.tsx tests/ui-validation/fallback-offline.test.tsx tests/features/course-robot-screen-coverage-round1.test.tsx
git commit -m "fix: harden mobile lesson recovery flows"
```

### Task 3: Evidence, repro, and campaign closeout

**Files:**
- Create: `docs/qa/ad-hoc/2026-08-06-t34-mobile-recovery.md`
- Create: `/Users/manhhodinh/Documents/TBOT/lesson-prod/repros/t34.sh`
- Modify: `/Users/manhhodinh/Documents/TBOT/LESSON_PRODUCTION_PLAN.md`
- Modify: `/Users/manhhodinh/Documents/TBOT/lesson-prod/t34-mobile-recovery.md`

- [ ] **Step 1: Add the out-of-scope baseline finding**

Append a §5 row assigning the unrelated `pair-search-helpers.test.tsx` timeout from `npm run test:screens` to T0.4/T7.5. Do not modify device pairing code.

- [ ] **Step 2: Add the executable RED-to-GREEN repro**

Create executable `lesson-prod/repros/t34.sh` with `# repo: tbot-mobile` and run only `tests/features/fallback/mobile-recovery-matrix.test.tsx` in band. Confirm the gate can observe failure at the merge base and success at the branch tip.

- [ ] **Step 3: Run task verification and the standard mobile suite**

```bash
npm run test:screens
npm test
npm run typecheck
npm run lint
npm run test:state-machines
npm run api:contract-sync:check
```

Record exact pass/fail counts and clearly separate pre-existing or out-of-scope failures. The T3.4 focused matrix and never-resume-terminated invariant must pass.

- [ ] **Step 4: Write evidence and commit**

The evidence file records the RED failure, production diff summary, recovery matrix, GREEN rerun, suite results, gate result, merge SHA, and main-checkout rerun.

```bash
git add docs/qa/ad-hoc/2026-08-06-t34-mobile-recovery.md
git commit -m "docs: record T3.4 recovery evidence"
```

- [ ] **Step 5: Gate, merge, and re-test main**

Rebase the branch on latest `main`, rerun all commands, run `lesson-prod/scripts/gate.sh t34 tbot-mobile lesson-prod/t34-mobile-recovery`, then `lesson-prod/scripts/merge-task.sh t34 tbot-mobile lesson-prod/t34-mobile-recovery`. Push main if the merge helper does not. Re-run `npm run test:screens` and `npm test` in the main checkout and append results to evidence.

- [ ] **Step 6: Clean the worktree and close status**

Confirm the feature branch is an ancestor of main and both checkouts are clean. Remove `/Users/manhhodinh/Documents/TBOT/worktrees/t34-mobile-recovery`, delete the local and remote task branch, and set both trackers to `DONE` with the evidence link.
