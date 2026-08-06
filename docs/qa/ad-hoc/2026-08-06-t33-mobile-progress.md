# adhoc-2026-08-06-t33-mobile-progress — Verification Matrix

**Repo:** tbot-mobile · **Date:** 2026-08-06 · **Task:** T3.3 (mobile progress dashboard & parent realtime)
**Branch:** `lesson-prod/t33-mobile-progress` · **Gate:** VERIFIED ([`t33` in GATE_LOG.md](../../../../lesson-prod/GATE_LOG.md))
**Status:** all eight deep-dive boxes walked — four defects fixed, four properties verified and locked

## Scope

`src/features/progress/**`, `src/services/ws/parentProgressRealtime.ts`,
`src/services/api/progress.api.ts`, `src/services/api/parentLearning.api.ts`.

## What was already correct (verified, then locked with regression tests)

The realtime transport needed no change. Driving the **real** socket stack (global
`WebSocket` → `createReconnectingSocket` → `openParentProgressRealtime` → the query
hook) rather than a mocked abstraction, four properties hold:

| Property | Mechanism | Lock |
|---|---|---|
| Reconnect resumes from the last **applied** revision | `onOpen` re-sends `{type:'subscribe',lastProjectionRevision}` from the socket's own `currentRevision`, which only advances when a frame is actually applied | `re-subscribes from the last APPLIED revision after the socket drops mid-lesson` |
| A terminal event that lands during the outage is not missed | `onReconnect` → `onInvalidate` → REST refetch of the parent projection | `recovers a terminal event that landed while the socket was down` |
| Duplicate / replayed frames are applied once | `compareProjectionRevisions(revision, currentRevision) <= 0 → return` (decimal string compare, no `Number` coercion) | `applies a duplicate or replayed realtime frame exactly once` |
| A revision gap refetches instead of merging a stale partial delta | `revision !== incrementRevision(currentRevision) → onInvalidate` | `refetches instead of guessing when the realtime stream skips a revision` |

New suite: `tests/features/progress/t33-parent-realtime-catchup.test.tsx` (4 cases).

## Defects found and fixed

### 1. "Today's Progress" had no day bucket at all (HIGH — parent-facing correctness)

`TodayProgressScreen` (state id `today_progress`, home CTA "Today's progress",
header subtitle "Today") rendered **only** lifetime and rolling-recent aggregates:
`completedLessons` / `totalLessons` summed over course progress, and
`recentDurationSec` summed over *every* session in the recent page under the label
"Recent active time". Nothing on the screen bucketed by day, so nothing reset at
local midnight — a parent opening the screen at 00:01 saw exactly the number they
saw at 23:59, attributed to "Today".

Fix: `buildCanonicalProgressDashboard` now derives `todayLessonsCompleted` and
`todayActiveSec` from the session history bucketed on the **Asia/Ho_Chi_Minh**
calendar day, and the hero leads with those two. The offset is applied
arithmetically (`householdDayKey`, fixed UTC+7, no DST) rather than via
`Intl`+`timeZone`, because Hermes builds do not reliably ship a full ICU timezone
database. Lifetime totals stay lifetime and remain visible ("Lessons completed",
and per course in the Learning path card).

### 2. Dashboard totals were counted per projection **row** (MED — recurring version-space class)

`completedLessons` / `totalLessons` were `reduce`d straight over
`status.courseProgress`, so a repeated course key doubled a parent's lesson counts.
This is the row-space-vs-key-space defect class that has recurred across this stack
(ground rule 4). The backend read side is correct today —
`parent-learning-progress.service.ts` `/* parent-course-progress */` builds
`published_lessons` as `DISTINCT ON (course_id, lesson_key) … ORDER BY lesson_version DESC`
and tests `completed` with an `EXISTS` per lesson_key, so two published versions of
one `lesson_key` contribute exactly one row — but the mobile side had no guard of its
own. Totals and the rendered course list are now taken per course key.

