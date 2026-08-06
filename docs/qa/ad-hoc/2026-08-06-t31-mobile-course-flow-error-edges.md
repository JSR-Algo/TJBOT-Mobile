# adhoc-2026-08-06-t31-mobile-course-flow-error-edges — Verification Matrix

**Repo:** tbot-mobile · **Date:** 2026-08-06 · **Task:** T3.1 (mobile course browse → send-to-robot)
**Session:** 2 of 2 — continues
[`2026-08-06-t31-mobile-course-flow.md`](2026-08-06-t31-mobile-course-flow.md), which fixed the
retired-410 reconnect and explicitly left eight deep-dive boxes open.
**Scope:** the error edges of the browse → send flow. The happy path and the "still preparing"
gates already had coverage; what had none is what a parent hits when the flow goes wrong.

## Problems

Four defects, all on the path a parent takes when something is already wrong.

### 1. The assignment-conflict recovery was dead code against the real backend

`SendToRobotScreen` (both the lesson and course branches) and `CourseDetailScreen` recover from a
conflict by refetching the device's current assignment and, if it matches what the parent picked,
carrying them forward. That branch was keyed on `ASSIGNMENT_CONFLICT` alone.

The backend does not return `ASSIGNMENT_CONFLICT` when a create lands on an occupied robot. The
single-slot partial index `ux_one_active_assignment_per_device` yields **`ROBOT_BUSY`** (409,
`retryable: true`):

```ts
// tbot-backend/src/lessons/lesson-assignment.service.ts:299 and :325
throw lessonError(ErrorCode.ROBOT_BUSY, 'Device already has an active assignment', 409, true);
```

`ASSIGNMENT_CONFLICT` is the *optimistic-concurrency* code (stale `assignment_version`, `:573`) and
the *stale-preload-report* code (`:480`). So the recovery branch never ran for the case it was
written for — "someone else assigned first" — and the parent was dead-ended instead of being carried
onto the assignment that already exists.

### 2. `ASSIGNMENT_CONFLICT` had no parent copy

`src/utils/errors.ts` had no entry for it, so `getErrorMessage('ASSIGNMENT_CONFLICT')` fell through
to `UNKNOWN_ERROR` — **"An unexpected error occurred. Please try again."** A conflict is a known,
explainable state; the parent was told it was a mystery, and given no way to find out what was
actually on the robot.

### 3. The primary send path did not check whether the robot was online

The resume path on the same screen, and `CourseDetailScreen`, both gate on `device.online !== true`.
`handleSend` checked only `!deviceId`, so an assign to a robot already known to be unreachable was
sent anyway and came back as a server error instead of the actionable
*"Couldn't reach <robot>. Check it's on and connected."*

### 4. Retry was missing exactly where it was needed most

`CourseScreen` gave a Retry for a 429 and for a generic failure but **not** for `NETWORK_ERROR` —
the one a parent in airplane mode actually hits. `LessonListScreen` had no retry in any error state
while its own 410 copy read *"Refresh to continue with the latest state."* with nothing to press.
`SendToRobotScreen`'s catalog error and `CourseDetailScreen`'s lesson-list error were likewise dead
ends — their fetch effects only re-ran when `childId` / `courseId` changed, so a connection dropped
on mount stranded the parent.

Additionally, `SendToRobotScreen`'s double-tap guard was component **state** (`sending`), so two
taps dispatched in the same frame both observed `sending === false` and both fired.

## Changes

| File | Change |
|---|---|
| `src/utils/errors.ts` | New `ASSIGNMENT_CONFLICT` copy carrying `<robot>` / `<lesson>` tokens so the occupying lesson can be named |
| `src/features/course-library/screens/SendToRobotScreen.tsx` | `CONFLICT_CODES` = {`ASSIGNMENT_CONFLICT`, `ROBOT_BUSY`} drives both recovery branches; unrecoverable conflicts now name what holds the robot **and** re-read the catalog; `device.online !== true` gate on the primary send path; in-flight `sendingRef` shared with the resume effect; Try-again control on the catalog error state; corrected a stale comment claiming a `devices[0]` fallback that `resolveHouseholdDevice` does not do |
| `src/features/course-library/screens/CourseDetailScreen.tsx` | Try-again control on the lesson-list error state (`lessonsNonce` refetch) |
| `src/features/course/screens/CourseScreen.tsx` | `NETWORK_ERROR` now carries a `retryLabel` |
| `src/features/course/screens/LessonListScreen.tsx` | `retryLabel` + reload for all three fetch-error states; the no-`unitId` state deliberately keeps only the header back affordance, since a retry cannot change that outcome |
| `tests/features/course-flow-error-edges.test.tsx` | **new**, 9 cases |

