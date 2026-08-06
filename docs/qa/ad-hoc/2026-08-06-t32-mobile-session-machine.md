# adhoc-2026-08-06-t32-mobile-session-machine — Verification Matrix

**Repo:** tbot-mobile · **Date:** 2026-08-06 · **Task:** T3.2 (mobile lesson-session state machine, 24 screens)
**Status:** PARTIAL — 4 defects fixed and verified; 3 deep-dive rows are **not verifiable in this repo state** and are routed to the findings log (see "Honest gaps")

## Context that shapes every verdict below

The lesson-session feature is a **production-hidden prototype pending its backend
contract**, and two existing guards pin that:

- all 24 routes carry `productionVisible: false, productionHiddenReason: 'backend-contract-unavailable'`
  (`src/features/lesson-session/navigation.ts`), asserted by `tests/navigation/production-hidden-routes.test.ts`;
- the machine factory has **zero callers under `src/`** — the same suite asserts
  *"keeps the dead lesson-session state machine out of runtime source callers"*;
- `src/services/api/lesson-session.api.ts` is 100 % throw-stubs
  (already logged in LESSON_PRODUCTION_PLAN.md §5, 2026-08-06, T0.2 → T3.2).

So the machine and the 24 screens exist as two halves of the same spec with
**nothing joining them at runtime**. Everything below is therefore verified at
the model + navigation-graph level, which is the highest level this repo state
admits. Rows needing a live renderer are marked `UNVERIFIABLE (no runtime)` and
routed — an honest `UNVERIFIABLE` outranks an unproven claim (plan §1 rule 7).

Spec of record: `migrate-ui-ux-to-mobile-app-docs/migration/state-machines-mobile-ux.md`
§2.2 (diagram), §3.2 (state table), §4.2 (transition table).

## Problems found

### MOB-T32-1 — plan §4.2's `RECONNECTING → AUDIO_FAILED` row was unimplemented

Plan §4.2 carries an explicit row:

> `RECONNECTING → AUDIO_FAILED` | `audio_init_fail_on_resume` | If WS resumes but
> the audio pipeline fails to re-initialize on the device, machine moves to
> AUDIO_FAILED (not a server-side terminal; client-detectable).

`RECONNECTING` in `lessonSession.machine.ts` handled only `WS_RESUMED`. XState v5
silently no-ops an event with no matching transition, so `AUDIO_INIT_FAIL` arriving
during a reconnect was **dropped on the floor**. Because the same state also has no
client-side terminal by design (plan §0 Principle 1 — correctly so), the child was
left on the Reconnecting screen **forever**: offline banner up after 15 s, no retry,
no exit, waiting on a server event that would never come because the failure was
local to the device.

### MOB-T32-2 — every recovery restarted the lesson from the greeting

`INTERRUPTED --RESUME-->`, `PAUSED --RESUME-->` and `RECONNECTING --WS_RESUMED-->`
all targeted bare `ACTIVE`, which re-runs `initial: 'GREETING'`. So a 2-second WS
blip in the middle of activity 4, or tapping "Keep playing" on the exit sheet,
threw the child back to *"Hi friend! 👋 Ready to play with words?"*.

This also put the machine in **direct contradiction with the screen layer**:
`ExitConfirmScreen.resumeLesson()` deliberately reads `voiceStateBeforeInterruption`
to return the child to the exact screen they left, and `sessionContext.ts` carries
`voiceStateBeforeInterruption` + `lastAcceptedProgress` for the same purpose. The UI
promised place-preservation the model could not deliver.

### MOB-T32-3 — the realtime adapter had no session-epoch check

`lessonSessionEventFromRealtimeFrame` validated `frame.sessionId` as a non-empty
string and then **discarded it**:

```ts
if (typeof value.sessionId !== 'string' || value.sessionId.length === 0) return false;
...
return { type: 'TURN_COMPLETE', turnId: value.turnId, responseText: value.responseText };
//        ^ sessionId never compared to the live session
```

Any `TURN_COMPLETE` the WS flushed **after the child exited**, or belonging to the
first of two sessions opened by a double retry tap, was translated verbatim and
drove the current machine — pulling a live `ACTIVE.THINKING` back to
`ACTIVE.ROBOT_LISTENING` on behalf of a session that no longer existed. The frame
carried exactly the field needed to reject it.

### MOB-T32-4 — the hardware-back confirm gate covered 4 of 14 live screens