### 3. `getChildProgress` could only ever 404 (HIGH — routed finding, T0.2 → T3.3)

`progress.api.ts` called `GET /learning/children/:childId/progress`. The backend's
`@Controller('learning/children/:childId')` exposes
`profile`, `session/today`, `interactions`, `kpis`, `session/complete`, `vocab`,
`vocab/due`, `difficulty`, `pronunciation-trend` — and **no** `progress` route
(`grep -rn "children/:childId/progress" tbot-backend/src` → no match).

A caller sweep shows zero production callers: the parent dashboard reads the
canonical projection through `parentLearning.api.ts`, and the per-assignment feed
through `getChildLessonProgress` (`GET /children/:childId/lesson-progress`, which
does exist). Rather than leave a call that silently 404s for whoever wires it up
next, it now fails closed on this repo's existing documented-contract sentinel
(`backendContractUnavailable`, the same convention `course-library.api.ts` /
`ai.ts` / `purchase.api.ts` use).

### 4. `WordsPracticedScreen` fabricated a child's practised words (HIGH — trust)

The screen hard-coded five words — `Hello`, `Cat`, `Happy` (STRONGER 💪) and
`Friend`, `Dog` (VISIT AGAIN SOON 🌱) — with per-word strength bars, under the line
*"These words got stronger today."*, for **every** child, including one with no
lesson history at all. There is no word-level projection to back it: the word reads
in `progress.api.ts` (`getWordsPracticed`, `getTodayProgress`, `getLessonSummary`,
`getReviewQueue`) are unimplemented stubs. The screen now states that plainly —
matching the honest empty state its sibling `ReviewNeededScreen` already used.

### 5. The dashboard served silently stale data on re-focus (MED)

`useChildProgressDashboardQuery` refreshed on mount, on app foreground, and on a
realtime frame — but had no focus hook, while its sibling
`useChildLessonProgressQuery` already had one. Navigating back to a screen that
stayed mounted in the stack therefore re-displayed the cached projection (and, after
fix 1, a "today" bucket computed before local midnight) with no refetch. Added a
`useFocusEffect` that invalidates the status + history queries on every focus after
the mount fetch.

## Changes

| File | Change |
|---|---|
| `src/features/progress/hooks/useChildProgressDashboardQuery.ts` | `householdDayKey` (exported) + `todayLessonsCompleted` / `todayActiveSec`; per-course-key totals and course list; `useFocusEffect` refetch; `buildCanonicalProgressDashboard` takes an injectable `now` for deterministic day-boundary tests |
| `src/features/progress/screens/TodayProgressScreen.tsx` | Hero leads with the two day-scoped stats ("Lessons today", "Active time today"), then lifetime "Lessons completed" |
| `src/features/progress/screens/WordsPracticedScreen.tsx` | Fabricated word tiles removed; honest "No practised words yet" state |
| `src/services/api/progress.api.ts` | `getChildProgress` fails closed on `backendContractUnavailable` instead of requesting a non-existent route |
| `tests/features/progress/t33-parent-realtime-catchup.test.tsx` | **new**, 4 cases over the real socket stack |
| `tests/features/progress/t33-dashboard-parity-and-freshness.test.tsx` | **new**, 7 cases: backend-fixture totals parity, key-space counting, day boundary, history pagination, focus freshness |
| `tests/features/progress/t33-zero-data-progress-screens.test.tsx` | **new**, 7 cases: zero-data dashboard / words / summary / celebration, celebration idempotency |
| `tests/features/progress/today-progress-screen.test.tsx` | Hero fixture + assertion updated for the day-scoped stats |
| `tests/api/lesson-progress-normalization.test.ts` | The case asserting the 404 route now asserts the read fails closed and puts nothing on the wire |
| `tests/e2e/course-progress-stability.test.tsx` | Dashboard mocks carry the two new fields |

## Deep-dive case checklist — every box walked

