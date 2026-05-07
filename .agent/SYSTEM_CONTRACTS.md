# SYSTEM_CONTRACTS — tbot-mobile

## REST API CONSUMED FROM tbot-backend

Base URL: EXPO_PUBLIC_API_BASE_URL (environment variable, never hardcode)
Auth: Bearer token in Authorization header
Protocol: HTTPS only

### Auth Endpoints
- POST /v1/auth/register — create parent account
- POST /v1/auth/login — returns { accessToken, refreshToken }
- POST /v1/auth/refresh — body: { refreshToken } → returns new accessToken
- POST /v1/auth/logout — invalidates tokens server-side
- POST /v1/auth/coppa-consent — body: { consentTimestamp, parentId }
- DELETE /v1/auth/account — full account deletion (COPPA right to erasure)

### Device Endpoints
- GET /v1/devices — list paired devices for parent
- POST /v1/devices/pair — body: { bleDeviceId, deviceName }
- DELETE /v1/devices/:deviceId — unpair device
- PATCH /v1/devices/:deviceId/settings — body: device settings object

### Content/Summary Endpoints
- GET /v1/summaries/:deviceId — conversation summaries (read-only)
- GET /v1/summaries/:deviceId/:summaryId — single summary detail

### Error Codes Consumed
- 401 UNAUTHORIZED → trigger token refresh flow
- 403 COPPA_CONSENT_REQUIRED → show consent screen
- 404 DEVICE_NOT_FOUND → show pairing prompt
- 429 RATE_LIMITED → show retry-after message
- 5xx → show generic error, log to crash reporter

## BLE PROTOCOL CONSUMED FROM tbot-firmware

Service UUID: loaded from BLE_CONFIG.SERVICE_UUID constant (do not hardcode)
Transport: BLE GATT over react-native-ble-plx

### Characteristics (READ from firmware spec, do not infer)
- DEVICE_INFO_CHAR: device name, firmware version (read-only)
- CONTROL_CHAR: write commands (volume, bedtime mode, activity)
- STATUS_CHAR: notify on device state changes

### Pairing Flow
1. Scan for service UUID
2. Verify device UUID in allowlist
3. Connect → discover services → read DEVICE_INFO_CHAR
4. POST /v1/devices/pair with bleDeviceId and device name
5. Store pairing record locally (device ID only, no audio data)

### BLE Error Codes Consumed
- BleError.DEVICE_NOT_FOUND → "Device not found, move closer"
- BleError.DEVICE_DISCONNECTED → trigger reconnect, max 2 retries
- BleError.OPERATION_TIMEOUT → "Connection timed out, try again"

## PUSH NOTIFICATIONS

Providers: Expo Notifications SDK → FCM (Android) → AWS SNS
Token registration: send Expo push token to POST /v1/devices/push-token on login
Notification payload schema:
```typescript
interface PushPayload {
  type: 'SUMMARY_READY' | 'DEVICE_OFFLINE' | 'LOW_BATTERY';
  deviceId: string;
  deepLinkPath: string;  // e.g., "/summaries/device-123"
}
```
Deep link handling: navigate to deepLinkPath on notification tap
NEVER display raw notification payload to user

## REALTIME VOICE / GEMINI LIVE (sys-04 + sys-16)

Authoritative design: `docs/architecture/unified-realtime-architecture.md`
Acceptance criteria: `docs/qa/realtime-voice-acceptance.md` §2
ADR (iOS voice-processing-IO decision): `docs/adr/mb-native-voice-003-voice-processing-io.md`

### Architectural contract

Mobile owns the Gemini Live WebSocket session directly via `@google/genai`.
Audio frames NEVER transit the TBOT backend on the hot path — the backend
is only the ephemeral-token minting authority. Cold-path summaries go via
`POST /v1/summaries` after the session closes.

Call graph:
```
Mobile → POST /gemini/token (backend: auth + mint token) ← ephemeral token
Mobile ←→ Google Live API WebSocket  (direct; PCM 16 kHz up / 24 kHz down)
Mobile → POST /v1/summaries (cold-path, transcript only, no audio)
```

