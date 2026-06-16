# ui-design-system Audit

## Scope
Token consistency, SVG assets, animation performance, reanimated/worklets, theme, primitive APIs, and accessibility across the TJBot-mobile React Native design system.

## Files reviewed

### Mobile project
- `src/design-system/tokens/colors.ts`, `typography.ts`, `spacing.ts`, `shadows.ts`, `radii.ts`, `motion.ts`, `legacy-semantic.ts`, `index.ts`
- `src/design-system/theme/themes.ts`, `ThemeContext.ts`, `useTheme.ts`, `index.ts`
- `src/design-system/primitives/Text.tsx`, `Box.tsx`, `Stack.tsx`, `Spacer.tsx`, `Pressable.tsx`, `Image.tsx`, `index.ts`
- `src/design-system/components/Robot/index.tsx`, `LCDFace/index.tsx`, `WaveBars/index.tsx`, `SpeechBubble/index.tsx`, `PulseRing/index.tsx`, `PrimaryCTA/index.tsx`, `PageScroll/index.tsx`, `PageHeader/index.tsx`, `CircleBtn/index.tsx`
- `src/design-system/animations/index.ts`, `useReduceMotion.ts`, `README.md`
- `src/design-system/icons/README.md`, `icons/index.ts`
- `src/components/index.ts`, `Button.tsx`, `Card.tsx`, `Input.tsx`, `LoadingSpinner.tsx`, `ErrorMessage.tsx`, `EmptyState.tsx`, `Toast.tsx`, `Screen/index.tsx`, `ScreenShell/index.tsx`, `OnbShell/index.tsx`, `OnbBigBtn/index.tsx`, `DeviceShell/index.tsx`, `DeviceBigBtn/index.tsx`, `DeviceRow/index.tsx`, `MicButton/index.tsx`, `PhoneShell/TBPhone.tsx`, `OfflineBanner.tsx`, `OnboardingHeader.tsx`, `ErrorBoundary/index.tsx`, `Device-tokens.ts`
- `src/components/robot/RobotFace.tsx`, `RobotBody.tsx`, `RobotAnimations.ts`, `RobotModeTheme.ts`, `LatencyHud.tsx`
- `src/components/gemini/SukaAvatar.tsx`, `BigMicButton.tsx`, `WaveVisualizer.tsx`, `ParticleEffect.tsx`, `StatusIndicator.tsx`, `ControlBar.tsx`, `TranscriptPanel.tsx`
- `src/app/providers/ThemeProvider.tsx`, `src/theme.ts`, `src/navigation/MainTabNavigator.tsx`
- `src/app/screens/SpeakScreen.tsx`, `ListenScreen.tsx`, `DevicePairWifiScreen.tsx`
- `tests/ui-validation/accessibility-primitives.test.tsx`, `app-ui.test.tsx`, `ui-checker.ts`, `fallback-offline.test.tsx`, `persona-copy-guard.test.ts`
- `tests/components/error-message-accessibility.test.tsx`, `device-row.test.tsx`, `robot-body.test.tsx`
- `package.json` (deps: `react-native-reanimated@^4.2.1`, `react-native-svg@^15.15.4`, `lucide-react-native@^1.8.0`)

### Reference cards reviewed
- `docs/reference/ios/extractions/AudioKit__Waveform.md`
- `docs/reference/ios/extractions/awizemann__scarf.md`
- `docs/reference/ios/extractions/iamvatsalpatel__RoomCapture-iOS-App.md`
- `docs/reference/ios/extractions/Nazarzbs__100-Days-Of-SwiftUI-by-Nazar.md`
- `docs/reference/ios/extractions/Shouheng88__AwesomeSwift.md`

## Reference benchmarks

- **AudioKit/Waveform** is a focused GPU-accelerated visualization library. It separates the sample model (`SampleBuffer`) from the renderer (`Renderer.swift` + Metal) and from the SwiftUI wrapper, keeps resource-heavy work off the main thread, and precomputes level-of-detail buffers. For TJBot this reinforces the idea of moving waveform/robot renderers off JS layout and into GPU-backed work.
- **Scarf** demonstrates platform-aware theming (shared `ScarfCore` package, platform-specific shells), strict observability (ScarfMon), accessibility-safe status chrome, and a discipline of only repainting UI when observable values actually change. The iOS onboarding keeps credential setup minimal and explicit.
- **RoomCapture** is a simple SwiftUI utility showing lightweight onboarding before camera capture and clean document-directory asset management; relevant to the robot setup/pairing flow where a short visual onboarding reduces parent friction.
- **100 Days of SwiftUI** portfolio showcases child-friendly animation gestures, haptics, SwiftData persistence, biometric gating, and local notifications — patterns that map to the child companion use case.
- **AwesomeSwift** is a kitchen-sink SwiftUI sample library. It surfaces `LottieView` bridging, `R.swift`/typed asset references, permission wrappers, keyboard-aware layouts, and theme switching — all useful reference points for a React Native design system trying to keep icons, assets, and motion consistent across platforms.