`useLessonHardwareBack` documents the invariant *"the spec treats all non-terminal
exits as confirmation-gated"*, but had only four consumers (RobotListening,
UserSpeaking, RobotSpeaking, Thinking). Android back on **Greeting, ActivityIntro,
Silence, ActivityDone, Success, Bargein, Gentle, Retry, Offtopic or Reconnecting**
— all states where the session is still open server-side — popped the back stack,
dropping the child out mid-lesson with no confirmation. This is the same defect
class as the MOB-2 bug the hook was written to fix, just on the other ten screens.

### Structural gap — no state → screen projection existed anywhere

The machine → screen mapping lived **only inline inside
`tests/navigation/state-machine-executable-alignment.test.ts`**, which walks a
single happy path and projects 8 of the 24 screens. There was no production
artefact that could answer *"does every server state map to a screen?"*, *"what
renders on a state this build doesn't know?"* or *"which screens can no state
produce?"* — the three questions this task is defined by. Consequence: an
unrecognised state had no defined behaviour at all, and orphans were invisible.

## Changes

| File | Change |
|---|---|
| `src/state/machines/lessonSession.machine.ts` | **MOB-T32-1** `RECONNECTING` gains the plan's `AUDIO_INIT_FAIL → AUDIO_FAILED` edge (clearing the offline banner on the way out). **MOB-T32-2** `ACTIVE` gains a shallow `hist` node defaulting to `GREETING`; the three recovery transitions retarget `ACTIVE.hist` |
| `src/state/machines/lessonSessionRealtimeAdapter.ts` | **MOB-T32-3** epoch argument is now **required**, not optional — a frame is dropped unless `frame.sessionId` exactly equals the live `context.sessionId`, and every frame is dropped when no session is live |
| `src/features/lesson-session/stateProjection.ts` | **new.** The machine ↔ screen join: `SCREEN_BY_MACHINE_STATE`, interrupt-reason fan-out, `projectLessonScreen()` with `UNKNOWN_STATE_FALLBACK_SCREEN`, `TERMINAL_LESSON_SCREENS` / `LIVE_LESSON_SCREENS`, `ORPHAN_LESSON_SCREENS`, `LESSON_RESUME_TOKEN_BY_SCREEN`. Pure function of state-path strings — it must never import the machine, or it would trip the "no runtime callers" guard |
| 10 screens (`Greeting`, `ActivityIntro`, `Silence`, `ActivityDone`, `Success`, `Bargein`, `Gentle`, `Retry`, `Offtopic`, `Reconnecting`) | **MOB-T32-4** each mounts `useLessonHardwareBack` with its own resume token |
| `src/features/lesson-session/screens/ExitConfirmScreen.tsx` | Resume switch extended from 4 to 14 arms, one per live screen, written as literal `ROUTES.*` navigate calls so the navigation-graph analysis keeps seeing the edges. `default:` → Listening retained |
| `src/features/lesson-session/navigation.ts` | 9 newly-resumable routes join `forwardCycleGroup: 'lesson-exit-resume'` (the ExitConfirm ↔ screen pairs are legitimate declared cycles) |
| `tests/state/machines/lessonSession.transitionCoverage.test.ts` | **new**, 107 cases — every declared edge, flapping, ghost timers, terminal escape matrix |
| `tests/features/lesson-session/lesson-state-projection.test.ts` | **new**, 43 cases — projection walked against a **real running actor**, unknown-state fallback, orphan audit, terminal/live classification, resume-token round-trip |
| `tests/features/lesson-session/lesson-hardware-back-wiring.test.tsx` | rewritten table-driven off `LIVE_LESSON_SCREENS`: 14 live screens gated + the negative half (6 terminals and ExitConfirm must **not** swallow back) |
| `tests/state/machines/lessonSessionRealtimeAdapter.test.ts` | 5 stale-session cases added; existing 3 re-pointed at the new required epoch argument |
| `tests/navigation/navigation-architecture.test.ts` | delivery-review inventory updated for the 9 routes joining the resume cycle group |

The projection is asserted against a **live actor** rather than a hand-written list
of state names on purpose: a state added to the machine without a screen shows up
here as a fallback projection instead of passing silently — the same trap that let
the mapping drift into a test helper in the first place.

## Deep-dive case checklist

