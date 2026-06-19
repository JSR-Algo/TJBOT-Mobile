# T19: Remove orphaned Gemini native modules and dependencies

## Status
Registry status: BLOCKED | Priority: P0 | Blast radius: HIGH

## Problem
Custom iOS and Android native modules for `VoiceMic`, `PcmStream`, and `VoiceSession` ship in the app binary but are unused when the Gemini Live JS layer is removed. They add native build surface area, increase binary size, and force every iOS/Android build to compile and link code that has no production caller.

Source: `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/reports/audio-voice.md`, section "Improvements" (lines 52–56). The audit found that the entire Gemini Live hook, Suka avatar, waveform, transcript panel, status indicator, and control bar are implemented but unreachable, and that the dead code includes "two custom native modules (iOS + Android)".

Source: `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/MASTER_AUDIT.md`, section "Cross-Cutting Themes 4" (lines 32–36). The master report classifies the Gemini layer as orphaned/dead code and recommends making a product decision to either wire it to a navigable screen behind a feature gate or remove it and its native modules.

Source: `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/tasks/registry.json`, T19 entry (lines 950–1008). The registry explicitly scopes this task to deleting the native module source directories and removing Gemini-only dependencies from `package.json`.

Current files that must be removed:
- iOS native modules:
  - `ios/TJBotMobile/VoiceMic/VoiceMicModule.m`
  - `ios/TJBotMobile/VoiceMic/VoiceMicModule.swift`
  - `ios/TJBotMobile/PcmStream/PcmStreamModule.m`
  - `ios/TJBotMobile/PcmStream/PcmStreamModule.swift`
  - `ios/TJBotMobile/VoiceSession/README.md`
  - `ios/TJBotMobile/VoiceSession/VoiceSessionModule.m`
  - `ios/TJBotMobile/VoiceSession/VoiceSessionModule.swift`
- Android native modules:
  - `android/app/src/main/java/com/tjbotmobile/voicemic/VoiceMicModule.kt`
  - `android/app/src/main/java/com/tjbotmobile/voicemic/VoiceMicPackage.kt`
  - `android/app/src/main/java/com/tjbotmobile/pcmstream/PcmStreamModule.kt`
  - `android/app/src/main/java/com/tjbotmobile/pcmstream/PcmStreamPackage.kt`
  - `android/app/src/main/java/com/tjbotmobile/voicesession/VoiceSessionModule.kt`
  - `android/app/src/main/java/com/tjbotmobile/voicesession/VoiceSessionPackage.kt`
  - `android/app/src/main/java/com/tjbotmobile/voicesession/VoiceSessionService.kt`
- Gemini-only dependency:
  - `@google/genai` in `package.json` `dependencies` (line 34). A project-wide grep confirms it is only imported by `src/hooks/useGeminiConversation.ts` and tests/e2e mocks for the Gemini layer, all of which are removed by T18.

## Scope
### In scope
- Delete the following iOS native module source directories and all files inside them:
  - `ios/TJBotMobile/VoiceMic/`
  - `ios/TJBotMobile/PcmStream/`
  - `ios/TJBotMobile/VoiceSession/`
- Delete the following Android native module source directories and all files inside them:
  - `android/app/src/main/java/com/tjbotmobile/voicemic/`
  - `android/app/src/main/java/com/tjbotmobile/pcmstream/`
  - `android/app/src/main/java/com/tjbotmobile/voicesession/`
- Remove `@google/genai` from `package.json` `dependencies`.
- Update `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` by running the appropriate install command after editing `package.json`.
- Add the verification test file `tests/verification/T19-remove-gemini-native-modules.test.ts`.

### Out of scope
- `src/**` JavaScript/TypeScript files. The orphaned Gemini JS layer is deleted by T18 (`delete-orphaned-gemini-js`).
- `ios/Podfile` and `android/settings.gradle`. A spot-check shows no explicit references to the native module directories, so no edits are expected, but the build gates will confirm this.
- Native project-index files (`.pbxproj`, `MainApplication.kt`, etc.) unless a build error proves they hold stale references.
- Feature flags, navigation routes, or screen wiring. Those are owned by T17 if `SHIP_GEMINI` is chosen.
- General package.json hygiene beyond removing the Gemini-only dependency. Broader Jest/transform/lint cleanup is owned by T02.

## Proposed solution
1. Wait for T00 (`gemini-voice-decision`) to record `REMOVE_GEMINI` and for T18 to merge the JS-layer deletion. **Do not start implementation until both gates are closed.**
2. On the branch that already contains T18's changes, delete the iOS directories listed above.
3. Delete the Android directories listed above.
4. Open `package.json`, remove the `@google/genai` entry from `dependencies`, and run the package manager install to regenerate the lockfile.
5. Run the verification test:
   ```bash
   npx jest tests/verification/T19-remove-gemini-native-modules.test.ts
   ```
