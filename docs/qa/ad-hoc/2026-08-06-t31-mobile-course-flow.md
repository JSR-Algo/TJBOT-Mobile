# adhoc-2026-08-06-t31-mobile-course-flow — Verification Matrix

**Repo:** tbot-mobile · **Date:** 2026-08-06 · **Task:** T3.1 (mobile course browse → send-to-robot)
**Status:** PARTIAL — one defect fixed and verified; the deep-dive checklist is not yet fully covered

## Problem

`NeedsSyncScreen` is the terminal a parent lands on when an assignment ends in
`FAILED`/`needs_sync`, and **"Reconnect Robot now" was its only retry**. That handler
called `getRobotSyncStatus(courseId)` → `GET /course-library/:courseId/sync-status`.

That route is retired server-side. `tbot-backend/src/course-library/course-library.controller.ts`
answers it unconditionally:

```ts
@Get(':courseId/sync-status')
getRobotSyncStatus(): never {
  throw new HttpException(retiredBody(), 410);   // { error: 'ENDPOINT_RETIRED', useInstead: '/v1/courses/:courseId/enroll' }
}
```

So the call could only ever reject. The screen caught the rejection and rendered
*"Robot has not synced this course yet. Check Wi-Fi and try again."* — the retry was
**permanently dead**, and the copy blamed the parent's Wi-Fi for a retired endpoint.
No amount of robot recovery could make that button succeed.

**Why CI never caught it:** the existing suite
(`tests/features/course-library-screen-coverage-gaps.test.tsx`) mocked
`getRobotSyncStatus` itself and asserted the `synced: true` branch. Mocking the
retired function made a call that always 410s in production look healthy in tests.

Related but *not* a live bug: `unlockCourse` and `sendCourseToRobot` hit the other two
retired routes, but a caller sweep (`grep -rn` over `src/`) shows **zero callers** —
they are already-`@deprecated` shims, so they are dead code rather than a user-facing
defect. Left in place (out of scope here); noted for the API-cleanup owner.

## Changes

| File | Change |
|---|---|
| `src/features/course-library/screens/NeedsSyncScreen.tsx` | Reconnect now reads the device's live preload status (`getPreloadStatus` + real `isPreloadReady`) instead of the retired course sync-status route. Resolves `deviceId` from route params, falling back to `getDeviceStatus('primary', childId)`. Three distinct outcomes replace the single catch-all message: not-paired, not-yet-downloaded, unreachable. Adds a `checking` ref so a double-tap issues one request |
| `src/navigation/routes.ts` | `NeedsSyncScreen` params accept optional `deviceId` / `childId` (both optional — existing `{ courseId }` callers unchanged) |
| `tests/features/needs-sync-live-preload.test.tsx` | **new**, 7 cases driving the real `http/client` so assertions are on actual request URLs |
| `tests/features/course-library-screen-coverage-gaps.test.tsx` | 3 cases re-pointed from the retired endpoint to the device-scoped contract; unused `getRobotSyncStatus`/`RobotSyncStatus` mock plumbing removed |

The new suite asserts at the **URL level** deliberately: mocking the API function is
what hid this defect, so the regression lock proves no `/course-library/` or
`sync-status` path is requested at all.

## Acceptance criteria

| # | AC | Verdict | Evidence |
|---|---|---|---|
| 1 | Reconnect never calls a retired endpoint | PASS | `never calls the retired /course-library/:id/sync-status endpoint` — asserts no requested path contains `sync-status` or `/course-library/` |
| 2 | READY preload advances the parent | PASS | `READY preload advances to CourseAddedScreen` |
| 3 | Non-READY keeps the parent put with honest copy | PASS | `non-READY preload keeps the parent on the screen with actionable guidance` |
| 4 | Device resolved when not routed in | PASS | `resolves the household device when no deviceId is routed in` (hits `/devices/household/me`) |
| 5 | No robot paired → distinct guidance, no dead end | PASS | `surfaces a distinct message when no robot is paired yet` |
| 6 | Network failure → retryable connection error | PASS | `a network failure is reported as a retryable connection problem` |
| 7 | Double-tap issues one request | PASS | `double-tap issues a single preload check` |
| 8 | RED before / GREEN after | PASS | pre-fix `Tests: 7 failed, 7 total`; post-fix `Tests: 7 passed, 7 total` |
| 9 | `npm run typecheck` | PASS | exit 0 |
| 10 | `npm run test:screens` (task verify command) | PASS | `65 suites, 832 tests passed` |

## Ship checklist

| Step | Result |
|---|---|
| Re-verify at tip | `lint` 0, `typecheck` 0, `npm test` **2343 passed / 0 failed**, `test:screens` **832 passed** |
| Gate (T0.4) | **PASS** — `gate.sh t31` RED@base `4a4aed00` rc=1 → GREEN@tip `7c455416` rc=0, logged to `GATE_LOG.md` |
| Merge to main | `merge-task.sh t31` → merge commit `97f21cc8` (merge #3), no squash |
| Deploy | none — mobile ships in the next app release, per this task's step 3 |
| Re-test on main | `typecheck` 0, `lint` 0, this task's 7 new cases **7/7 pass** |
| Remove worktree | **NOT removed — deliberately.** See below |

### Why the worktree was left in place

`tmp/wt-t31` holds **uncommitted work that is not mine**: modifications to
`CourseDetailScreen.tsx`, `SendToRobotScreen.tsx`, `CourseScreen.tsx`,
`LessonListScreen.tsx`, `utils/errors.ts` and a new
`tests/features/course-flow-error-edges.test.tsx`, whose header reads "T3.1
deep-dive — the browse → send-to-robot flow's ERROR edges" and whose mtimes were
minutes old. A parallel session is actively continuing T3.1's checklist there.
This task's step 5 says to stop and surface a dirty worktree rather than delete
it, so it was left untouched and the branch was not deleted.

### Flaky-suite caveat on the main re-test

`test:screens` on main failed a *different* random subset on consecutive runs —
`factory-reset-screen` (12s), then `reward-surfaces` (26s) +
`childProfile-pairing-finalize` (35s) + `pair-rename-screen` (49s) — while each
passes in isolation and the whole suite scored 832/832 when the machine was
quiet. `device-home-screen` was measured 0/6 failures at base and 0/6 on main
under equal quiet load, and the T3.1 diff touches **no device, rewards,
onboarding or robot-mgmt file**, so these are load-sensitive timeouts, not a
regression from this change. Filed as a HIGH finding against T3.1–T3.4 because it
makes a designated verify command untrustworthy.

## Deep-dive checklist status (honest)

Covered by this change: *no device paired* (guidance, no dead end), *device offline at
assign* (clear error + a retry that can actually succeed), *double-tap* (single
in-flight request), and the preload *stall vs READY* distinction on this screen.

**Not yet verified** — these remain open and T3.1 must stay IN_PROGRESS until a
follow-up session covers them: multiple-device picker targeting, assignment conflict
surfacing/refresh, token expiry mid-flow, airplane mode per screen with cached data +
offline banner, empty course / zero lessons, locked-course entitlement path, deep link
with stale lesson id, and pull-to-refresh during an in-flight assign.
