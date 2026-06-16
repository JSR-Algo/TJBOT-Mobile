# T16: Wire lesson session screens to the lessonSessionMachine

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: HIGH

## Problem
`createLessonSessionMachine` is fully implemented and unit-tested, but no production screen consumes it. `ConnectingScreen` instead hard-codes a 1.8 s `setTimeout` and navigates to `GreetingScreen` regardless of whether the realtime WebSocket/audio layer is actually ready. This leaves the machine — and its server-authoritative terminals, reconnect logic, and error states — unreachable in production.

Audit sources:

- `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/reports/state-architecture.md` §Improvements, lines 72:
  > "`src/state/machines/*.ts` exist but are not wired to the UI. `devicePairingMachine`, `parentApprovalMachine`, and `createLessonSessionMachine` are exported from `src/state/machines/index.ts` (lines 1–19) and covered by unit tests, yet no production code in `src/` imports `createActor` or `useMachine` from `@xstate/react`."
- Same report §Bottlenecks, lines 110:
  > "Static lesson-session screens do not reflect real state. `src/features/lesson-session/screens/ConnectingScreen.tsx` lines 15–18 hard-codes an 1.8s `setTimeout` before navigating to `GreetingScreen`, regardless of whether the WebSocket/audio layer is actually ready. The `lessonSessionMachine` supports server-driven terminals and reconnections, but the screens are not connected to it, so resilience features cannot be exercised."
- Same report §Risk/effort estimates, lines 125–126 flags "Connect lesson-session screens to `lessonSessionMachine`" as HIGH risk / HIGH effort.
- `MASTER_AUDIT.md` cross-cutting theme 1 (lines 14–18) repeats the pattern and the umbrella fix: "Either delete the machines and own the imperatives, or drive each flow from a single actor."
- Source code inspected:
  - `src/features/lesson-session/screens/ConnectingScreen.tsx` lines 14–18 contain the hard-coded timer:
    ```tsx
    React.useEffect(() => {
      const t = setTimeout(() => navigation.navigate(ROUTES.GreetingScreen), 1800);
      return () => clearTimeout(t);
    }, []);
    ```
  - `src/state/machines/lessonSession.machine.ts` lines 233–259 define the `CONNECTING` state and the `SESSION_STARTED → ACTIVE` transition that should drive navigation.
  - `src/state/machines/index.ts` lines 6–11 export the machine and actor types but `src/` has no `useMachine` / `useActor` / `createActor` usage for lesson sessions.
  - `src/features/lesson-session/sessionContext.ts` currently carries only UI context (course title, progress, resume reason); it does not expose the lesson-session actor.

## Scope

### In scope
- `src/state/machines/lessonSession.machine.ts`
  - No state-chart changes required unless the wiring exposes a missing event; keep the existing server-authoritative terminal semantics intact.
- `src/features/lesson-session/sessionContext.ts`
  - Add a React Context + Provider that exposes the `LessonSessionActor` to descendant screens.
  - Keep the existing UI context (`LessonSessionContext`, `buildLessonSessionContext`, `DEFAULT_LESSON_SESSION_CONTEXT`) unchanged for screens that need it.
- `src/features/lesson-session/screens/ConnectingScreen.tsx`
  - Remove the 1.8 s fixed timer.
  - Consume the actor from the new context.
  - Navigate to `GreetingScreen` only when the machine enters `ACTIVE` (i.e., after `SESSION_STARTED`).
  - Surface `RECONNECTING` / `AUDIO_FAILED` / terminal states by routing to the corresponding lesson-session screen.
- `tests/verification/T16-wire-lesson-session-machine.test.tsx`
  - Integration test proving the screen is actor-driven and no longer timer-driven.

### Out of scope
- `src/services/ws/realtime.ts` and `src/services/ws/xiaozhi-device.ts` (registry non-scope). The WebSocket transport itself is owned by T08/T10. T16 only consumes the machine events those layers will eventually feed.
- `src/features/lesson-session/screens/GreetingScreen.tsx` (registry non-scope). No visual change; it continues to be reached via navigation.
- Refactoring the full lesson-session screen tree into a single `useMachine` hook. This PRD only wires `ConnectingScreen`; other screens can be migrated incrementally.
- Changing the lesson-session UI context API (`courseTitle`, `resumeReason`, etc.).
- Adding new machine states or altering the server-authoritative terminal rules documented in `lessonSession.machine.ts`.

## Proposed solution