6. Run the iOS and Android debug build gates to confirm the native projects still compile and link without the removed modules.
7. Run the shared gates (`npm test`, `npm run typecheck`, `npm run lint`).
8. Update T19's `status` in `tasks/registry.json` to `COMPLETED`.

## Acceptance criteria
- Native module source directories are removed from iOS (`VoiceMic`/`PcmStream`/`VoiceSession`) and Android (`voicemic`/`pcmstream`/`voicesession`).
- `package.json` no longer references dependencies only used by the Gemini native layer.
- iOS and Android debug builds succeed after cleanup.

## Dependencies
- **T00 (`gemini-voice-decision`)**: Must record `REMOVE_GEMINI`. Implementation is blocked until this decision is made and communicated.
- **T18 (`delete-orphaned-gemini-js`)**: Must delete the Gemini JS layer and any imports of `@google/genai` first. Otherwise the app will not compile after the dependency is removed.

## Exclusions / anti-overlap
- **T17 (`wire-gemini-conversation-screen`)**, **T20**, **T21**: Must NOT run in parallel. Those tasks assume the Gemini layer is kept and wired into the UI. If T00 chooses `SHIP_GEMINI`, T19 is discarded.
- **T18 (`delete-orphaned-gemini-js`)**: Owns deletion of `src/hooks/useGeminiConversation.ts`, `src/components/gemini/*`, `src/native/*`, and related JS/TS files. T19 must not touch `src/**`.
- No other task should modify `ios/TJBotMobile/VoiceMic`, `ios/TJBotMobile/PcmStream`, `ios/TJBotMobile/VoiceSession`, `android/app/src/main/java/com/tjbotmobile/voicemic`, `android/app/src/main/java/com/tjbotmobile/pcmstream`, or `android/app/src/main/java/com/tjbotmobile/voicesession` while T19 is in flight.

## Verification test plan
- Test file: `tests/verification/T19-remove-gemini-native-modules.test.ts`
- What it proves: The native module source directories no longer exist on disk and the Gemini-only npm dependency (`@google/genai`) has been removed from `package.json`.
- How to run it: `npx jest tests/verification/T19-remove-gemini-native-modules.test.ts`
- Expected state before fix: FAIL — the iOS/Android native module directories still exist and `@google/genai` is still declared in `package.json`.
- Expected state after fix: PASS — all listed directories are gone and `@google/genai` is absent from `package.json`.

## Risks & mitigations
| Risk | Mitigation |
|------|------------|
| T00 decision chooses `SHIP_GEMINI` and this deletion work is wasted | Do not start T19 until T00 records `REMOVE_GEMINI`. The PRD is written but implementation remains blocked. |
| T18 misses an `@google/genai` import, causing `npm run typecheck` to fail after the dependency is removed | Run `npm run typecheck` locally before merging T19; the verification test only asserts `package.json`, not import coverage. |
| iOS `.pbxproj` or Android `MainApplication.kt` references the deleted modules and breaks the build | Run the iOS and Android debug build gates (`npx react-native run-ios` / `npx react-native run-android` or equivalent CI jobs). Fix any stale references in the native project files. |
| An unrelated file imports a symbol from the deleted native modules | Run `npm test` and `npm run typecheck`; search for `NativeModules.VoiceMic`, `NativeModules.PcmStream`, `NativeModules.VoiceSession`, `VoiceMicModule`, `PcmStreamModule`, `VoiceSessionModule`, `voicemic`, `pcmstream`, `voicesession` before merging. |
| Lockfile drift after removing `@google/genai` | Regenerate `package-lock.json` (or `yarn.lock`/`pnpm-lock.yaml`) with the project's package manager and commit the lockfile change. |

## Coordination notes
- **Who must be consulted:** Mobile engineering lead, iOS/Android native engineers, release/CI owner.
- **What contract must be confirmed:**
  - T00 outcome is `REMOVE_GEMINI` and is recorded in `tasks/registry.json`.
  - T18 has removed all JS/TS callers of the native modules and the `@google/genai` SDK.
  - No other feature branch depends on the Gemini native modules.

## Implementation hints
- The authoritative registry entry is at `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/tasks/registry.json` lines 950–1008.
- Audit source context is in `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/reports/audio-voice.md` lines 50–56 and `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/MASTER_AUDIT.md` lines 32–36.
- Current native files to delete were enumerated by `find` on 2026-06-16; verify the list on your branch before deleting.
- `ios/Podfile` and `android/settings.gradle` currently contain no explicit references to these modules, so no manual unlinking is expected.
- After deletion, clean build artifacts before testing:
  - iOS: `cd ios && rm -rf Pods Podfile.lock build && bundle exec pod install && cd ..`
  - Android: `cd android && ./gradlew clean && cd ..`
