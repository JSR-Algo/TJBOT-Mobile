# T30: Haptics, Box typing, and Text primitive compliance

## Status
Registry status: NOT_STARTED | Priority: P2 | Blast radius: LOW

## Problem
The three core design-system primitives advertised as the safe foundation for all screens each diverge from the project's own token system and from platform best practices:

- **`src/design-system/primitives/Pressable.tsx`** — line 2 imports `Vibration` from `react-native`, and line 18 calls `Vibration.vibrate(10)` on every press. This bypasses `expo-haptics` (already a dependency, `package.json` line 74), ignores reduced-motion settings, has no platform gating, and uses a 10 ms duration that is shorter than typical iOS haptic motor resonance.
- **`src/design-system/primitives/Box.tsx`** — line 24 resolves `backgroundColor` against `tokens.colors`, but line 27 leaves `borderColor` as a raw string with no token resolution. Lines 36–37 declare `width?: number | string` and `height?: number | string`, then lines 92–93 cast the value to `number`, which is misleading and risks silently dropping percentage strings if the runtime path changes.
- **`src/design-system/primitives/Text.tsx`** — line 21 hard-codes `fontFamily: 'Nunito'` even though `src/design-system/tokens/typography.ts` lines 1–5 already define `typography.fonts` (`kid`, `display`, `body`). The `StyledTextProps` interface (lines 7–12) also omits `lineHeight` and `letterSpacing`, forcing screens to compose those manually.

Sources:
- `docs/audits/ios-reference-audit/reports/ui-design-system.md#improvements` (Pressable haptics, Box width/height/borderColor, Text font tokens)
- `src/design-system/primitives/Pressable.tsx` (lines 2, 18)
- `src/design-system/primitives/Box.tsx` (lines 24, 27, 36–37, 80, 92–93)
- `src/design-system/primitives/Text.tsx` (lines 7–12, 21)
- `src/design-system/tokens/typography.ts` (lines 1–5)

## Scope
### In scope
- `src/design-system/primitives/Pressable.tsx`
  - Replace `Vibration.vibrate(10)` with `expo-haptics` `impactAsync(ImpactFeedbackStyle.Light)`.
  - Gate haptics behind `Platform.OS` and reduced motion.
  - Keep the existing `haptic?: boolean` prop and default behavior so callers can opt out.
- `src/design-system/primitives/Box.tsx`
  - Resolve `borderColor` through the same token helper used for `backgroundColor`.
  - Make the width/height prop contract explicit: either support percentage strings (preferred) or restrict the TypeScript type to `number`; remove the misleading `as number` cast.
- `src/design-system/primitives/Text.tsx`
  - Derive the default font family from `tokens.typography.fonts` instead of hard-coding `'Nunito'`.
  - Add `lineHeight` and `letterSpacing` props.
- `tests/verification/T30-primitives-compliance.test.tsx`

### Out of scope
- `src/design-system/tokens/*` — token values themselves are unchanged (T28 owns the token surface).
- `src/components/*` — migrating components to the corrected primitives is not required here.
- Theme/gender switching runtime plumbing (covered by the ui-design-system audit recommendation but not by this task).
- Animation/motion tokens and Reanimated worklets (T21/T31).

## Proposed solution
1. **Pressable haptics**
   - Import `impactAsync` and `ImpactFeedbackStyle` from `expo-haptics`.
   - Import `Platform` from `react-native` and `useReduceMotion` from `@/design-system/animations/useReduceMotion`.
   - In the press handler, only trigger a haptic when all of the following are true:
     - `haptic !== false`
     - `Platform.OS !== 'web'`
     - `reduceMotion` is falsy
   - Call `impactAsync(ImpactFeedbackStyle.Light)` and swallow errors so a haptic failure cannot break the press action.
   - Remove the `Vibration` import.

   Expected shape:
   ```tsx
   import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
   import { Platform } from 'react-native';
   import { useReduceMotion } from '@/design-system/animations/useReduceMotion';

   const reduceMotion = useReduceMotion();
   const handlePress = (e) => {
     if (haptic && Platform.OS !== 'web' && !reduceMotion) {
       impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
     }
     onPress?.(e);
   };
   ```