1. **Add a machine actor context in `src/features/lesson-session/sessionContext.ts`.**
   - Export a new `LessonSessionActorContext` (`React.Context<LessonSessionActor | null>`).
   - Export `LessonSessionProvider({ actor, children })` that wraps children in the context.
   - Export `useLessonSessionActor()` hook that throws if used outside the provider.
   - Keep the existing UI context exports intact so existing consumers do not break.

   Example shape:
   ```ts
   import { createContext, useContext } from 'react';
   import type { LessonSessionActor } from '@/state/machines';

   const LessonSessionActorContext = createContext<LessonSessionActor | null>(null);

   export function LessonSessionProvider({ actor, children }: { actor: LessonSessionActor; children: React.ReactNode }) {
     return <LessonSessionActorContext.Provider value={actor}>{children}</LessonSessionActorContext.Provider>;
   }

   export function useLessonSessionActor(): LessonSessionActor {
     const actor = useContext(LessonSessionActorContext);
     if (!actor) throw new Error('useLessonSessionActor must be used inside LessonSessionProvider');
     return actor;
   }
   ```

2. **Create the actor when entering the lesson-session flow.**
   - The actor should be created and started by the screen/flow that pushes `ConnectingScreen` (for example, the lesson-detail CTA or `RobotReadyScreen`).
   - Pass the actor into `LessonSessionProvider` around the lesson-session stack, or pass it via route params and re-wrap at the `ConnectingScreen` level.
   - Minimal first step (recommended): wrap `ConnectingScreen` itself with the provider and pass the actor via route params or a higher-level provider. This keeps the change reviewable.

3. **Rewrite `ConnectingScreen` to observe the actor.**
   - Import `useLessonSessionActor` from `sessionContext.ts`.
   - Use `@xstate/react`'s `useSelector(actor, selector)` (or `useActor`) to read the current state value.
   - Remove the `setTimeout(..., 1800)` effect entirely.
   - Add an effect that navigates based on state transitions:
     - `ACTIVE.*` → `ROUTES.GreetingScreen`
     - `RECONNECTING` → `ROUTES.ReconnectingScreen`
     - `AUDIO_FAILED` → `ROUTES.AudioErrorScreen`
     - `TIMED_OUT` → `ROUTES.TimedOutScreen`
     - `COST_CAPPED` → `ROUTES.CostCappedScreen`
     - `PARENT_STOPPED` → `ROUTES.ParentStoppedScreen`
     - `SAFETY_HALT` → `ROUTES.SafetyScreen`
     - `ABANDONED` / `ABANDONED_DISCONNECT` → `ROUTES.HomeHubScreen` or a terminal summary route (confirm UX preference)
     - `COMPLETED` → `ROUTES.LessonDoneScreen`
   - Keep the existing "Tuning in…" UI while in `CONNECTING`.

   Example effect shape:
   ```ts
   const actor = useLessonSessionActor();
   const stateValue = useSelector(actor, (snapshot) => snapshot.value);

   React.useEffect(() => {
     const flat = typeof stateValue === 'string' ? stateValue : Object.keys(stateValue)[0];
     switch (flat) {
       case 'ACTIVE':
         navigation.navigate(ROUTES.GreetingScreen);
         break;
       case 'RECONNECTING':
         navigation.navigate(ROUTES.ReconnectingScreen);
         break;
       // ... terminal/error mappings
     }
   }, [stateValue, navigation]);
   ```

4. **Start the session when the actor is mounted.**
   - Either the previous screen sends `START_SESSION` with a caller-minted idempotency key before navigating to `ConnectingScreen`, or `ConnectingScreen` sends it on mount if the actor is in `IDLE`.
   - Recommended: the CTA that launches the lesson sends `START_SESSION` so the provider/screen remain simple observers.

5. **Update `src/state/machines/index.ts` only if needed.**
   - The machine is already exported; no change expected.

## Acceptance criteria

1. `ConnectingScreen` consumes the lesson session actor state instead of a fixed timeout.
2. Navigation to `GreetingScreen` happens on `SESSION_STARTED` (machine enters `ACTIVE`) or equivalent machine event, not on a wall-clock timer.
3. `RECONNECTING` and error terminals (`AUDIO_FAILED`, `TIMED_OUT`, `COST_CAPPED`, `PARENT_STOPPED`, `SAFETY_HALT`, `ABANDONED_DISCONNECT`) are observable from the screen — i.e., the screen routes to the corresponding terminal/overlay screen.
4. Machine state is provided via `sessionContext.ts` to child screens through `LessonSessionProvider` / `useLessonSessionActor`.
5. Existing UI context helpers (`buildLessonSessionContext`, `DEFAULT_LESSON_SESSION_CONTEXT`, `getLessonResumeCopy`) remain available and unchanged.
6. `tests/verification/T16-wire-lesson-session-machine.test.tsx` passes.

## Dependencies

- **T15 — Migrate household server state to React Query with defaults**
  - T15 touches `QueryProvider.tsx`, which is part of the app root. T16 will mount a new provider somewhere under the authenticated subtree; coordinate mount order so contexts do not fight.
- **T10 — Forward raw WebSocket events and harden reconnect logic**
  - T10 defines how `WS_DISCONNECT` / `WS_RESUMED` / disconnect errors are forwarded. T16's `RECONNECTING` routing assumes those events are delivered to the machine in the shape T10 produces.
