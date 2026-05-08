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

Canonical states: `IDLE → REQUESTING_MIC_PERMISSION → CONNECTING →
LISTENING → STREAMING_INPUT → WAITING_AI → PLAYING_AI_AUDIO → INTERRUPTED
→ (LISTENING | STREAMING_INPUT) …`. Error / recovery:
- `RECONNECTING` reachable from every active state (A5, 2026-04-24).
- `ERROR` ↔ `IDLE` auto-reset at 5 s (A3, reverted from 60 s debug value).

### Audio path (iOS)

- Capture: RNLAS (`react-native-live-audio-stream`) today; native
  `VoiceMicModule` gated off pending A1 root-cause. PCM 16 kHz Int16 mono,
  streamed via `session.sendRealtimeInput({audio: {data: base64, mimeType}})`.
- Playback: native `PcmStreamModule` (`ios/TbotMobile/PcmStream/`). 24 kHz
  Float32 mono via `AVAudioEngine` + `AVAudioPlayerNode` on the shared
  `SharedVoiceEngine`. 50 ms jitter buffer (B4, 2026-04-24, configurable
  via UserDefaults `voicePlaybackJitterBufferMs`).
- `AVAudioSession` config: `.playAndRecord` + `.default` mode + `[.allowBluetooth,
  .allowBluetoothA2DP, .defaultToSpeaker]`. `.voiceChat` mode is NOT SAFE on
  iOS 18.7.7 per B1 spike verdict (ADR mb-native-voice-003).
- HW AEC: capture-side only via `inputNode.setVoiceProcessingEnabled(true)`.

### Telemetry (AC 2.1/2.4/2.5 evidence)

In-memory timestamps stamped at specific hook sites (A7, 2026-04-24):
- `sessionRequestStartMsRef` → at `POST /gemini/token` call
- `sessionWsOpenMsRef` → at Live API `onopen`
- `firstAudioAtMsRef` → at first inbound audio chunk
- `interruptDetectedMsRef` → at server-content `interrupted` signal

Emitted events: `session_start_latency_ms`, `first_audio_received_latency_ms`,
`interrupt_server_latency_ms`.