| # | Case | Verdict | Evidence |
|---|---|---|---|
| 1 | Every server-emitted state maps to a screen; unknown → safe fallback, not a crash | **PASS (fixed)** | `every machine state the server can reach projects to a screen` — 19 states walked on a real actor + 4 interrupt reasons, all `isFallback: false`; `unknown states land on a safe fallback` — 9 hostile values (`undefined`, `null`, `42`, `{}`, nested composites, `''`) → `audio_error`, plus a guard that the fallback is non-terminal and carries a "Go home" |
| 2 | Rapid state flapping debounced; no thrash or stuck transition | **PARTIAL** | Model half proven: `survives 200 listening↔thinking flaps`, `ignores events that do not belong to the current substate`, `flapping in and out of RECONNECTING neither loses the substate nor leaks banners`. The **renderer debounce cannot exist yet** — no runtime consumer. Routed |
| 3 | Stale WS event after exit ignored (session epoch); cannot resurrect UI | **PASS (fixed)** | MOB-T32-3 fix + 5 epoch cases (previous session, later session, no live session, exact-match-only); `terminals absorb every re-entry attempt` includes a late `TURN_COMPLETE` |
| 4 | Hardware back on EVERY screen: exit-confirm where live, direct exit only on terminals | **PASS (fixed)** | 14 live screens each route back to ExitConfirm with their own token; 6 terminals + ExitConfirm asserted to register **no** back listener |
| 5 | App background→foreground re-sync to server truth | **UNVERIFIABLE (no runtime)** | No `AppState` listener and no session runtime exist in the feature. Routed |
| 6 | Terminals cannot be escaped back into a live session | **PASS** | `terminals absorb every re-entry attempt` — 7 terminals × 12 escape events (`RESUME`, `RETRY`, `WS_RESUMED`, `START_SESSION`, `SESSION_STARTED`, turn events, `SESSION_END`) + 60 s timer advance; `endReason` proven immutable after the terminal |
| 7 | Silence/CostCapped timers fire correctly, cancelled on state change (no ghost timers) | **PASS** | Silence and CostCapped have **no client timers by design** (server-authoritative, plan §0 Principle 1) — `no client wallclock promotes any state to a terminal` advances 45 min in all 8 substates. The one client timer (15 s RECONNECTING banner) is proven cancelled on exit and after 20 flap cycles |
| 8 | Parent-stop from another device reflected within seconds | **PASS (model)** | `a parent stop raised from another device terminates from any live substate` (8 substates) + PAUSED/RECONNECTING/INTERRUPTED. Wall-clock latency is a WS-delivery property owned by T2.4/T1.5, not the mobile model |
| 9 | Phone call / audio interruption mid-lesson → correct pause/recover screen | **PARTIAL** | `AUDIO_INIT_FAIL` now recovers from RECONNECTING (MOB-T32-1) and already did from CONNECTING. There is **no edge from ACTIVE** — and plan §4.2 has no such row either, so adding one would be inventing topology. Routed as a spec gap |
| 10 | Two rapid session starts → single session context, no duplicated listeners | **PASS** | `a second rapid START_SESSION tap does not re-enter CONNECTING or remint the key`, `a duplicate SESSION_STARTED does not restart the turn loop`. Listener duplication is a runtime property — no runtime consumer exists to duplicate them |
| 11 | Orphan/unreachable screens flagged | **PASS (flagged)** | `accounts for all 24 screens as reachable or explicitly flagged` — 23 reachable, **`success` is a genuine orphan** and is allow-listed with its reason; a new orphan fails the suite |

### The orphan: `success`

`SuccessScreen` ("Success Moment") has a `STATES` entry, a `SCREEN_MAP` entry, a
registered route and outgoing CTAs — but **no machine state can produce it**. Plan
§2.2 collapses per-turn feedback into the single `INTERRUPTED` state with four
reasons (`bargein` / `gentle_correction` / `retry` / `offtopic`); there is no
`SUCCESS` state anywhere in the diagram or the §3.2 state table.

It is **flagged, not deleted**: `STATES`, `SCREEN_MAP` and the route registry must
stay in lockstep (`tests/navigation/feature-state-alignment.test.ts`), so removing
it is a three-file product decision, not a mobile refactor. Recorded in
`ORPHAN_LESSON_SCREENS` with the rationale and routed to the findings log.

## Honest gaps (routed to LESSON_PRODUCTION_PLAN.md §5, not fixed here)

