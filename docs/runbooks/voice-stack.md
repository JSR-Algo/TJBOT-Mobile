# Voice stack runbook (sys-16)

Operational reference for the Gemini Live realtime voice stack: native
modules, event schema, failure signals, and incident response. Applies to
both Android (Kotlin) and iOS (Swift).

---

## Module map

| Module | Owner | Platform |
|---|---|---|
| `VoiceSessionModule` | `AVAudioSession` / `AudioManager.mode` | iOS + Android |
| `VoiceMicModule` | mic capture w/ HW AEC | iOS + Android (iOS live; Android pending MB-NATIVE-VOICE-006) |
| `PcmStreamModule` | PCM 24 kHz playback | iOS + Android |
| `SharedVoiceEngine` | single `AVAudioEngine` per app lifetime | iOS only |

JS consumers:

- `src/hooks/useGeminiConversation.ts` — orchestrates mic + playback + SDK.
- `src/observability/voice-telemetry.ts` — forwards native events to Sentry
  breadcrumbs (category `voice.session|route|mic|playback`).
- `src/native/voice-session-events.ts` — single source of truth for the
  event schema. Every native emit MUST match one of the discriminated
  union variants.

---

## Event schema

All events are JSON objects stamped with a single-line `[TbotVoice]` tag
on native logs and forwarded as Sentry breadcrumbs. See
`src/native/voice-session-events.ts` for the typed union.

### `voiceSessionStateChange`

Emitted by `VoiceSessionModule`.

```json
{ "event": "voiceSessionStateChange",
  "state": "active" | "transientLoss" | "lost" | "inactive",
  "reason": "<short enum>",
  "route": "speaker" | "earpiece" | "bluetooth" | "wired" | "none" }
```

Common reasons: `start`, `interruption_began`, `interruption_ended_shouldResume`,
`media_services_reset_recovered`, `foreground_resume`, `recover`,
`reactivate_failed`.

### `voiceRouteChange`

Emitted by `VoiceSessionModule`.

```json
{ "event": "voiceRouteChange",
  "route": "speaker" | "earpiece" | "bluetooth" | "wired" | "none",
  "deviceId": <int | -1>,
  "deviceName": "<string, possibly empty>",
  "changeReason": "<AVAudioSession.RouteChangeReason short name>" }
```

Common `changeReason` values: `newDeviceAvailable`, `oldDeviceUnavailable`,
`categoryChange`, `override`, `manual`, `routeConfigurationChange`.

### `voiceMicStalled`

Emitted by `VoiceMicModule`.

```json
{ "event": "voiceMicStalled",
  "lastFrameAgeMs": <number>,
  "fatal": <bool> }
```

Fires when the mic tap has delivered no PCM for `stallThresholdMs` (2000 ms).
First stall is non-fatal — the module attempts `engine.stop; engine.start;
installInputTap` recovery. Second consecutive stall (after recovery
attempt failed) is fatal.

### `voicePlaybackStalled`

Emitted by `PcmStreamModule`.

```json
{ "event": "voicePlaybackStalled",
  "bufferedMs": <number>,
  "framesSinceLastAdvance": <number> }
```

Fires when a turn is open, chunks are queued for playback, but
`playerNode.lastRenderTime` has not advanced over `stallThresholdMs`
(2000 ms). Usually signals HAL hang, media services reset mid-turn, or
a route change that invalidated the player node.

---

## Capturing native logs

### iOS (Console.app on Mac)

```
# Tag-based (both VoiceSession + VoiceMic + PcmStream)
log stream --process TbotMobile --predicate 'eventMessage CONTAINS "[TbotVoice]"'

# Subsystem-based (PcmStream-only structured os_log)
log stream --process TbotMobile --predicate 'subsystem == "com.tbot.voice"'
```

### Android (adb)

```
adb logcat -s TbotVoice:V PcmStream:V VoiceMic:V | tee /tmp/voice.log
```

Both platforms emit one line per event in the same shape, so `jq` +
cross-platform dashboards work without platform branching.

---

## Escape hatches (pre-mortem §7 of plan)

### R1 — iOS HW AEC makes AI playback quiet on specific devices