## Findings

### Improvements

- **File: `src/design-system/tokens/legacy-semantic.ts` and `src/design-system/tokens/*.ts`** — Two parallel token systems exist: the low-level "kid" palette (`colors.ts`, `spacing.ts`, etc.) and the older semantic `legacy-semantic.ts`. Most production components (`Button.tsx`, `Card.tsx`, `Input.tsx`, `MainTabNavigator.tsx`, `OnboardingHeader.tsx`) import from `legacy-semantic.ts`, while newer primitives and `design-system/components/*` consume the low-level tokens. This split means radius names differ (`card` vs `md`), typography objects differ (`fontSizes.hero|title|body|cap` vs `h1|h2|h3|body1|body2|caption|button`), and colors can drift. It matters because any future brand/theme update must be edited in two places and any new engineer cannot tell which source is authoritative. Recommended change: freeze `legacy-semantic.ts` as the single public API, re-implement it purely as a transform over the low-level tokens, and migrate `src/components/*` and `src/navigation/*` to consume `tokens` primitives. Keep `legacy-semantic.ts` as the compatibility shim, not the other way around.

- **File: `src/design-system/theme/themes.ts` and `src/app/providers/ThemeProvider.tsx`** — Theme support is declared but effectively unused. `ThemeProvider` accepts a `gender` prop and stores it in state, yet it never exposes a setter, and no screen appears to call `useTheme()` (line 6 of `useTheme.ts`). `themes.ts` defines `girl`/`boy` palettes but they are not wired into `legacy-semantic.ts` or primitives. The app therefore ships a "kid" color identity with no runtime switching. This matters for a child companion product where personalization is a product hook. Recommended change: expose a `useThemeActions()` hook, plumb the resolved semantic theme through `ThemeContext`, and make `Text`/`Box`/`Pressable` use the context colors by default so screens can opt into gender/theme variants without prop drilling.

- **File: `src/design-system/primitives/Text.tsx` (line 21)** — The primitive hard-codes `fontFamily: 'Nunito'` directly in the style array. The token file already defines `typography.fonts` (all mapped to `Nunito`), but the primitive ignores it. It also does not support line-height or letter-spacing tokens, so every screen composes those manually. This undermines the design-system boundary. Recommended change: derive the font family from `tokens.typography.fonts`, and support a `lineHeight`/`letterSpacing` prop or a `variant` style object that combines size, weight, line-height, and letter-spacing from tokens.

- **File: `src/design-system/primitives/Box.tsx` (lines 24, 80, 91-93)** — `backgroundColor` accepts a union of `ColorToken | string`, but `borderColor`, `borderWidth`, and `opacity` are raw numbers/strings with no token resolution. Width/height props cast `string` to `number` (line 92-93), which will silently drop percentage values. It matters because the primitive is advertised as safe but silently misrenders when a percentage width is passed. Recommended change: either support percentage strings explicitly or restrict the prop type to `number`; add token resolution for `borderColor` and expose a `borderColorToken` prop.

- **File: `src/design-system/primitives/Pressable.tsx` (line 18)** — Haptic feedback uses `Vibration.vibrate(10)` on every press. There is no platform abstraction, no fallback for devices without a vibrator, and the 10 ms duration is shorter than typical iOS haptic motor resonance. It also bypasses `expo-haptics` which is already a dependency. Recommended change: replace `Vibration` with `expo-haptics` `impactAsync` using a light impact style, gate it behind `Platform.OS` and an accessibility/reduced-motion check, and allow callers to pass a haptic intensity or disable it.

- **File: `src/design-system/components/Robot/index.tsx` (lines 75-128)** — Reanimated effects reset shared values and rebuild `withRepeat`/`withSequence` chains on every `emotion` change, but the dependency array is just `[emotion]`. Because the configs are constant objects, the animations are recreated from scratch each render, which can cause a frame drop when the parent re-renders for unrelated state. Recommended change: memoize per-emotion animation descriptors or split each animation channel into a dedicated `useAnimatedStyle` hook with stable worklet references; add a `reduceMotion` prop (the component currently ignores the system setting).