| # | Case | Verdict | Evidence |
|---|---|---|---|
| 1 | WS drop during live lesson: reconnect + refetch catch-up; no missed terminal event | PASS (was already correct) | `re-subscribes from the last APPLIED revision after the socket drops mid-lesson`; `recovers a terminal event that landed while the socket was down` |
| 2 | Duplicate realtime events render once (idempotent reducers) | PASS (was already correct) | `applies a duplicate or replayed realtime frame exactly once`; plus the gap case `refetches instead of guessing when the realtime stream skips a revision` |
| 3 | Totals equal backend projections on seeded fixture (key-space counting) | **FIXED** | `sums the canonical projection without re-deriving counts from rows` (fixture mirrors the `/* parent-course-progress */` SQL: one `lesson_key` published as v1+v2 ⇒ one row); `counts a course once per course key even if the projection repeats it` (RED before fix) |
| 4 | Zero-data child: dashboard / celebration / summary render empty states | **FIXED** (words screen) | `the dashboard reports zero without inventing activity`; `the words screen shows no practised words instead of sample vocabulary` (RED before fix); `the lesson summary waits for a real reward rather than showing one`; `the celebration screen degrades to a waiting state with no reward in the inbox` |
| 5 | Day boundary Asia/Ho_Chi_Minh: 'today' buckets correctly at midnight | **FIXED** | `maps an instant to the household local day`; `excludes sessions that finished before local midnight`; `resets the today bucket the moment the local day rolls over` (all RED before fix) |
| 6 | Long history: pagination / virtualization, no unbounded memory | PARTIAL | `accumulates pages without re-listing a session the previous page already carried` — `useParentLearningHistoryQuery` dedupes by `sessionId` across pages, so repeated cursor pages cannot grow the list. The *rendering* side is not virtualized (`ParentHistoryScreen` maps every accumulated item into a `ScrollView`); that file is outside this task's scope and is **routed as a finding**, not fixed here |
| 7 | Celebration not replayed on re-entry (idempotent celebration flag) | PASS (was already correct) | `acknowledges an unseen reward exactly once while it is on screen`; `does not celebrate again when the seen receipt is already queued offline` (the offline `rewardSeenQueue` entry *is* the idempotency flag); `does not celebrate again once the reward has left the inbox` |
| 8 | Stale cached dashboard clearly refreshed on focus (no silent stale data) | **FIXED** | `refetches the parent projection when the screen is focused again` (RED before fix: the hook had no focus effect at all) |

## Acceptance criteria

| # | AC | Verdict | Evidence |
|---|---|---|---|
| 1 | Realtime reconnect test passes | PASS | `t33-parent-realtime-catchup.test.tsx` — 4/4 |
| 2 | Totals parity vs backend fixture documented | PASS | Box 3 above + the fixture comment in `t33-dashboard-parity-and-freshness.test.tsx` citing the backend SQL it mirrors |
| 3 | RED before / GREEN after (T0.4 gate) | PASS | `lesson-prod/repros/t33.sh`: RED@`b1536165` 4 failed / 4 total, GREEN@`5b6df955` 4 passed / 4 total → `GATE PASS: t33 VERIFIED` |
| 4 | `npm run typecheck` | PASS | exit 0 |
| 5 | `npm run lint` | PASS | exit 0 (`--max-warnings=0`) |
| 6 | `npm run test:screens` (task verify command) | see Ship checklist | — |
| 7 | `npm test` (task verify command) | see Ship checklist | — |

The repro is deliberately **self-contained**: `t33.sh` writes its probe into the
worktree at run time, so byte-identical test code executes at base and at tip. A
repro that only ships as new test files cannot distinguish "bug present" from "test
absent" on the base commit.

## Out-of-scope findings routed (not fixed here)

Appended to `LESSON_PRODUCTION_PLAN.md` §5:

1. **T3.4** — `createReconnectingSocket` resets `reconnectAttempts` only in
   `onmessage`, never in `onopen`. A reconnect that succeeds but receives no traffic
   (an idle parent socket) keeps the elevated attempt count, so the next drop starts
   part-way through the budget and exhausts early. Shared transport
   (`src/services/ws/realtime.ts`), outside this task's named files.
