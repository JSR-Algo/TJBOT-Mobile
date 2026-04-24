# iOS VoiceSessionModule — activation checklist

This directory contains the iOS side of MB-NATIVE-VOICE-001 (sys-16 Gemini
Live realtime voice):

| File | Purpose |
|------|---------|
| `VoiceSessionModule.swift` | Single-owner `AVAudioSession` manager. Mirrors the Android contract. No `AVAudioEngine` / `voiceProcessingIO` — those wait for MB-NATIVE-VOICE-003. |
| `VoiceSessionModule.m` | `RCT_EXTERN_MODULE` bridge so React Native discovers the Swift class and exposes its methods to JS. |
| `TbotMobile-Bridging-Header.h` | Template bridging header — required once the iOS target gains its first Swift file. |
| `README.md` | This file. |

The files compile conceptually and match the JS contract in
`src/native/VoiceSession.ts`, but **are not yet included in the Xcode target**.
Adding them is a focused Xcode session. Do not attempt from this repo's
build tooling — it requires a local Xcode install.

## Why this is separate from the committed files

`ios/` is a prebuild output. Any modification to the Xcode project
(`TbotMobile.xcodeproj/project.pbxproj`) is high-risk to hand-edit because
it uses object IDs, refs, and phase ordering. The safer path is to add the
files through Xcode's UI and commit the resulting `project.pbxproj` diff.

## Activation — single focused session on a dev machine

1. **Open the workspace.**
   ```sh
   cd tbot-mobile/ios
   open TbotMobile.xcworkspace
   ```
   (Not the `.xcodeproj` — the workspace includes CocoaPods targets.)

2. **Add the three source files to the TbotMobile target.**
   - In the project navigator, right-click `TbotMobile/` → *Add Files to "TbotMobile"…*
   - Select `VoiceSession/VoiceSessionModule.swift` and
     `VoiceSession/VoiceSessionModule.m`.
   - In the dialog: **Targets: ✓ TbotMobile** (uncheck any other targets),
     *Copy items if needed* off (files are already on disk).
   - Click **Add**.

3. **Create the bridging header (only needed the first time Swift enters
   the target).**
   - Xcode prompts:
     > Would you like to configure an Objective-C bridging header?
     Click **Create Bridging Header**. Xcode creates
     `TbotMobile/TbotMobile-Bridging-Header.h` and sets
     `SWIFT_OBJC_BRIDGING_HEADER` automatically.
   - **Replace the auto-generated contents** with the contents of
     `VoiceSession/TbotMobile-Bridging-Header.h` in this directory
     (the four `#import <React/...>` lines). Do NOT move the bridging
     header file into the `VoiceSession/` subfolder — Xcode's
     `SWIFT_OBJC_BRIDGING_HEADER` path is resolved relative to the target
     root and the convention is to keep it adjacent to `AppDelegate.mm`.

4. **Verify build settings.**
   - `TbotMobile` target → *Build Settings* → search *bridging*.
   - `Objective-C Bridging Header` = `TbotMobile/TbotMobile-Bridging-Header.h`.
   - `Build Libraries for Distribution` = **No** (Swift stdlib ABI stability
     is not needed; leaving this No avoids resilience overhead).
   - `Swift Language Version` = 5.0 or later (RN 0.83 tested with 5.9).

5. **Build.**
   ```sh
   cd tbot-mobile/ios
   pod install                     # no new pods; just refresh autolinking
   cd ..
   npx expo run:ios                # or: xcodebuild -workspace ios/TbotMobile.xcworkspace -scheme TbotMobile
   ```

6. **Runtime smoke — confirm the module is reachable from JS.**
   In any dev build, open the Metro-launched app and run in the JS
   inspector:
   ```js
   import { NativeModules } from 'react-native';
   console.log('VoiceSessionModule:', NativeModules.VoiceSessionModule);
   // Expected: an object with startSession / endSession / setRoute /
   // getRoute / forceRecover / addListener / removeListeners keys.
   ```
   If the value is `undefined`, the Xcode target-inclusion step didn't
   stick — check *Build Phases → Compile Sources* for the `.swift` and
   `.m` files.

7. **Verify on a physical device.**
   - Start a voice session via `VoiceTestScreen` (onboarding).
   - Watch `log stream --predicate 'eventMessage CONTAINS "[TbotVoice]"'`
     in Console.app on the host mac — expect a JSON line per
     state/route/interruption event.
   - Test interruption: call the device from another phone, answer, hang
     up. Expect `transientLoss` → `interruption_ended_shouldResume` →
     `active` JSON events.
   - Test route change: connect AirPods. Expect
     `voiceRouteChange` with `route: "bluetooth"` and
     `changeReason: "newDeviceAvailable"`.

8. **Commit.**
   ```sh
   git add ios/TbotMobile.xcodeproj/project.pbxproj \
           ios/TbotMobile/TbotMobile-Bridging-Header.h \
           ios/TbotMobile/VoiceSession/
   git commit -m "feat(mobile/ios): VoiceSessionModule — AVAudioSession owner for Gemini Live"
   ```

## Scope guard — what this module does NOT do

- Does not create or manage `AVAudioEngine`. That belongs to
  MB-NATIVE-VOICE-003 (mic) and 004 (playback), and both wait on the
  voiceProcessingIO spike documented in the plan.
- Does not request microphone permission — that still flows through
  `expo-audio`'s `requestRecordingPermissionsAsync()` in
  `src/hooks/useGeminiConversation.ts`.
- Does not change the JS contract in `src/native/VoiceSession.ts` — after
  activation, `VoiceSession.isAvailable` will return `true` on iOS for the
  first time, but every method signature stays identical.
- Does not modify `AppDelegate.mm`. The module registers itself via
  `RCT_EXTERN_MODULE` + autolinking.

## Follow-ups

- **Stop `react-native-live-audio-stream` from touching the session.**
  Once this module activates, RNLAS's `setCategory` call on every
  `LiveAudioStream.start()` races ours. Plan §5 MB-NATIVE-VOICE-003 ships
  `VoiceMicModule` as the replacement — until then, consider calling
  `VoiceSession.forceRecover()` right after `LiveAudioStream.start()` to
  win the race.
- **TurboModule migration.** Current bridge uses `RCT_EXTERN_MODULE` which
  works on RN 0.83's legacy bridge path. A future session should migrate
  to a codegen spec (`VoiceSessionModuleSpec.ts`) for new-arch performance.
