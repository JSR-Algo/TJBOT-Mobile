# T18: Delete the orphaned Gemini Live JS layer

## Status
Registry status: **BLOCKED** | Priority: **P0** | Blast radius: **HIGH**

> Implementation is blocked pending **T00** (`gemini-voice-decision`) recording a `REMOVE_GEMINI` outcome. Do not start source deletions until product and legal confirm the Gemini voice path is not needed for alpha.

## Problem
The mobile repo ships roughly **3,500 lines of JS/TS** for a Gemini Live voice assistant that is fully implemented but unreachable from any production screen or route.

- `src/hooks/useGeminiConversation.ts` (~1,560 lines) is the main orchestration hook, but a grep for `useGeminiConversation`, `SukaAvatar`, `WaveVisualizer`, or `voiceAssistantStore` returns only the files that define them and `src/services/audio/PcmStreamPlayer.ts` (`docs/audits/ios-reference-audit/reports/audio-voice.md#improvements`, lines 52–56).
- `src/components/gemini/*` (SukaAvatar, WaveVisualizer, TranscriptPanel, StatusIndicator, ControlBar, BigMicButton, ParticleEffect) are rendered by no screen (`reports/audio-voice.md#improvements`, lines 52–56).
- `src/native/VoiceMic.ts`, `src/native/VoiceSession.ts`, and `src/native/voice-session-events.ts` are JS wrappers for native modules that only the Gemini hook consumes.
- `src/audio/PcmStreamPlayer.ts` is a 13-line re-export shim over `src/services/audio/PcmStreamPlayer.ts`, itself a wrapper for the native PcmStream module used only by the Gemini hook (`reports/audio-voice.md#simplifications`, lines 80–84).
- `src/services/ai/liveMessageAudio.ts` extracts inline audio parts for the Gemini session.
- `src/state/voiceAssistantStore.ts` models the 14-state Gemini voice FSM.
- The dead layer also bleeds into adjacent production surfaces:
  - `src/App.tsx` lines 17 and 56 import and start `src/services/observability/voice-telemetry.ts`, which in turn imports `src/native/voice-session-events.ts`.
  - `src/services/api/robot-mgmt.api.ts` lines 39–71 and 84 import and use `VoiceMic` for `runMicTest()`.
  - `src/debug/voiceDebugProbe.ts` is only imported by `useGeminiConversation.ts`.

This creates dead-code drag, false test confidence, and a large unused native-module surface. The audit recommends either wiring the Gemini UI behind a feature gate or deleting the orphaned layer and its native modules (`reports/audio-voice.md#top-3-quick-wins`, line 137; `MASTER_AUDIT.md#cross-cutting-themes-4`, lines 32–36).

## Scope
### In scope
- **Primary deletion targets**
  - `src/hooks/useGeminiConversation.ts`
  - `src/hooks/use-streaming-transcript.ts`
  - `src/components/gemini/*` (entire directory)
  - `src/audio/PcmStreamPlayer.ts`
  - `src/services/audio/PcmStreamPlayer.ts`
  - `src/native/VoiceMic.ts`
  - `src/native/VoiceSession.ts`
  - `src/native/voice-session-events.ts`
  - `src/services/ai/liveMessageAudio.ts`
  - `src/state/voiceAssistantStore.ts`
- **Dependent files that become orphaned once the targets above are gone**
  - `src/services/observability/voice-telemetry.ts` (only consumed by `App.tsx` and `useGeminiConversation.ts`)
  - `src/debug/voiceDebugProbe.ts` (only consumed by `useGeminiConversation.ts`)
- **Production call sites that must be cleaned**
  - `src/App.tsx` lines 17, 56 — remove `startVoiceTelemetry` import and the boot-time `useEffect`.
  - `src/services/api/robot-mgmt.api.ts` lines 39–71, 84 — remove `VoiceMic` dependency and stub `runMicTest()` as not-implemented.
  - `src/lib/suka-prompt.ts` line 16 — remove/update the comment that names `useGeminiConversation`.