### Endpoint: POST /gemini/token

Consumed via `apiClient.post('/gemini/token')` (the `/v1` prefix is added
by `apiClient.baseURL`, source: `src/api/client.ts`).

Request:
- Bearer-token auth (parent account access token in `Authorization` header).
- Empty body `{}`.

Response (200):
```typescript
interface GeminiTokenResponse {
  token: string;      // Ephemeral auth token — NEVER a long-lived 'AIza...' key in prod.
  expiresAt: string;  // ISO-8601; TTL must be ≤ 5 minutes (AC 2.1, docs/qa/realtime-voice-acceptance.md).
}
```

Security rules:
- Default path (`ALLOW_DEV_API_KEY` env unset or not literally `"true"`) =
  ephemeral token via `v1alpha/authTokens` endpoint, TTL 5 min. Backend
  enforces this at `tbot-backend/src/ai/gemini-token.service.ts:40` and
  the locked-in spec at `gemini-token.service.spec.ts`.
- Dev override (`ALLOW_DEV_API_KEY=true`) returns the raw `AIza...` key
  for local dev only. The response still declares `expiresAt` = now+5min
  so the client refresh cadence is identical in dev and prod.
- Mobile MUST re-fetch on 401 and before `expiresAt` elapses. See
  `src/hooks/useGeminiConversation.ts` `sessionRequestStartMsRef` + A7
  `session_start_latency_ms` telemetry.
- Token MUST NOT be stored anywhere on disk (memory-only in the hook ref).

### Google Live WebSocket contract

Library: `@google/genai/web` `GoogleGenAI.live.connect(...)`.
Model: `Config.GEMINI_LIVE_MODEL` (default `models/gemini-2.0-flash-live-001`).

Connect config:
- `responseModalities: [Modality.AUDIO]`
- `speechConfig.languageCode` — required, currently `vi-VN`. Without this field Gemini Live auto-detects and hallucinates short Vietnamese input (2026-04-24 repro: `"Bạn do ai tạo?"` → `"Bà ấy có nấu không?"`). Source-match guard in `tests/hooks/useGeminiConversation-language.test.ts`.
- `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` — default `Kore`
- `systemInstruction` — age-aware persona assembled per `src/ai/safety/README.md §5`
- `inputAudioTranscription: {}` + `outputAudioTranscription: {}` — both on
- `sessionResumption: resumptionConfig` — live as of A6 (2026-04-24); passes
  cached handle if present and fresh (< `HANDLE_MAX_AGE_MS`).
- `realtimeInputConfig.activityHandling` — ROLLED BACK; server-side default
  (`START_OF_ACTIVITY_INTERRUPTS`) is authoritative. Re-enable only after
  device testing proves the SDK accepts the field on `gemini-2.0-flash-live-001`.

Resumable handles:
- Cached in-memory via `sessionResumptionHandleRef` when server emits
  `message.sessionResumptionUpdate` with `resumable=true`.
- Used on reconnect (goAway handler) to preserve conversation state.
- NEVER persisted to disk (COPPA / PII rule at
  `useGeminiConversation.ts:73-77`).

### Server-initiated signals (hot path)

- `message.serverContent.modelTurn.parts[*].inlineData.data` — base64 PCM
  24 kHz Int16 LE; multiple parts possible per message (extractor at
  `src/ai/liveMessageAudio.ts`).
- `message.serverContent.interrupted` — server barge-in. Triggers
  `playbackRef.current.interrupt()` + FSM PLAYING_AI_AUDIO → INTERRUPTED.
  A7 telemetry event: `interrupt_server_latency_ms` (AC 2.5, target p50 ≤ 250ms).
- `message.sessionResumptionUpdate` — caches handle (see above).
- `message.goAway` — server evicts session soon. Triggers A5 graceful
  reconnect via `reconnectRef`. Telemetry: `live_go_away` +
  `session_reconnect_begin`.

### State machine (`src/state/voiceAssistantStore.ts`)

Canonical states — FSM v2, plan §3.2 (14 states, defined at
`voiceAssistantStore.ts:40-54`, semantics docstring at lines 10-27):

