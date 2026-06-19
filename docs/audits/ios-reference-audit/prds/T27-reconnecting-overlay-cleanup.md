# T27: Harden ReconnectingOverlay timeout cleanup

## Status
Registry status: NOT_STARTED | Priority: P2 | Blast radius: LOW

## Problem
`ReconnectingOverlay` schedules a 2400 ms `setTimeout` that calls `navigation.navigate(...)` when it fires (`src/features/fallback/ReconnectingOverlay.tsx`, lines 18–31). The timeout is only cleared in the `useEffect` cleanup function, which runs when the component unmounts. If the overlay screen is removed from the navigation stack by a system event, back gesture, or parent navigation change *before* unmount completes (or while the component is briefly still mounted in the background), the timeout can still fire and navigate the user away from the screen they have already moved to.

The audit report flags this explicitly in `docs/audits/ios-reference-audit/reports/navigation-screens.md` lines 150–153:

> **ReconnectingOverlay** uses a hard-coded 2400 ms timeout before navigating. ... If the modal is dismissed by the user or by a system event before the timeout fires, the timeout still fires and navigates away from whatever screen the user is now on. This is a reliability risk for a fallback flow.

The current fallback entry is registered as a modal screen in `src/features/fallback/navigation.ts` lines 27–29, making it especially likely to be dismissed without an explicit unmount.

## Scope

### In scope
- `src/features/fallback/ReconnectingOverlay.tsx`
  - The `useEffect` that starts the 2400 ms timeout (lines 18–31).
  - Add a `navigation.addListener('beforeRemove', ...)` subscription that clears the timeout as soon as the screen is about to leave the stack.
  - Preserve the existing happy-path retry/failure navigation logic when the screen is not removed early.
- `tests/verification/T27-reconnecting-overlay-cleanup.test.tsx`
  - New focused RNTL verification test.

### Out of scope
- `src/navigation/AppNavigator.tsx` (pending deep-link queue work is tracked separately).
- `src/features/fallback/navigation.ts` (route registration already exists and does not need to change).
- Any change to the 2400 ms duration, retry policy, or visual/copy content of the overlay.
- Refactoring `ReconnectingOverlay` into a service-driven machine (that would be a larger redesign).

## Proposed solution

1. In `src/features/fallback/ReconnectingOverlay.tsx`, keep the existing timeout and effect dependencies (`attempt`, `failureTarget`, `maxAttempts`, `navigation`).
2. Inside the same `useEffect`, subscribe to the screen’s `beforeRemove` event:
   ```ts
   const unsubscribeBeforeRemove = navigation.addListener('beforeRemove', () => {
     clearTimeout(t);
   });
   ```
3. Return a cleanup function that:
   - calls `clearTimeout(t)` (existing behavior), and
   - calls `unsubscribeBeforeRemove()`.
4. Ensure the `beforeRemove` listener uses the same timer variable reference so an early removal cancels the pending navigation before `useEffect` cleanup runs.
5. Do not change the existing CTA behavior: pressing “Stop and go home” continues to navigate immediately to `HomeHubScreen`.

Expected code shape after the fix (lines 18–31):
```tsx
React.useEffect(() => {
  const t = setTimeout(() => {
    if (attempt >= maxAttempts) {
      if (failureTarget === ROUTES.HomeHubScreen) {
        navigation.navigate(ROUTES.HomeHubScreen);
      } else {
        navigation.navigate(ROUTES.HelpFaqScreen);
      }
    } else {
      navigation.navigate(ROUTES.HomeHubScreen);
    }
  }, 2400);

  const unsubscribeBeforeRemove = navigation.addListener('beforeRemove', () => {
    clearTimeout(t);
  });

  return () => {
    clearTimeout(t);
    unsubscribeBeforeRemove();
  };
}, [attempt, failureTarget, maxAttempts, navigation]);
```

## Acceptance criteria
- The timeout is cleared on `navigation.addListener('beforeRemove')`.
- No navigation occurs after the overlay has been removed.
- The existing happy-path retry behavior is preserved.

## Dependencies
None. This task is self-contained and can be picked up independently.

## Exclusions / anti-overlap
- T16 (wire lesson session machine) touches lesson-session navigation but does not edit `ReconnectingOverlay`.
- T08/T10 (WebSocket URL contract and resilience) are in the networking layer and must not change the overlay screen.
- No other task in the registry modifies `src/features/fallback/ReconnectingOverlay.tsx`.

## Verification test plan
- Test file: `tests/verification/T27-reconnecting-overlay-cleanup.test.tsx`
- What it proves:
  1. `ReconnectingOverlay` registers a `beforeRemove` navigation listener when mounted.
  2. Emitting `beforeRemove` *before* the 2400 ms timeout expires prevents any `navigation.navigate` call.
  3. The existing happy path still navigates to the configured target when the timeout is allowed to fire.
- How to run it: `npx jest tests/verification/T27-reconnecting-overlay-cleanup.test.tsx`
- Expected state before fix: FAIL (no `beforeRemove` listener is registered, so the early-removal test observes an unwanted navigation).
- Expected state after fix: PASS.

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Adding `beforeRemove` introduces a missing-cleanup warning if the listener is not unsubscribed. | Unsubscribe in the same `useEffect` cleanup; keep the existing `clearTimeout` guard as a backup. |
| Fake timers in RNTL may behave differently across React 18/19 concurrent rendering. | Use `act()` around timer advancement and event emission; keep the test focused on observable navigation calls. |
| A future refactor moves the retry decision into a service or machine. | The test is narrow (overlay screen behavior); it will naturally be updated or retired if the component is deleted. |

## Coordination notes
No coordination required per registry entry (`coordination_required: false`).

## Implementation hints
- Read `src/features/fallback/ReconnectingOverlay.tsx` lines 18–31 and `src/features/fallback/navigation.ts` lines 27–29.
- The `navigation` prop is typed as `NativeStackScreenProps<RootStackParamList, 'ReconnectingOverlay'>['navigation']`; `addListener('beforeRemove', callback)` is part of React Navigation’s core event API.
- Use the same RNTL patterns already established in `tests/ui-validation/fallback-offline.test.tsx` (custom `createNavigation` helper, fake timers, `act`).
- If `navigation.addListener` is already mocked globally in `tests/setup.ts`, pass a custom navigation object to the rendered component so the test controls the event emitter.
