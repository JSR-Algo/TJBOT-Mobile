# T17: Wire Gemini Live voice UI behind a feature gate

## Status
Registry status: BLOCKED | Priority: P0 | Blast radius: HIGH

> **Implementation is blocked pending T00** (`Gemini Live voice ship/remove decision`).
> Do not start implementation until product and legal record `SHIP_GEMINI` and communicate the decision.
> This PRD is written so the task is ready to execute immediately after the decision.

## Problem
The Gemini Live voice layer is fully implemented but unreachable from the app's navigation. The audit found that `useGeminiConversation.ts`, `src/components/gemini/*`, and the supporting native modules ship as dead code, creating maintenance drag, false test confidence, and a large attack surface.

Audit sources:

- `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/reports/audio-voice.md` §Improvements, lines 52–56:
  > "The entire Gemini Live hook, Suka avatar, waveform, transcript panel, status indicator, and control bar are implemented but not imported by any screen or route."
  > "Either wire the Gemini hook into a navigable screen (e.g., a 'Talk to Suka' tab) behind a feature gate, or delete the orphaned layer and its native modules."
- `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/MASTER_AUDIT.md` §Cross-Cutting Themes-4, lines 32–36:
  > "Entire subsystems are implemented but unreachable… for the Gemini voice layer make a product decision to either wire it to a navigable screen behind a feature gate or remove it and its native modules."
- Current state confirming the finding:
  - `src/hooks/useGeminiConversation.ts` exists (1,560 lines) but has no production screen importer.
  - `src/components/gemini/SukaAvatar.tsx`, `TranscriptPanel.tsx`, `ControlBar.tsx`, etc. exist but are only referenced by each other and `src/services/audio/PcmStreamPlayer.ts`.
  - `src/navigation/routes.ts` has no `GeminiConversationScreen` route.
  - `src/navigation/featureRegistry.ts` has no Gemini feature config.
  - `src/config/feature-flags.ts` has no Gemini gate.
  - `src/features/gemini/navigation.ts` and `src/features/gemini/screens/GeminiConversationScreen.tsx` do not exist.

## Scope

### In scope
- `src/config/feature-flags.ts`
  - Add `FEATURE_GEMINI_CONVERSATION` env flag and `isGeminiConversationEnabled()` helper.
- `src/navigation/routes.ts`
  - Add `GeminiConversationScreen: undefined` to `RootStackParamList` and `ROUTES.GeminiConversationScreen`.
- `src/navigation/featureRegistry.ts`
  - Conditionally register a new Gemini feature navigation config only when `FEATURE_GEMINI_CONVERSATION` is enabled.
- `src/features/gemini/navigation.ts` (new file)
  - Export `GEMINI_NAVIGATION` with `owner: 'gemini'` and a single stack screen pointing to `GeminiConversationScreen`.
- `src/features/gemini/screens/GeminiConversationScreen.tsx` (new file)
  - Render `SukaAvatar`, `TranscriptPanel`, and `ControlBar`.
  - Consume `useGeminiConversation()` and `useVoiceAssistantStore()` to drive UI state.
  - Provide mic and settings button handlers.
- `tests/verification/T17-wire-gemini-conversation-screen.test.tsx` (new file)
  - Verify the feature flag, route registration, and screen composition.

### Out of scope
- `src/hooks/useGeminiConversation.ts` (registry non-scope). Do not refactor the hook; only consume it from the new screen.
- `src/components/gemini/*` (registry non-scope). Do not alter the components; only render them.
- `src/native/*`, `ios/**`, `android/**` (registry non-scope). Do not remove or modify native modules.
- Implementing the child-safety shim. That is T20.
- Deleting the Gemini layer. That is T18/T19 and is mutually exclusive with this task.
- Adding a tab-bar entry or deep-link handler. The first ship target is a stack screen reachable from an existing call site (e.g., HomeHub CTA or robot device screen); tab placement is a follow-up product decision.

## Proposed solution

1. **Add the feature flag** in `src/config/feature-flags.ts` next to the existing subscription flag:

   ```ts
   export const FEATURE_GEMINI_CONVERSATION: boolean = readEnvFlag('EXPO_PUBLIC_FEATURE_GEMINI_CONVERSATION');

   export function isGeminiConversationEnabled(): boolean {
     return FEATURE_GEMINI_CONVERSATION;
   }
   ```