**Signal:** `voiceSessionStateChange { state: 'active' }` followed by
user complaints "can't hear Suka" from users on a specific `iPhone13,x`
model. Sentry aggregation: search breadcrumb `data.event ==
'voiceSessionStateChange'` grouped by device model.

**Containment:** Add the device model to
`VoiceMicModule.aecFallbackModels` and ship a patch release. No runtime
flag today; plan §6 R1 proposes a remote-config flag — deferred.

**Repair:** Before next release, A/B test a synthetic 200 ms test chunk
during session start. If output RMS below threshold, silently downgrade
to `.off` for this device and remember via `UserDefaults`.

### R2 — Android 14+ FG service killed by OEM battery optimizer

**Signal:** `voiceSessionStateChange { state: 'lost', reason:
'audio_focus_loss_permanent' }` after app goes to background on a
Xiaomi/MIUI device. `adb shell dumpsys activity services
com.tbot.app` shows no VoiceSessionService.

**Containment:** The MB-NATIVE-VOICE-005 Android FG service is declared
in AndroidManifest via the Expo config plugin; activate the plugin
via `app.json` `plugins` entry if not already activated.

**Repair:** Detect `Build.MANUFACTURER == "Xiaomi"` at session start;
display a "add to battery whitelist" banner (UI work, separate PR).

### R3 — App Store rejects `UIBackgroundModes = audio`

**Signal:** Apple resolution center rejection citing § 2.5.4 (audio
background mode without ongoing audio playback).

**Containment:** Appeal with a narrated 30 s screen recording showing
Gemini Live conversation continuing during screen lock — the legitimate
use case. Reference apps: Otter, AIKO, Krisp.

**Repair:** If appeal fails, ship without `audio` in `UIBackgroundModes`.
Mic auto-stops on screen lock. UX copy warns user before first session.
AC-3 (background-audio survives lock) downgrades to FAIL permanently.

### R4 — iOS native mic regression on a specific device

**Signal:** Session starts → `voiceMicStalled { fatal: true }` within
3 seconds. Transcript is empty for user turns. Only affects one device
model (discovered in Sentry aggregation).

**Containment:** Gate `VoiceMic` availability behind a runtime flag. In
`src/native/VoiceMic.ts`, add:
```ts
get isAvailable(): boolean {
  if (Platform.OS === 'ios' && isFlaggedOffForDevice()) return false;
  return Native != null;
}
```
This routes the affected device back to the legacy RNLAS path without
rebuild. Mechanism needs a remote-config plumbing (out of scope today).

**Repair:** Investigate the device's `inputNode.inputFormat(forBus:0)`
output on Sentry breadcrumb `voiceMicStalled.data.lastFrameAgeMs` logs.
Common root causes: Lightning/USB-C DAC without sample-rate negotiation,
BT HFP failure on `setPreferredInput`.

---

## Smoke procedure after any voice-stack change

1. Build on real iPhone: `cd tbot-mobile && npx expo run:ios --device`
2. Open Console.app, filter `TbotMobile` process + `[TbotVoice]`.
3. Tap mic in Gemini Conversation screen.
4. Speak "Xin chào": expect `voiceMicData` events logged (native), AI
   response plays audibly.
5. Barge-in mid-AI: tap mic again. Audio stops < 100 ms.
6. Lock screen during session: expect `app_background` log + audio
   continues 30 s+.
7. Check `[voice-native:smoke]` line in Console — all three modules
   should be `true` after Phase 5+.

---

## Known limitations (as of 2026-04-22)

- `VoiceMicModule` spike (AC-2 verification) is **deferred** — see
  `docs/adr/mb-native-voice-003-voice-processing-io.md`. AC-2 status:
  UNVERIFIED until XCTest runs on device.
- Android `VoiceMicModule` not yet shipped — Android still uses RNLAS
  until MB-NATIVE-VOICE-006 lands.
- Config plugin `modules/voice-native/` is **staged not activated** —
  `app.json` has no `plugins` entry. A future `expo prebuild --clean`
  would regenerate `ios/` and `android/` and wipe our handwritten
  permissions + `UIBackgroundModes`. Plugin activation is a separate
  future session (plan §9 Day 0 item b).
- XCTest target does not exist in `TbotMobile.xcodeproj` — Phase 2 spike
  cannot run until added.
