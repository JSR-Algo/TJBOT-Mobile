# T5.4 Parent Today realtime ready-state and token-expiry recovery

**Draft status:** implementation and verification evidence only. M1 still owns merge/push to
mobile main and installation of the main release APK. This document does not claim production
resolution or satisfy the final T5.4 Parent SLA gate; H1 must provide the fresh s1-s9 capture.

## Physical reproduction

Parent Today was opened before assignment `1bf94fe0-435d-4846-88d4-3153f3a53e81`
and remained foregrounded while the robot was temporarily offline. The screen received
the initial W2 assignment and rendered `PREPARING`, but it did not render any of the
nine subsequent steps after the robot reconnected. The robot completed s1-s9, the
backend persisted `lesson_completed`, assignment read-back returned `COMPLETED`, and
the runtime returned to `CONVERSATION`; the automatic Android collector captured 0/9.

Evidence:

```text
robot/docs/evidence/t54-live-20260817-final-main-closeout/final-parent-sla-pass-7/
15:45:20 s1 step_started persisted=true
15:47:10 s9 step_completed persisted=true
15:47:13 lesson_completed persisted=true
15:47:13 assignment/current state=COMPLETED
parent-progress/captures.tsv: empty
parent-progress/collector-summary.txt: capturedCount=0
```

## Root causes

Three independent mobile defects could leave Parent Today mounted but stale:

1. `createReconnectingSocket()` attached `onopen` only after the native socket was
   created. If React Native returned a socket whose `readyState` was already `OPEN`,
   the open event could be missed and the parent subscription was never sent. Main
   commit `7db0c7d8` added subscription bookkeeping for a socket that invokes the
   handler during attachment; `73a1a909` is distinct because it closes the lower-level
   already-`OPEN` transport race and de-duplicates a later native `onopen` callback.
2. `mergeRealtimeUpdate()` returned the cached status unchanged whenever the initial
   REST response had `activeLearning=null`. A complete first realtime lesson frame was
   therefore discarded, so a lesson that started after the screen opened did not appear
   until another REST fetch happened.
3. The parent-progress gateway revalidates its JWT every 15 seconds and closes with
   `4401` after the 15-minute access token expires. Mobile explicitly refused to
   reconnect on `4401`, while the parent hook broadcast the expiry as healthy transport
   state. That disabled both reconnect and fallback polling. An assignment notification
   could still refresh the initial card, hiding the dead channel until step events began.

## Fix

- `createReconnectingSocket()` checks `readyState === OPEN` after attaching handlers
  and reports open exactly once.
- `useParentLearningStatusQuery()` accepts a complete active-learning frame when the
  cached status is initially inactive, while incomplete first frames remain ignored.
- `openParentProgressRealtime()` reconnects after `4401` but still fails closed on
  `4403` access revocation. The hook immediately invalidates the authenticated REST
  query and enables fallback polling on auth expiry. The REST 401 interceptor refreshes
  the access token; the scheduled reconnect then reads the refreshed token. A healthy
  socket disables fallback polling again.

## RED to GREEN

`lesson-prod/repros/t54-parent-realtime-ready-state.sh` writes two temporary Jest probes
into each checked-out revision and asserts all three behaviors. It does not inspect for
file or test presence.

```text
RED @ merge base 85db57aeb5e0cc456665271cd7df76bcb012d000
already-open transport: expected onOpen 1, received 0
initially inactive status: expected active lesson object, received null
JWT 4401: expected getParentLearningStatus 2 calls, received 1
3 failed, exit 1

GREEN @ branch tip
2 suites passed, 3 tests passed, exit 0
JWT coverage includes the immediate refetch, reconnect creation, and the 10-second
fallback polling tick while the replacement socket is not yet healthy.
```

## Rebase and overlap audit

- Fetched `origin`; `origin/main` and local `main` were both `85db57ae`.
- Rebase was a no-op because the branch already descended from `origin/main`.
- Patch/file/test comparison proved `7db0c7d8` and `73a1a909` are not duplicates:
  the former repairs parent subscription initialization, while the latter repairs the
  generic socket ready-state notification. All realtime commits were retained.
- Preserved regressions: initially inactive lesson creation and JWT-`4401` recovery.

## Verification blocker corrected

Main commit `3602a9ae` had checked production service URLs into auto-generated
`src/__env__.ts`, contradicting the existing generated-default guard and causing the
required full unit suite to fail. `7071558f` restores generated-clean defaults. Release
bundling still loads production values from `.env`; the generated source is restored to
its committed-clean form after the APK is produced.

## Verification

```text
Focused parent/realtime: 3 suites, 42 passed, 0 failed
TypeScript: PASS
ESLint: PASS
Unit suite: 229 suites passed, 1 skipped; 2724 passed, 19 skipped, 0 failed
Android release build: BUILD SUCCESSFUL in 31s; 677 actionable tasks
git diff --check: PASS

Realtime implementation tip: a12b4921fd2abc3f00ccbda86e515d4a5ec170e7
Verified source tip before evidence commit: cdb0d48767a8ec8d6327ea52ed91ee98b35b11dd
Branch APK SHA-256: 46b659e3953e44b5ddb6c8a9d47d9f310f295da4c02862b0b22dc722b4c9fc61
```

The shell did not expose `npm`/`npx`; the same package scripts and Jest arguments were
run through the repository's installed CLI entry points with the bundled Node runtime.
Gradle used Homebrew OpenJDK 17 and the same bundled Node binary on `PATH`.

## Review

- Specification review: no blocking findings; confirmed all three behaviors, the
  non-duplicate overlap, and behavioral RED/GREEN evidence.
- Code-quality review: no production blockers. Its sole Minor finding requested an
  explicit JWT-`4401` fallback polling assertion; the maintained hook test and campaign
  repro now cover the 10-second tick. Focused re-review approved the correction with no
  new blocking findings.
