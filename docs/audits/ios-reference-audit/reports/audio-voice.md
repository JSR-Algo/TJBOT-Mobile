# audio-voice Audit

## Scope
Audio capture/playback, voice activity detection, latency, file size, on-device vs cloud, and error handling for the TJBot-mobile realtime voice assistant (Gemini Live path).

## Files reviewed

### Mobile project
- `src/hooks/useGeminiConversation.ts` (1,560 lines — primary orchestration hook)
- `src/services/audio/PcmStreamPlayer.ts`
- `src/audio/PcmStreamPlayer.ts` (re-export shim)
- `src/native/VoiceMic.ts`, `src/native/VoiceSession.ts`, `src/native/voice-session-events.ts`
- `src/state/voiceAssistantStore.ts`
- `src/services/ai/liveMessageAudio.ts`
- `src/services/ai/safety/README.md`
- `src/services/observability/voice-telemetry.ts`
- `src/hooks/use-voice-activity.ts`
- `src/hooks/useLatencyBudget.ts`, `src/hooks/use-streaming-transcript.ts`
- `src/components/gemini/SukaAvatar.tsx`, `WaveVisualizer.tsx`, `TranscriptPanel.tsx`, `StatusIndicator.tsx`, `ControlBar.tsx`, `BigMicButton.tsx`, `ParticleEffect.tsx`
- `src/components/robot/RobotFace.tsx`, `RobotAnimations.ts`, `RobotModeTheme.ts`, `LatencyHud.tsx`
- `src/lib/suka-prompt.ts`
- `src/config.ts`
- `src/features/lesson-demo/screens/RobotLessonControlScreen.tsx`
- `src/app/screens/ListenScreen.tsx`, `SpeakScreen.tsx`
- `src/features/lesson-session/screens/RobotListeningScreen.tsx`, `UserSpeakingScreen.tsx`, `RobotSpeakingScreen.tsx`
- `src/services/ws/xiaozhi-device.ts`
- `tests/audio/PcmStreamPlayer.test.ts`, `tests/hooks/use-voice-activity.test.ts`, `tests/ai/liveMessageAudio.test.ts`, `tests/hooks/useGeminiConversation-p0.test.ts`, `tests/hooks/useGeminiConversation-voice-stability.test.ts`
- `package.json`
- iOS native: `ios/TJBotMobile/VoiceMic/VoiceMicModule.swift`, `ios/TJBotMobile/PcmStream/PcmStreamModule.swift`, `ios/TJBotMobile/VoiceSession/VoiceSessionModule.swift` (partial)

### Reference cards
- `argmaxinc/argmax-oss-swift` — WhisperKit on-device STT + TTSKit streaming TTS
- `soniqo/speech-swift` — Silero VAD + Parakeet streaming ASR + Kokoro TTS via Swift actors / `AsyncStream`
- `FluidInference/FluidAudio` — actor-isolated `VadManager`/`AsrManager`/`PocketTtsModelStore`, ANE/CoreML
- `lbacaj/WalkWrite-opensource` — local Whisper.cpp + MLX Qwen-3, custom actors, background-task memory handling
- `AudioKit/Waveform` — Metal/GPU-accelerated waveform renderer with `MTKView`
- `Otosaku/NeMoVAD-iOS` — CoreML MarbleNet VAD with configurable presets
- `andreapianidev/WalkieTalkie` — `AVAudioSession` push-to-talk, background audio, Live Activities

## Reference benchmarks

- **argmaxinc/argmax-oss-swift** & **soniqo/speech-swift** & **FluidAudio** all demonstrate on-device speech pipelines (ASR/VAD/TTS) using CoreML/ANE, actor isolation, and streaming `AsyncThrowingStream` surfaces. They keep cloud off the critical audio path and avoid giant monolithic orchestrators.
- **Otosaku/NeMoVAD-iOS** shows a clean VAD API: `process(samples:)`, configurable presets (`sensitive`/`aggressive`), frame-level probabilities, and segment output — useful for replacing JS energy-threshold VAD or for validating native VAD behavior.
- **AudioKit/Waveform** renders waveforms on the GPU via Metal, with precomputed min/max mipmaps and `MTKView` — a much cheaper approach than re-creating `Animated.timing` loops on every level change.
- **WalkieTalkie** is a close product analog: push-to-talk audio, `AVAudioSession` route/background handling, and audio-session recovery patterns that map directly to TJBot's `VoiceSessionModule`.
- **WalkWrite** shows how to isolate heavy inference behind custom global actors and register memory-warning/background-task callbacks — relevant if TJBot ever adds on-device STT/TTS fallback.