1. **Renderer debounce / background-foreground re-sync / listener duplication**
   (checklist rows 2, 5, 10-partial) cannot be built or tested until the
   lesson-session API stops being throw-stubs and the machine gets a runtime
   consumer. Owner: T5.2 (backend↔mobile contract) then T3.4.
2. **No `ACTIVE → AUDIO_FAILED` edge for a mid-lesson audio interruption** (phone
   call, route change). Both the machine and plan §4.2 lack it. Owner: T3.4.
3. **`success` orphan screen.** Owner: T3.4 / product.
4. **`tests/navigation/age-screen.test.tsx` is a load-dependent flake** — passes in
   isolation, fails at the 5000 ms jest default under full-suite parallel load.
   **Pre-existing**: it failed on the unmodified branch point before any change in
   this session (baseline run below) and is unrelated to lesson-session. Same class
   as the existing T0.3→T3.1 finding. Owner: T6.5.

## Verify runs

Branch `lesson-prod/t32-mobile-session-machine`, worktree
`/Users/manhhodinh/Documents/TBOT/worktrees/t32-mobile-session-machine`,
branched from `main` @ `97f21cc8`.

### Baseline (branch point, before any change)

```
$ npm run test:state-machines
Test Suites: 9 passed, 9 total
Tests:       84 passed, 84 total

$ npm run test:navigation      # cold run
Test Suites: 2 failed, 24 passed, 26 total
Tests:       2 failed, 136 passed, 138 total
             (age-screen.test.tsx + one sibling — 5000 ms timeouts under load)
$ npm run test:navigation      # warm re-run, same tree
Test Suites: 26 passed, 26 total
```

### After the fix

```
$ npm run typecheck
> tsc --noEmit                 # clean

$ npm run lint
> eslint src/ tests/ --max-warnings=0    # clean

$ npm run test:state-machines
Test Suites: 10 passed, 10 total
Tests:       193 passed, 193 total       # was 84 — +109

$ npm run test:navigation
Test Suites: 25 passed, 1 failed, 26 total
Tests:       137 passed, 1 failed, 138 total
             (age-screen.test.tsx only — pre-existing load flake, see gap 4)
$ npx jest --selectProjects unit --testPathPattern='age-screen'
Tests:       3 passed, 3 total            # passes in isolation

$ npx jest --selectProjects unit --testPathPattern='(lessonSession|lesson-session)'
Test Suites: 12 passed, 12 total
Tests:       235 passed, 235 total
```

`lessonSession.machine.test.ts` — including its load-bearing *"RECONNECTING never
self-terminates"* invariant — passes **unchanged**: the history fix and the new
`AUDIO_INIT_FAIL` edge are additive and do not weaken the server-authoritative
terminal rule.

## Gate

Repro: `lesson-prod/repros/t32.sh`. It writes a self-contained probe into the
worktree at run time so the **identical** assertions execute on the pre-patch base
and on the fix tip — one assertion per defect (MOB-T32-1…4) plus the projection /
unknown-state-fallback gap.

**First attempt was rejected, correctly.** The initial repro just listed the new
test files. Jest treats positional args as path *patterns* and silently ignores
ones that match nothing, so on base it ran only the one pre-existing suite and
exited 0 — a tautological repro. `gate.sh` caught it:

```
| t32 | REJECTED (repro green on base) | base=654b48d2 tip=ce55850f | 2026-08-06T10:33:49Z |
```

Rewritten as a behavioural probe, then:

```
$ ./lesson-prod/scripts/gate.sh t32 tbot-mobile lesson-prod/t32-mobile-session-machine
gate[t32] RED phase @ base 654b48d2ad74efae25a7af5e1099375aac2149ef
gate[t32] GREEN phase @ tip ce55850fdc5c1b1d28507bcdc3b38bf1f57098f2
GATE PASS: t32 VERIFIED (RED@base rc=1, GREEN@tip rc=0)

| t32 | VERIFIED | base=654b48d2 tip=ce55850f red=9f284e4b434f green=caaf1dfe6322 | 2026-08-06T10:36:51Z |
```

RED log — every assertion reproduces the bug on base, none passes vacuously:

```
✕ RECONNECTING recovers to AUDIO_FAILED when audio cannot re-init on resume
✕ resume returns to the substate the child was in, not the greeting
✕ drops a realtime frame that belongs to another session
✕ gates Android hardware-back through ExitConfirm on live screens beyond the four voice screens
✕ projects machine states onto screens and never crashes on an unknown state
Tests: 5 failed, 5 total
```

