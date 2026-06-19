# T31: Toast reduce-motion awareness and queue cap

## Status
Registry status: NOT_STARTED | Priority: P2 | Blast radius: LOW

## Problem

`src/components/Toast.tsx` renders auto-dismissing toast notifications but has three presentation-layer gaps:

1. **No reduced-motion gate.** The fade-in animation always runs at 200 ms, even when the user has enabled iOS/Android Reduce Motion. This violates the design-system accessibility goal of respecting system motion preferences.
2. **No exit animation.** Toasts appear with `Animated.timing(opacity, { toValue: 1, ... })` (lines 88–90) but are removed from the React tree instantly when the auto-dismiss `setTimeout` fires (line 64–66) or when the user taps the dismiss button (line 96). The visual result is a hard cut rather than a symmetric fade.
3. **Uncapped queue and leaked timers.** Every `show()` appends a toast to an unbounded `queue` array and schedules a `setTimeout` that is never stored or cleared. On a screen that fires many transient errors, toasts can stack off-screen, and the timers continue to call `setQueue` after the provider unmounts.

Audit source:

- `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/reports/ui-design-system.md` §Improvements, line 65:
  > "File: `src/components/Toast.tsx` (lines 52-67, 86-91) — Uses React Native `Animated` for fade-in but not for exit, and stores toasts in an array rendered bottom-up with absolute positioning. The `setTimeout` auto-dismiss (line 64) closes toasts in display order but does not pause on hover/touch (not applicable on mobile) or respect reduced motion. Recommended change: add `useReduceMotion()` awareness, keep entrance/exit symmetric with `Animated` or Reanimated, and cap the visible queue length to prevent notification stacking off-screen."

Source under review:

- `src/components/Toast.tsx`, lines 48–101 (`ToastProvider` and `ToastBubble`).
- `src/design-system/animations/useReduceMotion.ts` — existing hook to read the system preference.

## Scope

### In scope

- `src/components/Toast.tsx`
  - Import and use `useReduceMotion()` from `@/design-system/animations/useReduceMotion`.
  - Gate entrance and exit `Animated.timing` durations on the reduced-motion preference.
  - Add a symmetric fade-out animation before removing a toast from the queue.
  - Cap the number of visible toasts (e.g., `MAX_VISIBLE_TOASTS = 3`).
  - Store auto-dismiss `setTimeout` IDs in a ref and clear them in the provider's `useEffect` cleanup.
  - Keep the public API (`useToast`, `ToastProvider`, `ToastSeverity`, `ToastOptions`) unchanged.
- `tests/verification/T31-toast-reduce-motion.test.tsx`
  - Unit tests proving reduce-motion gating, symmetric exit animation, queue cap, and timer cleanup on unmount.

### Out of scope

- `src/design-system/primitives/*` and `src/design-system/animations/*` beyond the existing `useReduceMotion` hook (registry non-scope).
- Replacing `Animated` with Reanimated. The audit permits either; staying with `Animated` minimizes bundle/dependency churn for this low-risk task.
- Changing the toast severity colors, copy, or layout styling.
- Rewiring call sites that consume `useToast().show()`; the public API is unchanged.
- Accessibility labels or gesture handling outside the existing dismiss touch target.

## Proposed solution

1. **Read the system motion preference.**

   In `ToastBubble` (and/or the provider if it needs to coordinate animation timing):

   ```ts
   import { useReduceMotion } from '@/design-system/animations/useReduceMotion';
   ```

   ```ts
   const reduceMotion = useReduceMotion();
   const fadeDuration = reduceMotion ? 0 : 200;
   ```

2. **Make entrance animation respect reduced motion.**

   Replace the unconditional entrance timing:

   ```ts
   Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
   ```

   with:

   ```ts
   Animated.timing(opacity, {
     toValue: 1,
     duration: fadeDuration,
     useNativeDriver: true,
   }).start();
   ```

   When `reduceMotion` is `true`, `duration: 0` makes the toast appear instantly, matching system accessibility expectations.

3. **Add symmetric exit animation.**

   Change `ToastBubble` so it owns its removal sequence:

   - Accept an `onDismiss` callback prop from the provider.
   - Expose a local `dismiss` function wired to the `TouchableOpacity` instead of calling `onDismiss` directly.
   - In `dismiss`, run `Animated.timing(opacity, { toValue: 0, duration: fadeDuration, useNativeDriver: true }).start(() => onDismiss())`.
   - The provider's auto-dismiss path should call the same `dismiss` function (e.g., by storing a per-toast dismiss callback ref) rather than removing the toast synchronously.

   Symmetry means the exit duration equals the entrance duration for each motion mode.

4. **Cap the visible queue length.**

   In `ToastProvider.show`, after constructing the new item, slice the queue to the most recent `MAX_VISIBLE_TOASTS`:

   ```ts
   const MAX_VISIBLE_TOASTS = 3;
   setQueue((q) => {
     const next = [...q, item];
     return next.length > MAX_VISIBLE_TOASTS ? next.slice(-MAX_VISIBLE_TOASTS) : next;
   });
   ```

   Three visible toasts is enough to surface multiple errors without stacking off-screen on small phones.