- **Gemini-only test files to delete or stub**
  - `tests/hooks/useGeminiConversation-*.test.ts`
  - `tests/hooks/use-streaming-transcript.test.ts`
  - `tests/audio/PcmStreamPlayer.test.ts`
  - `tests/ai/liveMessageAudio.test.ts`
  - `tests/native/VoiceMic.test.ts`
  - `tests/native/VoiceMic-events.test.ts`
  - `tests/native/voice-session-events.test.ts`
  - `tests/native/ios-voice-fallback-gate.test.ts`
  - `tests/observability/voice-telemetry.test.ts`
  - `tests/ui-validation/accessibility-primitives.test.tsx` (or at least the Gemini component assertions)
  - `tests/security/gemini-api-key.test.ts`
  - `tests/eslint-rules/no-voice-timing-in-shared.test.ts`
  - `tests/api/robot-mgmt-api.test.ts` (or update its `VoiceMic` mocks)
- **Dependencies**
  - `package.json` line 58 — remove `@google/genai` (the only confirmed production dependency used exclusively by the Gemini hook).
- **Verification**
  - `tests/verification/T18-delete-orphaned-gemini-js.test.ts` (this PRD's test).

### Out of scope
- `ios/**` and `android/**` native module removal (owned by **T19**).
- `src/services/ai/safety/README.md` and any safety-shim implementation (owned by **T20**).
- Adding a feature flag or route for Gemini (owned by **T17**).
- Non-Gemini dead-code deletions listed in **T13** (`AppProviders.tsx`, `ThemeProvider.tsx`, `useOfflineSync.ts`, `useLatencyBudget.ts`, `LatencyHud.tsx`).
- Refactoring lesson-session audio/robot components (**T21**, **T29**).
- Replacing `runMicTest()` with a real non-Gemini implementation.
- Removing `buffer` or other dependencies unless they are confirmed unused after the deletions.

## Proposed solution
1. **Gate on T00.** Do not open the implementation PR until `T00-gemini-voice-decision.md` records `REMOVE_GEMINI` with product and legal sign-off.
2. **Delete primary targets.** Remove the files and `src/components/gemini` directory listed in the in-scope section. Use `git rm` so history remains the reference.
3. **Delete dependent orphan files.** Remove `src/services/observability/voice-telemetry.ts` and `src/debug/voiceDebugProbe.ts` because their only consumers are being deleted.
4. **Clean production imports.**
   - In `src/App.tsx`, delete the `startVoiceTelemetry` import (line 17) and the `useEffect` that calls it (lines 52–58).
   - In `src/services/api/robot-mgmt.api.ts`, delete the `VoiceMic` import (line 84) and replace the `runMicTest()` body with `throw new Error('not implemented')` (consistent with the other stubs in the file). Remove the now-unused `unsubEngineReady`/`unsubVadStart` cleanup code.
   - In `src/lib/suka-prompt.ts`, update the JSDoc comment that references `useGeminiConversation` so it no longer points to a deleted file.
5. **Remove Gemini-only tests.** Delete the test files listed above, or rewrite the few that have non-Gemini value (e.g., accessibility-primitives) to stop importing `src/components/gemini/*`.
6. **Update `package.json`.** Remove `@google/genai` from `dependencies`. Run `npm install` and commit the lockfile change.
7. **Run quality gates.** Execute `npm run typecheck` and `npm test` (after any T32 baseline fixes are in place). Fix any residual import errors or stale mocks.
8. **Update documentation.** If any runbook or README references the deleted files, open a tiny docs follow-up or add it to this PR.

## Acceptance criteria
1. The listed JS/TS files and the `src/components/gemini` directory are deleted.
2. No production source file imports or references any deleted symbol (`useGeminiConversation`, `SukaAvatar`, `WaveVisualizer`, `TranscriptPanel`, `StatusIndicator`, `ControlBar`, `BigMicButton`, `ParticleEffect`, `VoiceMic`, `VoiceSession`, `voice-session-events`, `PcmStreamPlayer`, `liveMessageAudio`, `voiceAssistantStore`, `useStreamingTranscript`, `startVoiceTelemetry`, etc.).
3. `package.json` no longer depends on `@google/genai` (the only confirmed Gemini-only production dependency).
4. `npm test` and `npm run typecheck` pass after the deletions and dependent cleanup.

## Dependencies
- **T00** (`gemini-voice-decision`) — must record `REMOVE_GEMINI` before this task is unblocked.
- **T32** (`fix-failing-test-baseline`) — soft prerequisite. Landing T18 while the baseline is red will make it hard to tell whether T18 itself passes; prefer to land after T32 is green.

## Exclusions / anti-overlap
- **T17** (wire Gemini screen), **T20** (safety shim), and **T21** (unify avatar/waveform primitives) are the `SHIP_GEMINI` branch. They must not run in parallel with T18 and are mutually exclusive with it.
- **T13** (delete dead providers/hooks) also lists `use-streaming-transcript.ts`. T13 must **not** delete that file or any `src/components/gemini/*` files; T18 owns the Gemini cleanup.
- **T19** (remove Gemini native modules) should land after or alongside T18. Deleting the JS wrappers first prevents TS import errors; T19 then removes the `ios/` and `android/` directories.
- **T29** (centralize icon library) lists `src/components/gemini/BigMicButton.tsx` and `ControlBar.tsx`. If T18 lands first, those files disappear and T29's scope shrinks automatically.

## Verification test plan
- **Test file:** `tests/verification/T18-delete-orphaned-gemini-js.test.ts`
- **What it proves:** the orphaned Gemini JS files and dependent telemetry/debug files are gone; no production source imports their symbols; `package.json` no longer depends on `@google/genai`.
- **How to run it:** `npx jest tests/verification/T18-delete-orphaned-gemini-js.test.ts`
- **Expected state before fix:** FAIL — the files still exist and production code still imports Gemini symbols.
- **Expected state after fix:** PASS

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Deleting `voice-telemetry.ts` breaks `App.tsx`. | Remove the `startVoiceTelemetry` import and `useEffect` in the same PR. |
| `robot-mgmt.api.ts` loses its `VoiceMic`-based mic test. | Stub `runMicTest()` as `not implemented`; the rest of the API file remains. |
| Existing tests reference deleted files and fail. | Delete or update Gemini-only tests before merging; run `npm test`. |
| `SHIP_GEMINI` tasks (T17/T20/T21) are still open. | Confirm T00 decision is `REMOVE_GEMINI`; keep T18 exclusions list visible in the PR. |
| Native modules are still linked after JS wrappers are gone. | Coordinate with T19 so native cleanup follows immediately; builds will still compile unused native code but the JS bundle will not reference it. |
| `@google/genai` removal may leave lockfile conflicts. | Run `npm install` and commit `package-lock.json`/`yarn.lock`/`pnpm-lock.yaml` in the same PR. |

## Coordination notes
- **Product / Legal** must record the `REMOVE_GEMINI` decision in `docs/audits/ios-reference-audit/tasks/T00-gemini-voice-decision.md`.
- **T13 owner** — confirm that `use-streaming-transcript.ts` and all Gemini files are excluded from T13.
- **T19 owner** — schedule T19 to land immediately after T18 so iOS/Android native module directories are removed before the next release cut.
- **Mobile QA** — verify `npm test` and `npm run typecheck` after the test-file deletions; T32 may need to land first for a clean signal.

## Implementation hints
- Find every production import with:
  ```bash
  rg -n "useGeminiConversation|SukaAvatar|WaveVisualizer|TranscriptPanel|StatusIndicator|ControlBar|BigMicButton|ParticleEffect|VoiceMic|VoiceSession|voice-session-events|PcmStreamPlayer|liveMessageAudio|voiceAssistantStore|useStreamingTranscript|startVoiceTelemetry|stopVoiceTelemetry|jsErrorBreadcrumb|startVoiceDebugProbe|stopVoiceDebugProbe" src/
  ```
- The only production callers of the orphaned layer are `App.tsx` (telemetry) and `robot-mgmt.api.ts` (`runMicTest`).
- After deletion, run `npm run typecheck` **before** `npm test`; TS import errors are faster to fix than Jest module-resolution errors.
- If any file in the scope list does not exist at implementation time, update this PRD and the verification test rather than trying to delete a missing file.