- **File: `src/design-system/components/LCDFace/index.tsx` (lines 79-185)** — The component renders a full SVG face with hard-coded hex colors (`bg: '#0E1116'`, `skin: '#FFE3B0'`, accent derived from prop). Ring/eye/mouth/icon shapes are rebuilt as JSX on every render. There is no shared path cache, no `react-native-svg` `SvgXml`, and no `useMemo` around the computed geometry. For the 20 LCD states this is acceptable, but on a low-end Android device during a lesson the re-renders can add up. Recommended change: memoize `getConfig(emotion)` and the derived geometry; consider extracting recurring paths (eyes, mouths, wifi/bolt icons) into small reusable SVG sub-components.

- **File: `src/components/robot/RobotFace.tsx` (lines 172-215, 296-313)** — Thinking dots, blinking, LED ring, and eye components are implemented with React Native `Animated` (JS driver disabled via `useNativeDriver: true`). The file creates many `Animated.Value`s inside arrays and maps them in render, and blink scheduling uses `setTimeout` with random delays (lines 126-127 of `RobotAnimations.ts`). This works but duplicates animation primitives that already exist in Reanimated elsewhere (`design-system/components/Robot`, `PulseRing`, `WaveBars`). Recommended change: converge robot motion on Reanimated worklets so all robot/avatar animation shares one scheduler; move the random blink timer into a Reanimated `withDelay` worklet to remove JS-thread wakeups.

- **File: `src/components/robot/RobotBody.tsx` (lines 267-278)** — Interpolates degree strings inside render so the native driver receives string transforms. The comment (line 248) notes this is intentional, but the `rotateX` transform used on the head (line 314) is not guaranteed to be supported by the legacy Android native driver. Recommended change: verify on target Android hardware; if `rotateX` drops frames, switch to Reanimated which supports 3D transforms reliably on both platforms.

- **File: `src/design-system/icons/README.md` and `src/design-system/icons/index.ts`** — The icon folder has only a README stub and an empty `index.ts`. The app uses inline SVGs (`CircleBtn`, `PageHeader`, `DeviceRow`, `OnbShell`, `MicButton`, `DeviceShell`) and emoji characters (BigMicButton `⏹`/`🎙`, ErrorMessage `⚠️`, EmptyState `🤖`). There is no central icon registry. This matters because inline SVGs duplicate `require('react-native-svg')` calls and make iconography, sizing, and stroke color inconsistent; emoji also render differently across platforms and can fail accessibility. Recommended change: build a typed `Icon` component backed by `lucide-react-native` (already in `package.json`) or `react-native-svg` icon sprites, and replace inline emoji/SVGs in the design system.

- **File: `src/components/gemini/TranscriptPanel.tsx` (lines 17-58, 66-67)** — Implements its own `useTypewriter` hook with `setInterval` per character and calls `stripActionTags` repeatedly inside render. The typewriter is not cancel-safe if the component unmounts mid-stream, and `messages.map((msg, i) => ...)` uses array index as `key`. Recommended change: move `useTypewriter` to a shared hooks folder with cleanup; use message IDs for keys; derive `stripActionTags(aiTranscript)` once per render.

- **File: `src/components/Toast.tsx` (lines 52-67, 86-91)** — Uses React Native `Animated` for fade-in but not for exit, and stores toasts in an array rendered bottom-up with absolute positioning. The `setTimeout` auto-dismiss (line 64) closes toasts in display order but does not pause on hover/touch (not applicable on mobile) or respect reduced motion. Recommended change: add `useReduceMotion()` awareness, keep entrance/exit symmetric with `Animated` or Reanimated, and cap the visible queue length to prevent notification stacking off-screen.

- **File: `src/design-system/animations/index.ts`** — Is a placeholder (`export const placeholder = {}`). The `animations/README.md` is also a single-line stub. Motion tokens live in `tokens/motion.ts`, but there is no shared animation library or transition presets. Recommended change: populate `animations/index.ts` with reusable Reanimated worklets (fade, slide, scale) derived from `tokens/motion`, and delete or expand the placeholder.