`getCurrentAssignment` in the conflict branches is now `.catch(() => null)` — a failed recovery
refetch degrades to the conflict message instead of the generic outer-catch copy.

### One existing test was changed, deliberately

`tests/api/lesson-flow-edge-cases.test.ts` asserted the opposite of fix #2:

```ts
it('falls back to the generic copy (no bespoke ASSIGNMENT_CONFLICT string leaks to parents)', () => {
  // The code is preserved for routing, but there is intentionally no parent-
  // facing ASSIGNMENT_CONFLICT copy — the flow recovers silently by refetch.
  expect(getErrorMessage('ASSIGNMENT_CONFLICT')).toBe(getErrorMessage(undefined));
});
```

That premise — *"the flow recovers silently by refetch"* — is true only for a **self**-conflict.
The refetch recovers only when the device's current assignment IS the lesson the parent picked
(`currentMatchesLesson` / `currentMatchesCourse`). When another parent got there first with a
*different* lesson, there is nothing to recover to and the screen must render something; it was
rendering `UNKNOWN_ERROR`. The assertion was therefore locking in the defect, so it was replaced
rather than worked around — with the two assertions it was protecting kept intact (the code must
survive normalization as `ASSIGNMENT_CONFLICT`, and must not become `retryable: true`) plus a new
one proving the token-carrying copy never leaks a raw `<robot>`/`<lesson>` to a parent.

This is the only pre-existing assertion this change inverts. It is called out here because
"a test failed, so I changed the test" is exactly the move that deserves scrutiny.

## Acceptance criteria

| # | AC | Verdict | Evidence |
|---|---|---|---|
| 1 | `ROBOT_BUSY` on the parent's own in-flight lesson carries them forward | PASS | `recovers from ROBOT_BUSY when the robot already holds the lesson the parent picked` |
| 2 | A conflict never renders the generic unknown-error copy, and names the occupying lesson | PASS | `surfaces conflict-specific copy naming the occupying lesson…` |
| 3 | An unrecoverable conflict refreshes the catalog | PASS | `refreshes the lesson catalog after a conflict it cannot recover from` |
| 4 | An offline robot is never assigned to | PASS | `refuses to assign to an offline robot…` — `createAssignment` calls 1 → 0 |
| 5 | Two taps in one frame issue one assignment | PASS | `issues a single createAssignment for two taps in the same frame` — calls 2 → 1 |
| 6 | `SendToRobotScreen` catalog failure has a working retry | PASS | `SendToRobotScreen: catalog load failure offers a retry that refetches` |
| 7 | `CourseScreen` **offline** has a working retry | PASS | `CourseScreen: an OFFLINE catalog offers a retry that refetches` |
| 8 | `LessonListScreen` failure has a working retry | PASS | `LessonListScreen: a failed lesson load offers a retry that refetches` |
| 9 | `CourseDetailScreen` lesson-list failure has a working retry | PASS | `CourseDetailScreen: a failed lesson load offers a retry that refetches` |
| 10 | RED before / GREEN after | PASS | pre-fix `Tests: 9 failed, 9 total`; post-fix `Tests: 9 passed, 9 total` |
| 11 | `npm run typecheck` | PASS | exit 0 |
| 12 | `npm run lint` | PASS | exit 0, `--max-warnings=0` |
| 13 | `npm run test:screens` (task verify command) | PASS (1 pre-existing flake) | `66 suites, 840/841 passed` at `--maxWorkers=2`. The single failure is `PairRenameScreen — save() happy path`, a 5000 ms timeout. **Proven pre-existing:** the identical test fails identically (`1 failed, 37 passed`) on `main` at `b1536165` in a clean detached worktree with none of this change applied, and this diff touches no device / pairing / rewards / onboarding file |

## Ship checklist

