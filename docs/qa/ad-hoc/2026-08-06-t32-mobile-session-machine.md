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

Repro: `lesson-prod/repros/t32.sh` (RED on base, GREEN on tip).
Gate log line and post-merge re-run recorded below.