```
IDLE → PREPARING_AUDIO → CONNECTING → READY → LISTENING →
USER_SPEAKING → USER_SPEECH_FINALIZING → WAITING_AI →
ASSISTANT_SPEAKING → (LISTENING | INTERRUPTED) → …
```

Error / recovery edges:
- `RECONNECTING` reachable from every active LISTENING / USER_SPEAKING /
  USER_SPEECH_FINALIZING / WAITING_AI / ASSISTANT_SPEAKING; allowed
  successors are READY, LISTENING, ERROR_RECOVERABLE, ERROR_FATAL, ENDED
  (transitions table at `voiceAssistantStore.ts:69-146`).
- `ERROR_RECOVERABLE` auto-resets to `IDLE` after 5 s via the hook timer
  (lint rule §11.7: store does not own timers; the test
  `tests/hooks/useGeminiConversation-timers.test.ts` locks the deadlines).
- `ERROR_FATAL` exits only to `ENDED` (no auto-reset; user must acknowledge).

Legacy state names that previously appeared in this section have been
renamed by the v1 → v2 cut and are NOT in the contract anymore:
`REQUESTING_MIC_PERMISSION` → `PREPARING_AUDIO`,
`STREAMING_INPUT` → covered by `LISTENING` / `USER_SPEAKING` (mic always
streams once it is up; there is no separate streaming state),
`PLAYING_AI_AUDIO` → `ASSISTANT_SPEAKING`,
`ERROR` (single state) → split into `ERROR_RECOVERABLE` / `ERROR_FATAL`.

### Audio path (both platforms)

- Capture: native `VoiceMic` (Android `VoiceMicModule.kt` + iOS
  `VoiceMicModule.swift`) via the JS bridge `src/native/VoiceMic.ts`. RNLAS
  was retired (2026-04-28) along with the `VOICE_FORCE_NATIVE_IOS` flag.
  PCM 16 kHz Int16 mono, base64-encoded chunks streamed via
  `session.sendRealtimeInput({audio: {data, mimeType}})`. Native module
  emits `voiceMicEngineReady` on first frame (one-shot per `start()`),
  consumed by the hook to drive READY → LISTENING (with a JS-side latch
  to absorb the early-fire race on fast hardware-AEC devices, see
  `docs/qa/ad-hoc/2026-05-03-adhoc-mic-engine-ready-race.md`).
- Playback: native `PcmStreamModule` on both platforms (`ios/TbotMobile/PcmStream/`,
  Android in `android/app/src/main/java/com/tbotmobile/pcmstream/`). 24 kHz
  Float32 mono via `AVAudioEngine` + `AVAudioPlayerNode` on iOS (shared
  `SharedVoiceEngine`); native `AudioTrack` writer thread on Android. 50 ms
  jitter buffer (B4, 2026-04-24, configurable via UserDefaults
  `voicePlaybackJitterBufferMs` on iOS).
- iOS `AVAudioSession` config: `.playAndRecord` + `.default` mode +
  `[.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker]`. `.voiceChat`
  mode is NOT SAFE on iOS 18.7.7 per B1 spike verdict (ADR
  mb-native-voice-003).
- iOS HW AEC: capture-side only via `inputNode.setVoiceProcessingEnabled(true)`.
  Android HW AEC: `AcousticEchoCanceler` attached via shared `audioSessionId`
  between `AudioRecord` and `AudioTrack` (memory observation 574;
  `VoiceMicModule.kt` line 451-457 release path).

### Telemetry (AC 2.1/2.4/2.5 evidence)

In-memory timestamps stamped at specific hook sites (A7, 2026-04-24):
- `sessionRequestStartMsRef` → at `POST /gemini/token` call
- `sessionWsOpenMsRef` → at Live API `onopen`
- `firstAudioAtMsRef` → at first inbound audio chunk
- `interruptDetectedMsRef` → at server-content `interrupted` signal

Emitted events: `session_start_latency_ms`, `first_audio_received_latency_ms`,
`interrupt_server_latency_ms`.