| Step | Result |
|---|---|
| Re-verify at tip (rebased on main) | `typecheck` 0, `lint` 0, `npm test` **2351 passed / 2 failed** — both pre-existing load flakes, see below |
| Gate (T0.4) | **VERIFIED** — `gate.sh t31` RED@base `e33f5a2e` rc=1 → GREEN@tip `148fe3fa` rc=0, logged to `GATE_LOG.md`. Took **three attempts**; the first two REJECTED for test-harness reasons, documented below |
| Merge to main | `merge-task.sh t31` → merge commit `f47fac70` (merge #13), `--no-ff`, no squash |
| Deploy | none — mobile ships in the next app release (fastlane/EAS), a user decision per this task's step 3 |
| Re-test on main | `typecheck` 0, `lint` 0, this task's three suites **30/30 pass** on `f47fac70` |
| Push | **NOT pushed.** `merge-task.sh` deliberately leaves pushing a human step; `main` is 1 merge ahead of `origin/main` |

### The gate took three attempts — all three were the harness, not the fix

Worth recording, because each failure looked like a product defect and wasn't:

1. **REJECTED (repro red on tip).** Two cases hit jest's 5000 ms default. Worse, the
   RED phase was red for the *wrong reason*: the repro also listed
   `needs-sync-live-preload.test.tsx`, which **exists and passes on base**, and it flaked at
   19.8 s. So the gate would have recorded a RED→GREEN transition that had nothing to do with the
   bug — a false RED, precisely the unearned `VERIFIED` the T0.4 protocol exists to prevent.
   Fixed by dropping that file from the repro (it stays locked by `npm test`) and pinning
   `jest.setTimeout(30_000)`.
2. **REJECTED again.** RED was now correct (`No tests found` on base → rc=1), but GREEN failed
   with `Unable to find an element with text: This Is a Barn`. That reads like a broken
   assertion; it wasn't. **RNTL's `waitFor` keeps its own 1000 ms default regardless of
   `jest.setTimeout`**, so it gave up before the catalog resolved. The identical command passed
   9/9 locally. Fixed with `configure({ asyncUtilTimeout: 15_000 })`.
3. **PASS.**

No assertion was weakened in any of the three — only wall-clock allowances for conditions that
must still become true. A lying failure is worse than a slow one: it sends the next reader
hunting a product bug that does not exist.

## Deep-dive checklist — final status

Ten of twelve boxes pass. Two do not, and are routed rather than papered over:

- **Deep link into lesson detail with stale/invalid id — NOT SATISFIABLE in mobile alone.**
  `LessonDetailScreen` reads no route params and renders hardcoded content ("Lesson 3 / How are
  you?") for *any* `lessonId`. `LevelScreen`, `UnitScreen`, `ReviewEntryScreen` and
  `DailyMissionScreen` are the same shape. The matching clients
  (`getCourse`/`getLevel`/`getUnit`/`getLessonDetail`/`getReviewQueue`/`getDailyMission`,
  `course.api.ts:148-178`) are all `backendContractUnavailable` throw-stubs with **zero callers**
  — so nothing crashes today, but there is no route to fetch from either. Routed to T5.2 as a
  product/contract decision.
- **Locked course — partial.** No dead button anywhere, but `CourseLockedScreen` resolves content
  from the hardcoded `components/courses.ts` and falls back to `COURSES[4]` for any real (UUID)
  courseId, so a genuinely locked course shows an unrelated course's copy. Routed to T4.2/T5.2.

One further honest gap inside a passing box: **airplane mode restores via retry, but there is no
offline cache.** `persistQueryClient` appears nowhere in `src/`, so an offline parent gets an
error + retry, not stale content. The offline banner itself is mounted app-wide
(`MainTabNavigator:70`).

## Test-environment caveat (affects how any gate result here should be read)

This session's suite runs were taken on a machine at **load average 85–126 on 10 cores** with
78–96 concurrent node processes (other campaign sessions). Under that contention the *same tree*
produced three different results — 832 green, then 1 failure, then 6 failures plus "Test suite
failed to run" — all of them 5000 ms jest-default timeouts, in suites unrelated to this change
(`device-home-screen`, `pair-wifi-flow`, `pair-rename-screen`, `factory-reset-screen`,
`reward-surfaces`). Each failing suite passes standalone. This is the same root cause as the
existing `course-enrollment-lifecycle` CI-timeout finding and has been routed to T0.4/T6.5:
**a red run from a loaded runner is not evidence of a defect, and a green one is not evidence of
its absence.** The numbers recorded above were taken with `--maxWorkers=2`.

The one failure that survived the pinned run was disambiguated the only way that settles it —
by running the same test on `main` with none of this change applied:

```
# clean detached worktree at main b1536165, no T3.1 session-2 changes
$ npx jest --selectProjects unit --maxWorkers=2 tests/features/device/pair-rename-screen.test.tsx
  ● PairRenameScreen — save() happy path › on full context, completes provisioning …
    thrown: "Exceeded timeout of 5000 ms for a test."
Tests: 1 failed, 37 passed, 38 total     # ← identical to the result on the fix branch
```

Same test, same count, same cause, with and without the change — so it is a property of `main`
under load, not a regression introduced here.

Separately, an ill-advised `git stash push -u` during triage stashed and then lost this worktree's
`node_modules`; it was restored as a symlink to `tbot-mobile/node_modules` after confirming
`package.json` and `package-lock.json` are byte-identical between the worktree and `main`. No
product file was affected.