- **T08 — Explicit realtime WebSocket URL and contract parity**
  - T08 resolves the observer WS URL. The machine's `startSession` / `reconnectSession` services use that transport; confirm the URL contract before relying on the machine's happy path in production.

## Exclusions / anti-overlap

- **T08 / T10** own the WebSocket transport contract and event forwarding. T16 must not change `realtime.ts` or `xiaozhi-device.ts`.
- **T17 / T18 / T19 / T20 / T21** (Gemini voice layer) must not edit lesson-session screens in parallel. The Gemini path and the lesson-session machine path are separate state surfaces.
- **T13** deletes dead providers/hooks; T16 must not delete `sessionContext.ts` or any lesson-session screen.
- **T06** moves pairing state into a store/actor; T16 must not touch `pairingSession.ts` or pairing screens.

## Verification test plan

- **Test file:** `tests/verification/T16-wire-lesson-session-machine.test.tsx`
- **What it proves:**
  - `ConnectingScreen` no longer navigates to `GreetingScreen` on a fixed 1.8 s timer.
  - `ConnectingScreen` reads the lesson-session actor from `LessonSessionProvider`.
  - Navigation happens only after the machine transitions from `CONNECTING` to `ACTIVE` via `SESSION_STARTED`.
  - `RECONNECTING` and `AUDIO_FAILED` are observable from the screen (routes to the correct terminal screen).
- **How to run it:**
  ```bash
  cd /Users/thuanle/Documents/TamTMV/TbotREAL/original-app/TJBOT-Mobile
  npx jest tests/verification/T16-wire-lesson-session-machine.test.tsx
  ```
- **Expected state before fix:** FAIL — `ConnectingScreen` navigates after 1.8 s regardless of machine state, and `sessionContext.ts` does not export `LessonSessionProvider` / `useLessonSessionActor`.
- **Expected state after fix:** PASS.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Introducing a new provider increases re-render cascades near the lesson-session stack. | Memoize the provider value if it wraps additional state; `useSelector` in `ConnectingScreen` only re-renders on state changes. |
| The actor is created too late and `ConnectingScreen` mounts before `START_SESSION` is sent. | Document the contract in `sessionContext.ts`: either the launching CTA sends `START_SESSION` before navigation, or `ConnectingScreen` sends it on mount when in `IDLE`. |
| Mapping every terminal state in `ConnectingScreen` adds duplication across screens. | Accept the duplication for the first wiring PR; a follow-up refactor can centralize state→screen mapping once the machine is proven in production. |
| `RECONNECTING` transitions back to `ACTIVE.GREETING`, causing an unwanted navigation reset. | Use `navigation.navigate` (not `replace`) and let React Navigation deduplicate; verify with the existing `lessonSession.machine.test.ts` invariant that `RECONNECTING` never self-terminates. |
| T10 changes the WebSocket event shape after T16 merges. | Keep T16's screen mapping based on machine states, not raw WS codes. T10 must continue to translate transport events into the existing `LessonSessionEvent` union. |
| Existing e2e / Maestro flows expect the 1.8 s "Tuning in…" screen. | The screen still renders the same UI while in `CONNECTING`; only the navigation trigger changes. Update any Maestro assertions that rely on the exact timing. |

## Coordination notes

Registry `coordination_required: false`, but there are two consults before merging:

1. **T08 owner** — confirm the observer WebSocket URL contract so the machine's `startSession` service targets the right endpoint.
2. **T10 owner** — confirm the mapping from raw WebSocket events (`WS_DISCONNECT`, `WS_RESUMED`, close codes) to `LessonSessionEvent` remains stable; T16's routing depends on it.

No backend contract change is required for T16; the machine events are already documented in `lessonSession.types.ts`.

## Implementation hints

- Read `src/state/machines/lessonSession.machine.ts` lines 218–371 for the full state chart and event names.
- Read `src/state/machines/lessonSession.types.ts` lines 84–123 for the `LessonSessionEvent` union and line 134–166 for the service stubs.
- Read `src/features/lesson-session/sessionContext.ts` lines 1–79 for the existing UI context that must be preserved.
- Read `src/features/lesson-session/screens/ConnectingScreen.tsx` lines 14–18 for the timer to remove.
- Read `src/features/parent/context/ParentSessionContext.tsx` as an example of a focused, memoized context provider.
- Read `tests/state/machines/lessonSession.machine.test.ts` for actor-driving patterns and the `path()` helper.
- Prefer `@xstate/react`'s `useSelector` over `useActor` in `ConnectingScreen` to avoid re-rendering on every context change.
- Keep the first PR small: wire only `ConnectingScreen`. Subsequent screens (`GreetingScreen`, `RobotListeningScreen`, etc.) can subscribe to the same provider in later PRs.