## Findings

### Improvements

- **Orphaned realtime voice UI pipeline** (`src/hooks/useGeminiConversation.ts`, `src/components/gemini/*`).
  - The entire Gemini Live hook, Suka avatar, waveform, transcript panel, status indicator, and control bar are implemented but not imported by any screen or route. A `grep` for `useGeminiConversation`, `SukaAvatar`, `WaveVisualizer`, or `voiceAssistantStore` returns only the files that define them and `src/services/audio/PcmStreamPlayer.ts`.
  - The only production voice surface today is `RobotLessonControlScreen.tsx`, which POSTs to `/robot-lessons/start` and lets the physical robot run Gemini Live on its own; the mobile app never renders the conversation.
  - **Why it matters:** Roughly 3,500 lines of JS/TS, two custom native modules (iOS + Android), and a 14-state FSM are shipped and maintained but unreachable. This creates dead-code drag, false test coverage, and a large attack surface.
  - **Recommended change:** Either wire the Gemini hook into a navigable screen (e.g., a "Talk to Suka" tab) behind a feature gate, or delete the orphaned layer and its native modules. If retention is the plan, add a minimal `GeminiConversationScreen.tsx` that consumes `useGeminiConversation` and renders `SukaAvatar` + `TranscriptPanel` + `ControlBar`.

- **Missing safety shim implementation** (`src/services/ai/safety/README.md`).
  - The README describes a complete Layer 1/2/3 child-safety system with blocklist, persona assembly, integrity hashing, telemetry, and tests. The directory contains only the README.
  - **Why it matters:** The prompt in `src/lib/suka-prompt.ts` instructs the model to avoid harmful content, but there is no deterministic input/output guard, no canary corpus, and no fail-closed behavior. For a child-facing voice product this is a compliance/governance gap.
  - **Recommended change:** Implement the files listed in the README (`index.ts`, `inputBlocklist.ts`, `outputBlocklist.ts`, `persona.ts`, `blocklist.v1.json`, `schemas.ts`, `__tests__/*`) and wire `checkInput` into `handleMicChunk` and `checkOutput` into the `outputTranscription`/`serverContent` handler in `useGeminiConversation.ts`.

- **All audio stays raw base64 PCM with no compression** (`useGeminiConversation.ts` lines 1414–1416; `voice-session-events.ts`).
  - Mic audio is sent as `audio/pcm;rate=16000` base64 chunks (~50 Hz). Gemini Live returns inline PCM at 24 kHz. There is no Opus/OGG/AAC stage, no packet-size budget, and no local buffering policy beyond the 200 ms iOS jitter buffer.
  - **Why it matters:** Cloud bandwidth and cost scale linearly with uncompressed audio. For metered cellular use or high-traffic sessions, this is expensive. References such as WalkieTalkie and FluidAudio use compressed codecs where appropriate.
  - **Recommended change:** Evaluate Gemini Live's supported input formats and, if Opus is available, add an `AudioConverter`/Opus stage in native code (or a small RN library) before bridging to JS. If Gemini requires PCM, at least add a chunk-size cap and network-adaptive bitrate telemetry.

- **Hardcoded production backend fallback** (`src/config.ts` lines 17–19).
  - `HOSTED_API_ROOT` is a literal Cloudflare Quick Tunnel URL (`prerequisite-analysts-luther-review.trycloudflare.com`). It is referenced as the final fallback for release builds.
  - **Why it matters:** The tunnel will rotate/expire. Shipping this as a production fallback will break the app without a code change.
  - **Recommended change:** Move the hosted root to an environment variable or remote-config value and fail closed (no fallback) if it is unset in release builds.

- **Weak user-visible error recovery in several hot paths** (`PcmStreamPlayer.ts` lines 176–179, 211–217, 248–250, 264–271, 337–343, 346–363; `useGeminiConversation.ts` lines 850–852).
  - Many native failures log a warning or Sentry breadcrumb but do not propagate a user-facing error or transition the FSM. For example, `feed()` rejections are caught and only breadcrumbed; `startResponse()` failures are silently swallowed; `interrupt()` and `dispose()` swallow native exceptions.
  - **Why it matters:** Silent failures make field debugging harder and can leave the user staring at a stuck "Đang nghĩ…" state.
  - **Recommended change:** Classify native errors into "recoverable" vs "fatal" and route recoverable ones through `voiceAssistantStore.setError(...)` + `transition('ERROR_RECOVERABLE')`. Keep the breadcrumb for diagnostics but do not swallow the user signal.