2. **Box token resolution and sizing contract**
   - Extend `resolveColor` to handle `borderColor` as well as `backgroundColor`.
   - Change the style mapping for `borderColor` from `{ borderColor }` to `{ borderColor: resolveColor(borderColor) }`.
   - For width/height, keep `number | string` in the prop type and forward the value unchanged. This makes percentage widths (`'50%'`) a supported, explicit behavior. Remove the `as number` cast.

3. **Text font and spacing props**
   - Replace `{ fontFamily: 'Nunito' }` with `{ fontFamily: tokens.typography.fonts.kid }` (or the canonical body/display token if T28 has chosen one).
   - Add `lineHeight?: number` and `letterSpacing?: number` to `StyledTextProps` and include them in the style array when defined.

4. **Verification test**
   - Write a focused Jest/RNTL test that asserts each acceptance criterion on the current primitives. It must fail before the changes and pass after them.

## Acceptance criteria
1. Pressable uses `expo-haptics` `impactAsync` with light impact, platform gating, and reduce-motion awareness.
2. Box supports percentage `width`/`height` strings or restricts prop types; `borderColor` resolves tokens.
3. Text derives font family from `tokens.typography.fonts` and supports `lineHeight`/`letterSpacing` props.

## Dependencies
- **T28** (`unify-token-surface`) — this task assumes `tokens.typography.fonts` and `tokens.colors` are the authoritative source of truth. If T28 changes token names, T30 must be updated accordingly before merging.

## Exclusions / anti-overlap
- Do not modify `src/design-system/tokens/*`; T28 owns token values.
- Do not migrate `src/components/*` to use the new props; that is follow-up work.
- No other registry task edits `src/design-system/primitives/Pressable.tsx`, `Box.tsx`, or `Text.tsx`; keep changes scoped to these three files to avoid PR overlap.

## Verification test plan
- Test file: `tests/verification/T30-primitives-compliance.test.tsx`
- What it proves:
  - Pressable calls `expo-haptics` with a light impact on press and does not fall back to `Vibration.vibrate`.
  - Pressable skips haptics when reduced motion is enabled or when running on web.
  - Box resolves a `borderColor` token (e.g., `coral`) to its hex value (`#FF6F61`).
  - Box forwards percentage width/height strings unchanged.
  - Text derives its default `fontFamily` from `tokens.typography.fonts` (mocked in the test to prove the dependency).
  - Text applies `lineHeight` and `letterSpacing` props to the rendered style.
- How to run it: `npx jest tests/verification/T30-primitives-compliance.test.tsx`
- Expected state before fix: FAIL
- Expected state after fix: PASS

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| `expo-haptics` is not available in jsdom and throws. | The project already maps `expo-haptics` to a mock in `package.json` line 128; keep using that mock. |
| Switching from `Vibration` to `expo-haptics` changes the tactile feel on some Android devices. | Use `ImpactFeedbackStyle.Light`, the closest equivalent to a brief confirmation tap. |
| `borderColor` token resolution breaks callers passing raw hex/rgba strings. | `resolveColor` falls back to the raw string when the value is not a token key, preserving existing behavior. |
| Removing the `width as number` cast surfaces a TypeScript error in a caller. | TypeScript already declared `string` as a valid type, so removing the cast is type-safe. |
| T28 renames `tokens.typography.fonts.kid`. | Wait for T28 to land or land T28/T30 together; update the font key if necessary. |

## Coordination notes
No cross-role coordination required. The dependency on T28 is in-repo and sequential: T30 should use whatever token key T28 establishes as canonical.

## Implementation hints
- Read `src/design-system/animations/useReduceMotion.ts` — it already wraps `AccessibilityInfo` and is the preferred hook for motion gating.
- Read `tests/__mocks__/expo-haptics.ts` before writing assertions; `impactAsync` is a `jest.fn()`.
- For `Box`, the token helper pattern is already present for `backgroundColor`; extend it rather than introducing a second resolver.
- For `Text`, keep the existing `variant`, `color`, `fontWeight`, and `textAlign` behavior unchanged; only add `lineHeight`/`letterSpacing` to the style array.
- After the fix, run both `npm test -- tests/verification/T30-primitives-compliance.test.tsx` and `npm run typecheck` to confirm the new props are typed correctly.