2. **Add the route key** in `src/navigation/routes.ts` under the `// progress` or a new `// gemini` section:

   ```ts
   export type RootStackParamList = {
     // ... existing routes ...

     // gemini voice
     GeminiConversationScreen: undefined;
   };

   export const ROUTES = {
     // ... existing routes ...
     GeminiConversationScreen: 'GeminiConversationScreen',
   } as const satisfies { readonly [RouteName in keyof RootStackParamList]: RouteName };
   ```

3. **Create `src/features/gemini/navigation.ts`**:

   ```ts
   import GeminiConversationScreen from './screens/GeminiConversationScreen';
   import { ROUTES } from '@/navigation/routes';
   import { defineFeatureScreens } from '@/navigation/types';
   import type { FeatureNavigationConfig } from '@/navigation/types';

   export const GEMINI_SCREENS = defineFeatureScreens([
     { name: ROUTES.GeminiConversationScreen, component: GeminiConversationScreen, role: 'stack' },
   ]);

   export const GEMINI_NAVIGATION = {
     owner: 'gemini',
     rootBranch: 'protected',
     stackScreens: GEMINI_SCREENS,
     modalScreens: [],
   } as const satisfies FeatureNavigationConfig;
   ```

4. **Conditionally register the feature** in `src/navigation/featureRegistry.ts`:

   ```ts
   import { GEMINI_NAVIGATION } from '@/features/gemini/navigation';
   import { FEATURE_GEMINI_CONVERSATION } from '@/config/feature-flags';

   const maybeGeminiNavigation = FEATURE_GEMINI_CONVERSATION ? [GEMINI_NAVIGATION] : [];

   export const FEATURE_NAVIGATION_REGISTRY: readonly FeatureNavigationConfig[] = [
     // ... existing features ...
     ...maybeGeminiNavigation,
   ] as const;
   ```

5. **Create `src/features/gemini/screens/GeminiConversationScreen.tsx`**:

   - Import `useGeminiConversation` and the three Gemini components.
   - Read `state` and `audioLevel` from `useVoiceAssistantStore`.
   - Provide a `SafeAreaView` or plain container with the app's background color.
   - Render `SukaAvatar` with current `voiceState` and `audioLevel`.
   - Render `TranscriptPanel`.
   - Render `ControlBar` with `voiceState`, `onMicPress` mapped to `startConversation`/`stopConversation`, `onSettingsPress` as a no-op or navigation placeholder, and `micDisabled` derived from the state.
   - Keep the component focused on layout/wiring; do not duplicate FSM logic already in the hook or store.

   Example shape:

   ```tsx
   export default function GeminiConversationScreen(): React.JSX.Element {
     const { startConversation, stopConversation, interruptPlayback } = useGeminiConversation();
     const voiceState = useVoiceAssistantStore((s) => s.state);
     const audioLevel = useVoiceAssistantStore((s) => s.audioLevel);

     const handleMicPress = useCallback(() => {
       if (voiceState === 'IDLE' || voiceState === 'ENDED') {
         void startConversation();
       } else {
         stopConversation();
       }
     }, [voiceState, startConversation, stopConversation]);

     return (
       <SafeAreaView style={styles.container}>
         <SukaAvatar voiceState={voiceState} audioLevel={audioLevel} />
         <TranscriptPanel />
         <ControlBar
           voiceState={voiceState}
           onMicPress={handleMicPress}
           onSettingsPress={() => { /* placeholder */ }}
           micDisabled={voiceState === 'PREPARING_AUDIO' || voiceState === 'CONNECTING'}
         />
       </SafeAreaView>
     );
   }
   ```

6. **No native changes.** Leave `src/native/*`, `ios/TJBotMobile/VoiceMic/**`, `ios/TJBotMobile/PcmStream/**`, `ios/TJBotMobile/VoiceSession/**`, and the Android native modules untouched.

## Acceptance criteria

1. A feature flag `FEATURE_GEMINI_CONVERSATION` gates the Gemini conversation screen/route.
2. `GeminiConversationScreen` is added to `RootStackParamList` and `ROUTES`.
3. A navigable `GeminiConversationScreen` renders `SukaAvatar`, `TranscriptPanel`, and `ControlBar`.
4. The Gemini feature navigation config is registered in `FEATURE_NAVIGATION_REGISTRY` only when `FEATURE_GEMINI_CONVERSATION` is enabled.
5. No native modules are removed or modified in this task.
6. The verification test at `tests/verification/T17-wire-gemini-conversation-screen.test.tsx` passes.

