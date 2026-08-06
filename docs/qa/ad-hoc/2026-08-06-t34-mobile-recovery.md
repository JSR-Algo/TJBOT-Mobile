# T3.4 Mobile Recovery — Production Completion Evidence

**Repo:** `tbot-mobile`  
**Date:** 2026-08-06  
**Base:** `f4435e44`  
**Completion branch:** `lesson-prod/t34-mobile-recovery-completion`  
**Architecture:** ADR 0006 remains authoritative: the robot owns the lesson runtime and the phone reattaches a read-only observer.

## Reproduction

The executable campaign repro is `lesson-prod/repros/t34.sh`. It materializes the
same production-checkpoint probe in the tested worktree and runs the recovery
store, authoritative resume matrix, and root-navigation recovery suites.

RED on the pre-completion base `f4435e44`:

```text
FAIL tests/features/fallback/t34-gate-probe.test.ts
Cannot find module '@/features/fallback/recoveryCheckpointStore'
Test Suites: 1 failed, 2 passed, 3 total
Tests:       29 passed, 29 total
```

GREEN at completion tip `f94766cc`:

```text
Test Suites: 4 passed, 4 total
Tests:       67 passed, 67 total
Snapshots:   0 total
```

The pre-completion app had no persisted checkpoint store, no cold-start or
post-auth recovery bootstrap, no authoritative assignment validation, and lost
custom reconnect targets after the first retry hop.

## Fix Diff Summary

| Area | Production change |
| --- | --- |
| Persisted intent | Added a versioned SecureStore checkpoint. Invalid JSON, partial writes, unsupported versions, incomplete identity, and read failures return no resumable state. |
| Authoritative resume | `LessonResumeScreen` checks `GET /devices/:deviceId/assignment/current`. Only a matching live assignment can expose `Keep going`; terminal, missing, or mismatched authority clears the checkpoint and ends cleanly. Query errors preserve the checkpoint and offer retry. |
| Observer lifecycle | `RunningScreen` and `CompanionScreen` persist live assignment identity, update supported observer phases, and clear on completed/failed/cancelled/safety/known terminal outcomes. |
| Boot/auth return | `RootStackNavigator` loads recovery during boot, preserves it through authentication, requalifies expired auth in memory, and enters `LessonResumeScreen` only after onboarding and device-setup prerequisites. A five-second timeout prevents a hanging storage read from blocking the app. |
| Reconnect escalation | `failureTarget` now survives every NetworkError/overlay retry hop, including custom Home escalation. |
| Navigation invariant | Recovery reattaches `RunningScreen`; it never starts or restarts an assignment through `SendToRobotScreen`. |

Implementation commits:

- `700b4521` — versioned secure checkpoint persistence
- `aebd3775` — authoritative assignment validation
- `6d802bff` — authoritative recovery navigation contract
- `f4df3ef9` — stale async validation race protection
- `331be1ac` / `14896728` — production observer checkpoint lifecycle and terminal hardening
- `c29f6d34` / `28b85d35` — cold-start, auth-return, timeout, and requalification
- `f94766cc` — multi-hop reconnect target preservation

## Recovery Matrix

| Failure point / state | Expected recovery outcome | Evidence | Verdict |
| --- | --- | --- | --- |
| App killed in connecting | Persist and restore; resume only after matching live authority | matrix + store + root tests | PASS |
| App killed in greeting | Persist and restore; resume only after matching live authority | matrix + observer phase tests | PASS |
| App killed in listening | Persist and restore; resume only after matching live authority | matrix + observer phase tests | PASS |
| App killed in speaking | Persist and restore; resume only after matching live authority | matrix + production screen tests | PASS |
| App killed after done | Clear/ended path; no resume CTA | matrix + terminal lifecycle tests | PASS |
| Backend/robot completed, failed, or cancelled | Clear checkpoint; `Lesson ended`; never fake-resume | authoritative matrix tests | PASS |
| Assignment missing or identity mismatched | Clear checkpoint; `Lesson ended` | authoritative matrix tests | PASS |
| Authority unavailable | Keep checkpoint; show cannot-confirm + retry; no resume | authoritative matrix tests | PASS |
| Airplane mode mid-step | Preserve checkpoint and target; escalate at configured threshold | multi-hop fake-timer tests | PASS |
| Bluetooth/audio-route change | Route through AudioRecovery and back to the recovery decision | recovery matrix | PASS |
| Auth/session expiry | Keep persisted intent through auth stack replacement, then re-evaluate | root navigator + matrix tests | PASS |
| Double-tap resume | Single navigation to `RunningScreen` | recovery matrix | PASS |
| Recovery reason/type mapping | Exhaustive mapping guarded by TypeScript | recovery matrix + typecheck | PASS |
| Partial/corrupt/version-mismatched storage | Fail closed to no resumable checkpoint | checkpoint store tests | PASS |
| Hanging storage read | Boot continues after five seconds; late completion ignored | root navigator fake-timer tests | PASS |

## Branch-Tip Verification

All task-owned tests and required static/contract checks passed at `f94766cc`:

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:state-machines` | 10 suites / 196 tests passed |
| `npm run test:navigation` | 26 suites / 149 tests passed |
| `npm run api:contract-sync:check` | PASS — 283 served operations, 201 documented operations, 97 mobile calls, 38 registry rows |
| focused six-suite recovery run | 6 suites / 149 tests passed |
| `lesson-prod/repros/t34.sh` | 4 suites / 67 tests passed |
| `npm run test:screens` | 72 suites / 998 tests passed |
| `npm test` | 228 suites / 2664 tests passed; 1 suite and 19 tests skipped |

The first `test:screens` attempt reproduced the already logged T3.3 pagination
order failure (`997/998` passed); the immediate unchanged rerun passed `998/998`,
and the same test passed inside the full suite. This is the existing F-T52-09 /
T0.4 screen-gate instability in `LESSON_PRODUCTION_PLAN.md` section 5, not a T3.4
code failure. No out-of-scope production code was changed.

## Review

Each implementation slice passed separate specification and quality review.
Review-driven fixes covered pending-checkpoint races, failed-write ordering,
observer terminal handling, unknown `session.end` reasons, bootstrap timeout,
post-auth requalification, and reconnect-target preservation. A final whole-
branch review was requested after all fixes and before merge.

## Ship Checklist

- Rebase and tip re-verification: pending final main synchronization.
- T0.4 gate: pending; repro RED/GREEN is proven above.
- Deploy: none for mobile; changes ship in the next operator-chosen app release.
- Main re-test: pending merge.
- Worktree/branch cleanup: pending successful main verification.
