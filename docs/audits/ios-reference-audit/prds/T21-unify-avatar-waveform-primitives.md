# T21: Consolidate avatar and waveform primitives on Reanimated

## Status
Registry status: **BLOCKED** | Priority: P1 | Blast radius: MEDIUM

Implementation is blocked pending the Gemini voice decision recorded in **T00**. Only execute this task if T00 outcome is **SHIP_GEMINI** and **T17** (wire Gemini conversation screen) has landed. If T00 chooses **REMOVE_GEMINI**, do not refactor the Gemini components; delete them via **T18/T19** instead.

## Problem
The mobile app ships two incompatible visual languages for voice/robot presence:

1. **Gemini path** (`src/components/gemini/*`) uses React Native `Animated` and drives animation from the JS thread.
   - `src/components/gemini/WaveVisualizer.tsx` lines 19–48 create **16 `Animated.Value` instances** and fire **16 `Animated.timing` loops on every `audioLevel` change** (`audio-voice.md` lines 111–114; `ui-design-system.md` lines 85–86).
   - `src/components/gemini/SukaAvatar.tsx` lines 102–253 hold **nine separate `Animated.Value`s** with up to eight concurrent `useEffect` animation loops (`ui-design-system.md` lines 89–90).
   - `src/components/gemini/ParticleEffect.tsx` lines 12–32 spawns six concurrent `Animated.parallel` animations with random X targets computed inside `useEffect` (`ui-design-system.md` lines 87–88).
2. **Lesson-session path** (`src/design-system/components/*`) already uses `react-native-reanimated`, but is not fully optimized.
   - `src/design-system/components/Robot/index.tsx` lines 75–128 reset shared values and rebuild `withRepeat`/`withSequence` chains on every `emotion` change because the dependency array is just `[emotion]` (`ui-design-system.md` lines 53–54).
   - `src/design-system/components/WaveBars/index.tsx` line 88 recalculates `delay={Math.round((i * 0.07 % 1) * 1000)}` on every render and `Bar` is not memoized (`ui-design-system.md` lines 91–92).
   - `src/design-system/components/LCDFace/index.tsx` lines 79–185 rebuilds SVG geometry on every render with no memoization (`ui-design-system.md` lines 55–56).
3. **Legacy robot components** (`src/components/robot/*`) still use RN `Animated` despite the codebase already declaring `react-native-reanimated`.
   - `src/components/robot/RobotFace.tsx` lines 172–215, 296–313 create many `Animated.Value`s inside arrays and schedule blinks with `setTimeout` (`ui-design-system.md` lines 57–58).
   - `src/components/robot/RobotBody.tsx` lines 219–263 uses `Animated.Value` + `Animated.timing` for the 12 motion primitives and builds degree strings via `interpolate` (`ui-design-system.md` lines 59–60).
   - `src/components/robot/RobotAnimations.ts` lines 1–181 is a pure RN `Animated` utility module (`ui-design-system.md` lines 95–96).