2. **T6.1** — `ParentHistoryScreen` maps the entire accumulated history into a
   `ScrollView` with no virtualization; each "Load more" grows the mounted tree
   without bound.
3. **T5.2** — `getProgressSummary` resolves a frozen all-zero `ProgressSummary`
   instead of failing closed, so a caller cannot distinguish "no data" from "no
   backend contract" (its siblings in the same file throw).

Corroborates the existing flaky-suite finding (T3.1 deep-dive → T0.4/T6.5) rather
than filing a new one: see the Ship checklist below.

## Ship checklist

| Step | Result |
|---|---|
| 1. Re-verify at tip (rebased on `b1536165`) | `typecheck` 0 · `lint` 0 (`--max-warnings=0`) · `test:screens` 68 suites / 850 tests, 7 suites failed — **all** load-timeouts in device/onboarding/robot-mgmt/course-library, every `features/progress` and `features/parent` suite green · `npm test` 2384 tests, 6 suites failed, same flake class |
| 2. Gate (T0.4) | **PASS twice.** Standalone `gate.sh t33 tbot-mobile lesson-prod/t33-mobile-progress`: RED@`b1536165` (4 failed / 4 total) → GREEN@`5b6df955` (4 passed / 4 total). Re-gated by `merge-task.sh` at tip `92f84318`. Both rows in `GATE_LOG.md` |
| 3. Merge to main | `merge-task.sh t33` → merge commit `654b48d2`, no squash, merge #8 (the every-5th integration re-gate does not fire on 8). **Not pushed** — `merge-task.sh` leaves pushing as a deliberate human step; mobile main was already 1 commit ahead of `origin/main` before this merge |
| 4. Deploy | none — mobile ships in the next app release (fastlane/EAS), per this task's step 3 |
| 5. Re-test on main (`654b48d2`) | `typecheck` 0 · `lint` 0 · `test:screens --maxWorkers=2` **66/68 suites, 848/850 tests**; the 2 failures (`course-lesson-branch-coverage`, `childProfile-pairing-finalize`) both **PASS** on a serial re-run (18/18) · `npm test` **220/222 suites, 2362/2384 tests**; the 2 failures (`device-home-screen`, `pair-rename-screen`) both **PASS** on a serial re-run (49/49). All 18 T3.3 cases green in every run |
| 6. Remove worktree | done — see below |

### Flaky-suite caveat on the main re-test

Every failure in every run above is `Exceeded timeout of 5000 ms` (Jest's default),
in a *different* random subset each time, on a machine carrying load averages of
**70–105 across 10 cores** from concurrent campaign sessions. Nothing this task
touches is involved: the diff is confined to `features/progress`, `progress.api`'s
`getChildProgress`, and tests.

Controlled A/B on the suite that failed most often — `device-home-screen`, run 3×
on `main` (pre-merge `b1536165`) and 3× on the fix branch at `--maxWorkers=1`:

```
main  run1: 11 passed   t33 run1: 11 passed
main  run2: 11 passed   t33 run2: 11 passed
main  run3: 11 passed   t33 run3: 11 passed
```

6/6 green on each side. The failures track machine load, not the change. This
corroborates the existing finding (T3.1 deep-dive → T0.4/T6.5, "tbot-mobile unit
suites are not load-robust") rather than being a new one; `lesson-prod/repros/t33.sh`
is a single 4-case probe and completed in 6 s, so the gate verdict is not exposed to
this class of noise.

### Worktree removal

`worktrees/t33-mobile-progress` was clean (`git status` empty apart from the
untracked, gitignored `node_modules`) and `lesson-prod/t33-mobile-progress` was an
ancestor of `main` (`git merge-base --is-ancestor` exit 0) before removal. Worktree
removed and the local branch deleted; the branch was never pushed, so there is no
remote branch to delete.
