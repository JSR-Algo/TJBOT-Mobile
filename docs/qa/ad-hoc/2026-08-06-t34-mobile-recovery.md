# T3.4 Mobile Recovery — Scoped Verification and Blocker Evidence

**Repo:** tbot-mobile  
**Date:** 2026-08-06  
**Branch:** `lesson-prod/t34-mobile-recovery`  
**Status:** BLOCKED — fallback behavior is hardened and tested, but the task's cold-start, authoritative termination, and post-auth continuation requirements need production integration outside the permitted `src/features/fallback/**` scope.

## Reproduction

The first focused run of

```bash
npx jest --selectProjects unit --runInBand tests/features/fallback/mobile-recovery-matrix.test.tsx
```

failed 7/7 tests because no recovery decision function or exhaustive reason-to-screen mapping existed.

Screen-level RED runs then reproduced the shipped gaps:

- missing, terminal, and auth-expired checkpoints still rendered `Keep going`;
- `NetworkErrorScreen` discarded its checkpoint;
- `ReconnectingOverlay` treated an intermediate timeout as a successful return home;
- `AudioRecoveryScreen` had no return-to-lesson action;
- double-tapping resume navigated twice;
- a Home target with course context was incorrectly preempted by `SendToRobotScreen`;
- expired-auth audio recovery discarded the checkpoint;
- direct fallback-to-login navigation violated the feature-owned navigation contract.

The executable campaign repro is `lesson-prod/repros/t34.sh`. On the feature branch it passes 2/2 assertions for fail-closed terminated/corrupt recovery and audio-route mapping. It has not been promoted through `gate.sh` because the full T3.4 Done criteria are blocked below.

## Fix Diff Summary

| Area | Change |
| --- | --- |
| `recoveryTypes.ts` | Adds typed phases/session/auth states, strict checkpoint validation, fail-closed decisions, terminal-session outcomes, and exhaustive recovery-screen mapping. |
| `LessonResumeScreen.tsx` | Renders resume/expired/ended outcomes, blocks duplicate navigation, honors Home before course context, and never resumes invalid or terminal checkpoints. Expired auth stays inside protected navigation because cross-root post-login continuation is not available. |
| `NetworkErrorScreen.tsx` / `ReconnectingOverlay.tsx` | Preserves lesson checkpoints, advances retry attempts, uses the configured delay, and escalates only at the threshold. |
| `AudioRecoveryScreen.tsx` | Adds explicit audio-restored recovery, preserves active and auth-expired checkpoints, and fails invalid checkpoints home. |
| Tests | Adds the recovery matrix and updates legacy fallback expectations to the safe checkpoint contract. |

Commits:

- `db963a94` — safe recovery decisions
- `132b8345` — align recovery mapping with fallback routes
- `8fe98a7d` — harden recovery screens
- `53bab141` — honor Home recovery targets
- `3c982ddc` — preserve expired-auth audio recovery
- `973247c7` — keep recovery within protected navigation

## Recovery Matrix

| Failure point | Scoped result | Verdict |
| --- | --- | --- |
| App killed: connecting | Complete active checkpoint renders resume choice | PASS at routed-checkpoint boundary |
| App killed: greeting | Complete active checkpoint renders resume choice | PASS at routed-checkpoint boundary |
| App killed: listening | Complete active checkpoint renders resume choice | PASS at routed-checkpoint boundary |
| App killed: speaking | Complete active checkpoint renders resume choice | PASS at routed-checkpoint boundary |
| App killed: done | Clean `Lesson ended`; no resume CTA | PASS |
| Robot/backend terminated | Terminal checkpoint never navigates to `SendToRobotScreen` | PASS for supplied authoritative state; stale-local revalidation BLOCKED |
| Airplane mode mid-step | Checkpoint survives retry; attempt increments; threshold escalates | PASS for production Help-FAQ target |
| Bluetooth/device audio route change | Audio recovery returns active/expired-auth checkpoints to the resume decision | PASS |
| Auth/session expiry | Expired checkpoint renders safe expired-state UI | PARTIAL — post-login continuation BLOCKED |
| Double-tap resume | One navigation request | PASS |
| Recovery reason mapping | Every reason maps; TypeScript `never` guard | PASS |
| Partial/interrupted persisted state | Invalid checkpoint fails closed to `Lesson ended` | PASS at validation boundary; cold-start hydration BLOCKED |

## Passing Re-runs

Focused fallback plus navigation architecture:

```text
Test Suites: 4 passed, 4 total
Tests:       74 passed, 74 total
Time:        6.179 s
```

Full unit suite:

```text
Test Suites: 2 skipped, 219 passed, 219 of 221 total
Tests:       23 skipped, 2359 passed, 2382 total
Time:        77.353 s
```

Static checks:

```text
npm run typecheck: PASS
scoped ESLint --max-warnings=0: PASS
```

Required `npm run test:screens` is not deterministic on this checkout. Latest recorded run:

```text
Test Suites: 2 failed, 64 passed, 66 total
Tests:       2 failed, 846 passed, 848 total
```

Failures were outside fallback (`device-home-screen` timeout and cancelled-session course UI); other runs failed different unrelated tests, while full-unit in-band passed all of them. Routed to `LESSON_PRODUCTION_PLAN.md` §5 under T0.4/T3.1.

## Blocking Integration Gaps

1. **Cold-start entry is absent.** No production code navigates to `LessonResumeScreen`; only route registration and tests reference it. No app-boot hydration supplies the checkpoint.
2. **Authoritative status is absent.** `src/services/api/lesson-session.api.ts` contains only `backendContractUnavailable(...)` throw-stubs and no session-status query, so a stale local `active` checkpoint cannot be checked against the robot/backend.
3. **Post-auth continuation is absent.** Auth replaces the root navigator, `LoginScreen` has no recovery return params, and no persisted protected intent reopens the resume decision after login.
4. **Custom retry target propagation is incomplete.** The production Help-FAQ route works, but the optional Home target cannot survive a multi-hop retry without a navigation-contract change.

These findings are routed to T3.2/T5.2/auth integration in the master findings log. Implementing them here would violate T3.4's surgical file scope.

## Ship Checklist

- Re-verify at branch tip: **STOPPED** — focused and full unit suites pass, but `test:screens` is red and the runtime Done criteria above remain blocked.
- Gate/merge to main: **NOT RUN** — no unverified/incomplete recovery claim was merged.
- Mobile deploy: **NONE**.
- Re-test on main: **NOT APPLICABLE** because the branch was not merged.
- Remove worktree/branch: **NOT RUN**; preserved for the required scope decision or cross-owner continuation.
- Close out: task set to **BLOCKED**, not DONE.