## Dependencies

- **T00 — Gemini Live voice ship/remove decision.** This task must only be implemented if the recorded decision is `SHIP_GEMINI`. Until then the status remains BLOCKED.

## Exclusions / anti-overlap

- **T18 — Delete the orphaned Gemini Live JS layer** and **T19 — Remove orphaned Gemini native modules and dependencies** are the opposite branch of the T00 decision. They must not edit the same files in parallel with T17. If `REMOVE_GEMINI` is chosen, close T17 as superseded.
- Do not refactor `useGeminiConversation.ts` or the Gemini components; this task is wiring only.
- Do not touch `ios/**` or `android/**` native code.

## Verification test plan

- **Test file:** `tests/verification/T17-wire-gemini-conversation-screen.test.tsx`
- **What it proves:**
  - `ROUTES.GeminiConversationScreen` exists.
  - `FEATURE_NAVIGATION_REGISTRY` includes the Gemini feature when `FEATURE_GEMINI_CONVERSATION` is enabled and excludes it when disabled.
  - `GeminiConversationScreen` mounts and renders `SukaAvatar`, `TranscriptPanel`, and `ControlBar`.
- **How to run it:**
  ```bash
  cd /Users/thuanle/Documents/TamTMV/TbotREAL/original-app/TJBOT-Mobile
  npx jest tests/verification/T17-wire-gemini-conversation-screen.test.tsx
  ```
- **Expected state before fix:** FAIL — the route, feature flag, feature config, and screen file do not exist.
- **Expected state after fix:** PASS.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| T00 chooses `REMOVE_GEMINI` and this work is wasted. | Do not start implementation until T00 is `DECIDED` with outcome `SHIP_GEMINI`. The PRD and test are preparation only. |
| Shipping the Gemini path exposes COPPA/legal risk before safety review. | Keep the flag default `false` in release builds; only enable after legal/product sign-off and after T20 safety shim is implemented. |
| The screen wiring duplicates FSM logic already in the hook. | The screen only reads store state and forwards callbacks; all transitions remain in `useGeminiConversation`. |
| Native module build issues surface when the screen becomes reachable. | This task does not modify native modules; native build gates (G5/G6) already cover them. The screen uses the existing modules through the existing hook. |
| Feature flag resolution differs between Metro dev, EAS, and Detox. | Use `readEnvFlag('EXPO_PUBLIC_FEATURE_GEMINI_CONVERSATION')` consistent with `FEATURE_SUBSCRIPTION`; update `eas.json` and `.detoxrc.js` launch args via T01 canonical env schema. |

## Coordination notes

- **Product / Legal:** Confirm the T00 decision outcome is `SHIP_GEMINI` before implementation.
- **Backend:** Confirm voice-budget / cost-capping and any required API keys before enabling the flag in a release build.
- **Mobile → Mobile:** Coordinate with T18/T19 owners so merge ordering respects the T00 decision; only one branch is executed.
- **Mobile → Infra:** If the flag is exposed through EAS, align the env key `EXPO_PUBLIC_FEATURE_GEMINI_CONVERSATION` with T01's canonical env schema work.

## Implementation hints

- Read the existing feature flag pattern in `src/config/feature-flags.ts` lines 1–35.
- Read `src/navigation/routes.ts` and `src/navigation/featureRegistry.ts` for the route/type registry pattern.
- Read `src/features/lesson-session/navigation.ts` as a minimal `stackScreens`-only feature config example.
- Read `src/hooks/useGeminiConversation.ts` lines 37–53 for the hook's public return type (`startConversation`, `stopConversation`, `interruptPlayback`).
- Read `src/components/gemini/SukaAvatar.tsx` lines 86–92, `src/components/gemini/TranscriptPanel.tsx` line 60, and `src/components/gemini/ControlBar.tsx` lines 5–10 for component prop contracts.
- In tests, mock `useGeminiConversation`, the three Gemini components, and `useVoiceAssistantStore` so the test exercises screen composition without native dependencies.
- Use `jest.isolateModules` with `jest.doMock('@/config/feature-flags', …)` to test registry inclusion/exclusion under both flag values without cross-test module-cache pollution.