## Ship checklist

1. **Re-verify at tip.** Rebased twice (main moved under this session:
   `97f21cc8` → `b1536165` → `654b48d2` as T3.1's docs and T3.3 landed).
   At the final tip: typecheck clean, lint clean, `test:state-machines`
   196/196, `test:navigation` 137/138 with only the pre-existing `age-screen`
   load flake (intermittent across 4 runs on the branch: pass / fail / fail /
   pass — and it failed on the **unmodified** branch point before any change in
   this session).
   A/B control: `no-circular-forward-navigation` (the test most affected by the
   9 new cycle-group routes) 3306 ms on branch vs 2752 ms on main — a 20 %
   graph-walk increase, not the flake's cause.
2. **Merge via the gate.** `merge-task.sh t32` → gate VERIFIED → merged to
   `main` as `e33f5a2e` with a merge commit (no squash).
   `lesson-prod/.merge-counter` = 10.
   **Pushed** (`97f21cc8..a62abf88`) once T3.1, T3.2 and T3.3 were all `DONE`, so
   every one of the 16 published commits is completed, gate-VERIFIED work.
   `merge-task.sh` leaves pushing a human step because a `tbot-backend` push
   auto-deploys on Render; `tbot-mobile` has no such trigger, so this push runs
   CI only. Expect that CI run to be **red** — mobile `main` CI has failed on
   every run since 2026-07-03 for two causes unrelated to this change
   (integration-test timeout + `react-native-worklets` NDK symbol strip), both
   already logged in §5 against T6.5 / T3.4.
3. **Deploy.** None — mobile per task; merged changes ship in the next EAS/fastlane
   release, a user decision. The feature also remains `productionVisible: false`.
4. **Re-test on main.** Run twice, because T3.1's session-2 fix merged on top of
   this one while the checklist was running. Identical results at both
   `e33f5a2e` (this merge) and `a62abf88` (current `main`/`origin/main`, four
   T3.1 commits later) — so T3.2 is green both in isolation and after the
   sibling mobile task landed on it:

   ```
   $ npm run typecheck                 # clean
   $ npm run lint                      # clean
   $ npm run test:state-machines       Test Suites: 10 passed  Tests: 196 passed
   $ npm run test:navigation           Test Suites: 26 passed  Tests: 138 passed
   $ lesson-prod/repros/t32.sh         Tests:  5 passed, 5 total
   ```

   The `age-screen` load flake did not reproduce in either main run.

5. **Worktree removed.** `worktrees/t32-mobile-session-machine` deleted after
   confirming `git status` clean and `git merge-base --is-ancestor` true; local
   branch `lesson-prod/t32-mobile-session-machine` deleted. It was never pushed,
   and `git ls-remote --heads origin 'lesson-prod/*'` returns empty, so there is
   no remote branch to delete.

6. **Closed out.** Status `DONE` in this file and in LESSON_PRODUCTION_PLAN.md §2;
   6 findings routed to §5 (3 deep-dive gaps, the `success` orphan, 2 T0.4 tooling
   defects, 1 flaky-suite row).

### Integration re-gate (merge #10, every-5-merges)

The re-gate reported 11 repros failing on main. **None is caused by this merge**:

- `t11 t12 t15 t21 t22 t24 t42 t42-backend` live in `tbot-backend`,
  `robot/esp32-server` and `manager-web` — repos a mobile-only merge cannot touch.
  Their tasks are still IN_PROGRESS, so their repros are committed ahead of their
  fixes, exactly as the T0.4 protocol prescribes (commit repro → CLAIMED).
- `t31` and `t34` are mobile but fail identically at **pre-merge** main
  `654b48d2` (verified in a detached worktree): `t31` references
  `tests/features/course-flow-error-edges.test.tsx` — "0 matches", the file is
  not on main; `t34` calls `decideLessonRecovery` / `recoveryScreenForReason`,
  which `recoveryTypes` does not yet export. Both are unmerged in-flight work.
- `tdry` is the dry-run placeholder; its `# repo:` header reads `(dry-run)`, so
  the harness `cd`s into a directory that does not exist.
- **`t32` and `t33` are absent from the failure list** — both pass on main.

The re-gate re-runs *every* repro in the campaign against *every* repo's current
main, including tasks whose fixes have not merged, so its verdict is currently a
permanent false "REGRESSION". Routed to the findings log for T0.4.