- **File: `src/components/Device-tokens.ts`, `DeviceShell`, `DeviceRow`, `DeviceBigBtn`, `OnbShell`, `OnbBigBtn`** — Several components define their own local `DV`/`OB` color objects that duplicate `legacy-semantic.ts` colors (`ink`, `hair`, `accent`). This creates a second ad-hoc palette inside components. Recommended change: delete local token objects and import from `design-system/tokens` (or `legacy-semantic`), and add a `surface`/`card` token for the device/onboarding shell backgrounds.

### Simplifications

- **File: `src/design-system/primitives/Box.tsx` (lines 51-103)** — The component manually maps ~30 layout props into conditional style objects. This is verbose and produces a large style array on every render. A simpler alternative is to accept a single `sx`/`style` prop and rely on the caller to use a typed style object, or adopt a small runtime style-props-to-style-sheet helper (e.g., `@shopify/restyle` or a lightweight internal mapper). That would cut the file by ~70 % and make the primitive easier to type.

- **File: `src/components/Screen/index.tsx` and `src/components/ScreenShell/index.tsx`** — Two screen wrappers with overlapping responsibilities (`scroll`, `safeArea`, `padding`, `bg`). `ScreenShell` also forwards `onTouchEnd` and `testID` while ignoring its own `bg` prop duplication (line 18: `style={[styles.root, bg ? { backgroundColor: bg } : undefined]}` alongside `backgroundColor={bg}`). Simpler alternative: merge into one `Screen` primitive with boolean flags; remove `ScreenShell` or rename it to `TouchableScreenShell` for the single use case that needs tap-to-dismiss.

- **File: `src/components/gemini/ControlBar.tsx` (lines 46-67)** — Builds a gear icon and microphone icon from nested `View` shapes with many conditional styles. This is 80+ lines for two icons. Simpler alternative: replace the custom shapes with the planned icon library (`lucide-react-native`: `Settings`, `Mic`) and a single `IconButton` primitive.

- **File: `src/design-system/components/PrimaryCTA/index.tsx`** — Only supports a single filled pill CTA. There is no secondary, outline, or text variant. Most screens instead use `Button.tsx` (from legacy) or `OnbBigBtn`/`DeviceBigBtn`. Simpler alternative: extend `PrimaryCTA` to `Button` with `variant` prop and deprecate the three near-identical big-button components.

- **File: `src/components/PhoneShell/TBPhone.tsx`** — Accepts `dark`, `status`, `indicator`, `statusDark` props that are destructured but ignored. Simpler alternative: remove unused props or implement them; if they are intentionally reserved, document them and default them to no-ops with comments rather than silent discard.

### Bottlenecks

- **File: `src/components/gemini/WaveVisualizer.tsx` (lines 19-48)** — Creates 16 `Animated.Value`s and fires 16 independent `Animated.timing` calls on every `audioLevel` change (every ~60-100 ms during speech). Even with `useNativeDriver: true`, 16 concurrent animations per frame can saturate the native animation thread on older devices. AudioKit/Waveform’s lesson is to precompute and GPU-sample; the equivalent here is to batch bar heights into a single Reanimated shared value array or a single `useAnimatedStyle` driven by `audioLevel`. Recommended change: rewrite `WaveVisualizer` as a Reanimated worklet that maps `audioLevel` to bar scales in one worklet pass, or throttle audio-level updates and interpolate between frames.

- **File: `src/components/gemini/ParticleEffect.tsx` (lines 12-32)** — Spawns six concurrent `Animated.parallel` animations with random X targets on every `active` transition. The random value is computed inside `useEffect`, which can produce layout jumps, and each particle allocates its own values. Recommended change: precompute particle trajectories or use Reanimated `useSharedValue` arrays with deterministic delays; gate behind `reduceMotion`.

- **File: `src/components/gemini/SukaAvatar.tsx` (lines 102-253)** — Holds nine separate `Animated.Value`s and up to eight `useEffect` animation loops. Multiple loops can run simultaneously, and many values are updated by `Animated.spring`/`timing` from render. On a low-end device this creates jank during state transitions. Recommended change: consolidate into a single Reanimated worklet-based component; derive eye/mouth/glow/bounce states from a single `expressionKey` shared value and animate inside the UI thread.

- **File: `src/design-system/components/WaveBars/index.tsx` (line 88)** — `delay={Math.round((i * 0.07 % 1) * 1000)}` computes the same 0/70/140… ms delays for each bar but recalculates them on every render. `Bar` is not memoized, so each render starts new Reanimated timing sequences. Recommended change: memoize delays and memoize `Bar`; use a single shared value array if possible.