### Simplifications

- **Duplicate `PcmStreamPlayer` module** (`src/audio/PcmStreamPlayer.ts` and `src/services/audio/PcmStreamPlayer.ts`).
  - `src/audio/PcmStreamPlayer.ts` is a 13-line re-export that exists because of an earlier import split. All consumers should import from one canonical path.
  - **Why it matters:** Two paths for one class invites import drift and confused module boundaries.
  - **Recommended change:** Delete `src/audio/PcmStreamPlayer.ts` and update imports to `src/services/audio/PcmStreamPlayer`. If the split is required by a legacy Android file, move the canonical file and update the comment.

- **`useGeminiConversation.ts` is a 1,560-line monolithic hook** with ~40 refs, 14-state FSM timers, barge-in ordering logic, reconnect logic, capture logic, and SDK wiring all in one file.
  - **Why it matters:** It is hard to unit-test behaviorally, hard to reason about concurrency, and the existing tests are mostly source-lock regex assertions (`useGeminiConversation-p0.test.ts`, `useGeminiConversation-voice-stability.test.ts`).
  - **Recommended change:** Extract focused sub-hooks or plain modules:
    - `useVoiceSessionLifecycle()` — permission + `VoiceSession` start/end/subscriptions.
    - `useAudioCapture()` — `VoiceMic` start/stop/VAD callbacks.
    - `usePcmPlayback()` — `PcmStreamPlayer` lifecycle.
    - `useGeminiLiveSession()` — `@google/genai` connect/disconnect/reconnect.
    - Keep the FSM transitions in a small reducer or in `voiceAssistantStore` rather than a web of refs.
  - This mirrors `speech-swift`'s `CompanionChatViewModel` → pipeline engine split and `FluidAudio`'s actor-isolated managers.

- **`useVoiceActivity.ts` is implemented but unused** (confirmed by grep; only used in its own test).
  - It is a JS energy+ZCR VAD with a 350 ms hold-off. `useGeminiConversation.ts` instead relies on native `voiceMicVadStart`/`voiceMicVadEnd` events.
  - **Why it matters:** Dead code plus a duplicate abstraction. The JS VAD could serve as a fallback when native VAD is unavailable, but today it is not integrated.
  - **Recommended change:** Either wire it as a fallback path in `_startAudioCapture` when `VoiceMic.isAvailable === false` (e.g., simulator or missing native module), or delete it. If kept, document which VAD is authoritative.

- **`useStreamingTranscript.ts` references Deepgram semantics** in its JSDoc (`tests/hooks/use-streaming-transcript.test.ts` and the hook itself), but the production pipeline uses Gemini Live's built-in `inputAudioTranscription`/`outputAudioTranscription`.
  - **Why it matters:** Misleading comments and a mismatched abstraction can cause future regressions if someone wires this hook to Gemini messages expecting Deepgram shapes.
  - **Recommended change:** Update the hook's contract to describe Gemini Live server-content transcription fields, or remove it if Gemini's streaming text is handled inline in `useGeminiConversation.ts`.

- **Two competing robot/audio visual languages** (`src/components/gemini/*` vs. `src/components/robot/*` and `src/design-system/components/*`).
  - The Gemini path has `SukaAvatar`, `WaveVisualizer`, and `RobotFace`. The lesson-session path has `Robot`, `WaveBars`, and `PulseRing`. They do not share primitives, theme tokens, or animation drivers.
  - **Why it matters:** Inconsistent feel, duplicated motion logic, and duplicated accessibility labels.
  - **Recommended change:** Consolidate on one avatar component and one waveform primitive. For example, make `SukaAvatar` theme-aware and reuse it in lesson-session screens, or retire `RobotFace`/`WaveVisualizer` if the lesson path is the shipping UI.

### Bottlenecks

- **WaveVisualizer recreates `Animated.timing` loops on every `audioLevel` change** (`src/components/gemini/WaveVisualizer.tsx` lines 23–48).
  - Each of 16 bars gets a new random-duration `Animated.timing` on every prop update. `Animated` loops are started/stopped repeatedly.
  - **Why it matters:** At 10 Hz updates this creates garbage and can drop JS thread frames, especially on lower-end Android devices. The reference `AudioKit/Waveform` keeps a Metal render loop and precomputed buffers.
  - **Recommended change:** Drive the waveform with a single `Animated.Value` per bar and interpolate from `audioLevel` via `useNativeDriver`, or switch to a canvas/Metal-based renderer for the live waveform. Add `reduceMotion` support if not already wired.