The result is duplicated motion logic, inconsistent feel, duplicated accessibility labels, and JS-thread pressure that can drop frames during voice sessions (`audio-voice.md` lines 104–108; `ui-design-system.md` top-3-quick-wins #3).

## Scope
### In scope
Files to refactor or replace:

- `src/components/gemini/WaveVisualizer.tsx` — rewrite as a Reanimated worklet-driven waveform; stop recreating 16 `Animated.Value`s per `audioLevel` update.
- `src/components/gemini/SukaAvatar.tsx` — consolidate the nine `Animated.Value`s and eight effect loops into Reanimated shared values/worklets.
- `src/components/gemini/ParticleEffect.tsx` — replace per-particle `Animated.parallel` with Reanimated shared-value arrays or deterministic worklets.
- `src/design-system/components/Robot/index.tsx` — memoize animation descriptors per emotion so Reanimated loops are not rebuilt on unrelated renders; add `reduceMotion` support.
- `src/design-system/components/WaveBars/index.tsx` — memoize bar delays and wrap `Bar` in `React.memo`.
- `src/design-system/components/LCDFace/index.tsx` — memoize `getConfig(emotion)` and derived geometry; extract recurring SVG paths into reusable sub-components.
- `src/components/robot/RobotFace.tsx` — migrate thinking dots, blink, LED ring, and eye animations to Reanimated worklets; add `reduceMotion`.
- `src/components/robot/RobotBody.tsx` — migrate the 12 motion primitives from `Animated` to Reanimated shared values/worklets.
- `src/components/robot/RobotAnimations.ts` — replace with Reanimated-based hooks or inline worklets; remove `setTimeout` blink scheduler.
- `tests/verification/T21-unify-avatar-waveform-primitives.test.tsx` — verification test.

### Out of scope
- `src/hooks/useGeminiConversation.ts` — behavior/logic; owned by the Gemini wiring decision (T17/T18).
- `src/native/*`, `ios/**`, `android/**` — native modules; owned by T19 if removal is chosen.
- Icon library centralization — owned by **T29**; this task only avoids introducing new inline SVG/emoji in touched files.
- Theme/gender runtime switching — broader than animation consolidation; revisit after T28.
- Deleting the Gemini components — that is the **T18/T19** branch, not this task.

## Proposed solution
1. **Pick the canonical waveform primitive.**
   - Option A (recommended): keep `WaveBars` from `src/design-system/components/WaveBars/index.tsx` as the single primitive. Refactor it to accept an `audioLevel` prop and use a single Reanimated shared-value array or `useAnimatedStyle` worklet that maps `audioLevel` to bar scales. Delete `WaveVisualizer` and update any Gemini screen to import `WaveBars`.
   - Option B: keep `WaveVisualizer` but rewrite it to use Reanimated shared values and a single worklet pass, then make `WaveBars` a thin wrapper around it.
   - The PR should document the chosen option and remove the other duplicate.
2. **Migrate Gemini avatar motion to Reanimated.**
   - In `SukaAvatar`, replace the nine `Animated.Value`s with `useSharedValue`s.
   - Drive breathe, blink, expression transitions, glow pulse, bounce, tilt, sparkle, and mouth audio-follow from a single `expressionKey` shared value plus derived `useAnimatedStyle` worklets.
   - Preserve the current expression vocabulary and accessibility labels.
3. **Migrate legacy robot components to Reanimated.**
   - Replace `RobotAnimations.ts` with Reanimated hooks (`useBreathingWorklet`, `useBlinkWorklet`, `useGlowWorklet`, etc.) that return shared values/styles.
   - Update `RobotFace` to consume those hooks and render thinking dots/LED ring/waveform with Reanimated.
   - Update `RobotBody` to drive pan/tilt/arm/pose with Reanimated shared values; remove the degree-string `interpolate` workaround.
4. **Harden reduce-motion support.**
   - All animated components in scope must accept a `reduceMotion` prop **or** call `useReduceMotion()` from `src/design-system/animations/useReduceMotion.ts`.
   - When reduced motion is enabled, snap to final values (no loops, no springs) and disable particles.
5. **Optimize existing Reanimated components.**
   - In `Robot`, memoize per-emotion animation descriptors (e.g., `useMemo(() => buildRobotAnimation(emotion), [emotion])`) and use stable worklet references so `useEffect` does not rebuild loops on every render.
   - In `WaveBars`, compute delays with `useMemo(() => Array.from({ length: count }, (_, i) => Math.round((i * 0.07 % 1) * 1000)), [count])` and wrap `Bar` in `React.memo`.
   - In `LCDFace`, memoize `getConfig(emotion)` and the derived `renderEye`/`renderMouth`/`renderRing` geometries.
6. **Replace inline SVG/emoji in touched files.**
   - Where this task touches control surfaces (e.g., a refactored `ControlBar` is *not* in scope, but any icon inside `SukaAvatar` or `RobotFace` is), use the `Icon` component from **T29** instead of inline shapes.
7. **Run the verification test, typecheck, and lint.**

## Acceptance criteria
- One canonical waveform component is used across voice and lesson paths (either `WaveBars` subsumes `WaveVisualizer` or the reverse).
- `SukaAvatar`, `RobotFace`, and `RobotBody` animation is driven by Reanimated worklets where possible.
- `WaveVisualizer` no longer recreates 16 `Animated.Value`/`Animated.timing` loops on every `audioLevel` change.
- `reduceMotion` is respected by all animated avatar/waveform components in scope.
- Duplicate emoji/SVG inline icons introduced in touched files are replaced by the icon library from **T29**.
- `npm test` and `npm run typecheck` pass after the refactor.

## Dependencies
- **T00** (`gemini-voice-decision`) — must choose `SHIP_GEMINI`; otherwise this task is cancelled and T18/T19 delete the Gemini components.
- **T17** (`wire-gemini-conversation-screen`) — provides the screen/route that renders `SukaAvatar`/`WaveVisualizer`; refactor is wasted if the UI remains unreachable.
- **T29** (`centralize-icon-library`) — provides the typed `Icon` component used to replace inline SVG/emoji.

## Exclusions / anti-overlap
- **T18** (`delete-orphaned-gemini-js`) and **T19** (`remove-gemini-native-modules`) are the mutually exclusive branch. Do not run T21 in parallel with T18/T19.
- **T28** (`unify-token-surface`) owns `legacy-semantic.ts`/token migration; T21 should not change token files except where animation config needs motion tokens already defined in `tokens/motion.ts`.
- **T30** (`primitives-compliance`) owns `Pressable`/`Box`/`Text` primitive fixes; T21 should not edit those files.

## Verification test plan
- **Test file:** `tests/verification/T21-unify-avatar-waveform-primitives.test.tsx`
- **What it proves:** every animated component in scope has migrated from React Native `Animated` to `react-native-reanimated`, `WaveVisualizer` no longer creates per-bar `Animated.Value` loops, `WaveBars` memoizes delays and the `Bar` sub-component, and the components still render under the existing Jest/Reanimated mock.
- **How to run it:** `npx jest tests/verification/T21-unify-avatar-waveform-primitives.test.tsx`
- **Expected state before fix:** FAIL — `WaveVisualizer`, `SukaAvatar`, `ParticleEffect`, `RobotFace`, `RobotBody`, and `RobotAnimations.ts` still import `Animated` from `react-native`; `WaveBars` does not memoize `Bar` or delays.
- **Expected state after fix:** PASS — all scoped files import from `react-native-reanimated`, no RN `Animated` API remains, and `WaveBars` uses `React.memo` + `useMemo`.

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Refactored Reanimated worklets behave differently on low-end Android than the old RN `Animated` loops | Test on a representative Android device; keep `useNativeDriver`/worklet paths transform-only; add a `__disableAnimations` test prop if needed for deterministic unit tests. |
| `SukaAvatar` refactor accidentally changes the product voice persona (expressions, colors, sizes) | Preserve the `EXPRESSIONS` map and color constants exactly during the first PR; visual diff before/after in Storybook or screenshot test. |
| `RobotBody` 3D transforms (`rotateX`) differ between Reanimated and legacy Android native driver | Verify on target Android hardware; Reanimated supports 3D transforms reliably on both platforms, but test a physical device if possible. |
| `reduceMotion` handling diverges between components | Centralize via `useReduceMotion()` and require every animated scope file to consume it; the verification test asserts presence. |
| Merge conflict with T18/T19 if T00 flips to REMOVE_GEMINI | Keep the Gemini refactor in its own commit/branch; do not merge until T00 is recorded. If T00 changes, abandon T21 and switch to T18/T19. |
| Icon library from T29 is not ready when animation refactor lands | Stub inline SVG replacements behind a TODO and schedule a fast follow; do not block T21 on T29. |

## Coordination notes
Registry `coordination_required: false` for this task. However:

- The **Mobile role** must confirm the T00 decision (`SHIP_GEMINI` vs `REMOVE_GEMINI`) before starting implementation.
- The **Design and Behavior role** should review the `reduceMotion` behavior and expression parity after refactor.
- No backend contract change is required.

## Implementation hints
- `react-native-reanimated` is already declared in `package.json` (^4.2.1) and mocked in `tests/setup.ts`; the Jest environment is ready.
- Start with `WaveVisualizer`/`WaveBars` because they are the highest-impact perf fix (16 concurrent timing loops → one worklet).
- For `SukaAvatar`, consider deriving all visual state from a single `expressionKey` shared value and using `useAnimatedStyle` hooks per body part; this removes the eight `useEffect` loops.
- For `RobotAnimations.ts`, replace `setTimeout` blink scheduling with a Reanimated `withDelay`/`withRepeat` worklet; remove the documented carve-out comment if no longer needed.
- `RobotBody` currently documents that it intentionally uses RN `Animated` to avoid a half-installed Reanimated dependency. That comment is stale — delete it and migrate to Reanimated.
- When touching `LCDFace`, do not reintroduce SMIL `<Animate>` tags; they were removed because `react-native-svg` ^15 no longer supports them.
- If any scope file does not exist at implementation time (e.g., T18 already deleted it), remove that file from the test assertions and note it in the PR description.