5. **Clear auto-dismiss timers on unmount.**

   - Replace the raw `setTimeout` with a tracked timer:

     ```ts
     const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
     ```

   - In `show`, push the timer ID and clear it before the callback runs:

     ```ts
     const timer = setTimeout(() => {
       dismissToast(item.id);
       timerRefs.current = timerRefs.current.filter((t) => t !== timer);
     }, item.duration);
     timerRefs.current.push(timer);
     ```

   - In the provider cleanup, clear every pending timer:

     ```ts
     useEffect(() => {
       return () => {
         timerRefs.current.forEach(clearTimeout);
         timerRefs.current = [];
       };
     }, []);
     ```

6. **Keep the public API stable.**

   - `useToast()` continues to return `{ show }`.
   - `ToastProvider` continues to accept `{ children }`.
   - No new required props are introduced.

## Acceptance criteria

1. `useReduceMotion()` gates entrance and exit `Animated.timing` durations.
2. The exit animation is symmetric with the entrance animation (same duration and easing shape, target `toValue: 0`).
3. The visible toast queue length is capped to a small, documented maximum (e.g., 3) to prevent off-screen stacking.
4. Auto-dismiss `setTimeout` timers are stored and cleared when `ToastProvider` unmounts.
5. The `ToastProvider` public API remains unchanged for existing call sites.
6. Unit tests verify the four behaviors above and fail on the current codebase.

## Dependencies

None.

## Exclusions / anti-overlap

- **T32 — Fix failing unit-test baseline** touches global test mocks and the Jest config. If T32 changes `tests/setup.ts` or module mocks in a way that affects `ToastProvider`, re-run `T31-toast-reduce-motion.test.tsx` after T32 merges.
- Do not refactor `src/design-system/primitives/*` or build a shared animation library; those belong to the broader design-system work (e.g., T30, T28, T29).
- Do not change toast consumers; the API is unchanged.

## Verification test plan

- **Test file:** `tests/verification/T31-toast-reduce-motion.test.tsx`
- **What it proves:**
  - When the system reduced-motion preference is enabled, `ToastBubble` uses a zero-duration entrance animation.
  - When reduced motion is disabled, the entrance animation runs at the original 200 ms duration.
  - Dismissing a toast triggers a symmetric fade-out (`toValue: 0`) before removal.
  - Adding more toasts than the configured cap renders only the most recent `MAX_VISIBLE_TOASTS`.
  - Unmounting `ToastProvider` clears pending auto-dismiss timers so no React state update fires on an unmounted component.
- **How to run it:**

  ```bash
  cd /Users/thuanle/Documents/TamTMV/TbotREAL/original-app/TJBOT-Mobile
  npx jest tests/verification/T31-toast-reduce-motion.test.tsx
  ```

- **Expected state before fix:** FAIL — the current `Toast.tsx` does not import `useReduceMotion`, has no exit animation, does not cap the queue, and leaks auto-dismiss timers.
- **Expected state after fix:** PASS.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| `tests/setup.ts` globally mocks `ToastProvider`, so the verification test may load the mock instead of the real component. | Call `jest.unmock('@/components/Toast')` at the top of the verification test; the PRD notes this explicitly. |
| `Animated` with `useNativeDriver: true` does not visually animate in Jest, so visual fade cannot be asserted directly. | Spy on `Animated.timing` calls and assert the passed `duration`/`toValue` config rather than inspecting opacity values. |
| Reducing animation duration to `0` could be interpreted as "no animation" or "instant appearance"; either satisfies the AC if the config reflects the preference. | The verification test accepts either a `duration: 0` timing call or a skipped timing call when reduced motion is enabled. |
| Timer cleanup tests may be flaky if other warnings leak into `console.error`. | The test asserts only that no "unmounted component" React warning is emitted, not that `console.error` is silent globally. |
| Queue cap might hide legitimate error messages from the user. | The cap is applied to the visible queue only; callers still receive every `show()` call and the most recent errors remain visible. Document the cap in code. |

## Coordination notes

No cross-role coordination required (`coordination_required: false`).

Notify the T32 owner that the verification test depends on `ToastProvider` not being globally mocked or, if the mock changes, that the T31 test intentionally unmocks the real module.

## Implementation hints

- Read `src/components/Toast.tsx` lines 48–101 for the current `ToastProvider`/`ToastBubble` implementation.
- Read `src/design-system/animations/useReduceMotion.ts` for the hook signature; it accepts an optional `override` boolean for tests, but production code should rely on the system default.
- Keep `TouchableOpacity` accessibility: the existing `accessibilityLabel="Dismiss notification"` should remain on the dismiss button.
- To test timer cleanup robustly, use `jest.useFakeTimers()` in the cleanup test and wrap timer advancement in `act()`.
- Avoid brittle snapshot tests; assert behavior through `Animated.timing` spies and rendered toast counts.