- **File: `src/design-system/components/Robot/index.tsx` (lines 62-294)** — The robot is built from dozens of inline `View` shapes rather than SVG, so every state change triggers Yoga layout for many nodes. The glow is an `Animated.View` with a hex + alpha string computed in render (`${accentColor}55`). Recommended change: convert the static head/eyes/mouth to a single `react-native-svg` composition; reserve `Animated.View` for the transform-only body/antenna/glow layers.

- **File: `src/components/robot/RobotAnimations.ts` — `useBlinkAnimation` schedules blinks with `setTimeout` (lines 126-127), `useGlowAnimation` loops, and other hooks each create `Animated.Value`s. Multiple independent timers increase the chance of JS-thread wakeups during voice streaming. Recommended change: move presentation timers that are not FSM-related into Reanimated worklets as documented by the carve-out comments.

- **File: `tests/ui-validation/ui-checker.ts`** — `validateComponentJSON` performs shallow string checks on serialized JSON (`jsonStr.includes('style')`, `includes('testID')`). It cannot detect real layout or accessibility regressions and gives a false sense of validation. This is not a bottleneck at runtime, but it is a quality-gate bottleneck because it may pass while visual bugs slip through. Recommended change: replace with snapshot tests plus targeted RNTL assertions (as already done in `accessibility-primitives.test.tsx`), and delete `ui-checker.ts`.

## Top 3 quick wins

1. **Centralize icons and kill inline SVG/emoji.** Replace inline SVG snippets and emoji glyphs across `PageHeader`, `DeviceRow`, `OnbShell`, `DeviceShell`, `MicButton`, `BigMicButton`, `ErrorMessage`, `EmptyState`, and `ControlBar` with a typed `Icon` component backed by `lucide-react-native` (already in `package.json`). This immediately improves accessibility, cross-platform consistency, and bundle cacheability. ~10 files, low risk.

2. **Unify the token surface.** Make `src/design-system/tokens/legacy-semantic.ts` a pure transform of the low-level `tokens/*.ts` files and migrate `src/components/*`/`src/navigation/*` to use it. Add `surface`, `card`, `hair`, and `dangerSoft` tokens so `DV`/`OB` local palettes can be deleted. This removes the two-authority problem and makes theme/gender switching possible later. ~15 files, medium risk.

3. **Converge robot/avatar animation on Reanimated worklets.** Pick one animation engine for `Robot`, `LCDFace`, `SukaAvatar`, `WaveVisualizer`, `ParticleEffect`, `RobotFace`, and `RobotBody`. Reanimated is already declared; rewrite the most expensive pieces (`WaveVisualizer`, `SukaAvatar`, `ParticleEffect`) as worklet-driven components first, then migrate `RobotFace`/`RobotBody`. This directly addresses the 60 fps acceptance criteria. ~8 files, medium-high risk.

## Risk / effort estimates

| Recommendation | Risk | Effort | Notes |
|---|---|---|---|
| Unify token surface (`legacy-semantic` ↔ low-level tokens) | MEDIUM | MEDIUM | Many call sites; can be done file-by-file with type-checker support. |
| Wire runtime theme/gender switching | LOW | LOW | `ThemeProvider` exists; just expose actions and propagate context. |
| Centralize icon library and remove inline SVG/emoji | LOW | LOW | `lucide-react-native` already installed; mostly find/replace. |
| Migrate robot/avatar animations to Reanimated worklets | MEDIUM | HIGH | Touchable primitives already use Reanimated; robot files are large but well-commented. |
| Rewrite `WaveVisualizer` as single worklet | MEDIUM | MEDIUM | High impact on voice UX; needs device testing. |
| Replace `ui-checker.ts` with real snapshot/RNTL tests | LOW | LOW | Delete file and expand `accessibility-primitives.test.tsx`. |
| Fix `Box` width/height typing and token resolution | LOW | LOW | Type-only + small runtime change. |
| Replace `Vibration` with `expo-haptics` | LOW | LOW | Dependency already present; one file change. |
| Merge `Screen`/`ScreenShell` | LOW | LOW | Mostly rename/replace callers. |
| Populate `animations/index.ts` with presets | LOW | MEDIUM | Defines reusable motion vocabulary; no call-site changes initially. |

---

*Audit completed in read-only mode. No source files were modified.*