- **Typewriter effect uses `setInterval` per character** (`src/components/gemini/TranscriptPanel.tsx` lines 17–58).
  - For long streaming AI transcripts this schedules many short timers and re-renders the `TranscriptPanel` repeatedly.
  - **Why it matters:** Unnecessary re-renders and timer pressure while the voice FSM is running.
  - **Recommended change:** Batch character reveals (e.g., 3–5 chars per tick) and cancel the interval immediately when the transcript changes, rather than letting it drain. Alternatively, use a simple `Animated` opacity/translate reveal and keep the text static.

- **JS thread does base64 decoding for RMS on every chunk** (`useGeminiConversation.ts` lines 1397–1405; `PcmStreamPlayer.ts` `sampleRms`).
  - `handleMicChunk` decodes the base64 string byte-by-byte in JS to compute a coarse RMS for the visualizer. The native module already has the raw PCM.
  - **Why it matters:** ~50 Hz base64 decode + charCodeAt loops burns JS time that could go to the bridge or UI.
  - **Recommended change:** Have `VoiceMic.onData` emit a pre-computed `rms` field from native, or compute level in the native visualizer module. If JS must do it, use a typed array path rather than `atob` + string indexing.

- **Module-level rate-limiting and mutable UUID function** (`voiceAssistantStore.ts` lines 282–308).
  - `lastBargeInAtMs`, `__resetBargeInRateLimit`, and `__setRandomUUID` are module-level side effects used by tests to mutate production code.
  - **Why it matters:** Tests that call private `__*` functions create hidden coupling and can mask real concurrency bugs in production.
  - **Recommended change:** Move the rate-limit state into the store (it is UI-relevant enough) and inject the UUID generator via the store creator so tests can supply a deterministic one through normal initialization.

- **No on-device fallback for STT/TTS** — everything goes to Gemini Live.
  - **Why it matters:** For a child-facing, COPPA-sensitive product, full cloud audio dependency is a privacy, cost, and offline-availability risk. References like WalkWrite and FluidAudio keep ASR/TTS on device.
  - **Recommended change:** Evaluate WhisperKit (`argmax-oss-swift`) or `speech-swift` Parakeet ASR + Kokoro TTS as an offline fallback for at least simple commands and confirmations. Even a small on-device VAD (NeMoVAD / Silero) could reduce cloud traffic.

## Top 3 quick wins

1. **Wire or delete the orphaned Gemini voice screen.** The fastest risk reduction is deciding whether `useGeminiConversation` + `src/components/gemini/*` ships. If it does, create `GeminiConversationScreen.tsx` and a route; if not, remove the dead code and native modules to stop paying maintenance and build cost.
2. **Implement the documented safety shim.** Add the missing `src/services/ai/safety/*.ts` files and call `checkInput`/`checkOutput` from the conversation hook. This is a high-compliance, relatively small code change with a clear spec already written.
3. **Consolidate visual/audio primitives.** Pick one avatar and one waveform component, delete the other, and make the chosen primitives theme-aware. This removes duplication and reduces animation-related frame drops.

## Risk / effort estimates

| Recommendation | Risk | Effort | Notes |
|---|---|---|---|
| Wire or delete orphaned Gemini voice UI | HIGH (user-facing / build) | MEDIUM–HIGH | Requires product decision; deletion is safer than shipping untested code. |
| Implement safety shim | HIGH (compliance/safety) | MEDIUM | Spec is written; mostly deterministic logic + tests. |
| Add Opus/compression stage | MEDIUM (cost/latency) | HIGH | Native work on both platforms; verify Gemini format support first. |
| Remove hardcoded Cloudflare fallback | MEDIUM | LOW | Config/env change; add release-build guard. |
| Refactor monolithic hook into sub-hooks/modules | MEDIUM (regression) | HIGH | Best done after behavioral test coverage improves. |
| Delete duplicate `src/audio/PcmStreamPlayer.ts` | LOW | LOW | Mechanical import update. |
| Wire/delete `useVoiceActivity` fallback | LOW | LOW | Small integration or deletion. |
| Fix WaveVisualizer animation churn | MEDIUM (perf) | LOW–MEDIUM | Reuse animated values or switch to canvas. |
| Move rate-limit/UUID into store | LOW | LOW–MEDIUM | Improves testability; touches tests. |
| Evaluate on-device ASR/TTS fallback | HIGH (strategy) | VERY HIGH | Architecture decision; reference libraries available. |
