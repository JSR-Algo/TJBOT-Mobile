# QA Checklist — Gemini Live Stability + Barge-in (iPhone)

**Date:** 2026-05-21
**Source plan:** [gemini-live-stability-and-bargein.md](../plans/gemini-live-stability-and-bargein.md)
**Target device:** iPhone (real hardware only — no simulator acceptance)
**Networks:** Wi-Fi 5GHz | LTE via Network Link Conditioner ("LTE" preset: 50 Mbps down, 50 ms RTT, 1% loss)

---

## Setup

### Required environment variables

```
EXPO_PUBLIC_VOICE_TEST_HARNESS=true        # always required
```

Cluster B recovery test only:
```
EXPO_PUBLIC_VOICE_CANCEL_UNACK_RECOVERY=true
```

### AEC fallback test (Run 5 only)

Temporarily add the test iPhone's model identifier to `aecBlocklist` in:
`ios/TbotMobile/VoiceMic/VoiceMicModule.swift:68`

Revert this change before any user-facing build. Do NOT ship to production.
Alternatively gate with `EXPO_PUBLIC_VOICE_FORCE_AEC_OFF=true` if the env knob exists.

### Telemetry capture

Start a tail of POST events before each run:
```
# Replace <host> with your dev server address
curl -N -s <host>/v1/qa/voice-events | tee /tmp/qa-run-<N>.ndjson
```

### Native logs

Attach Console.app to the iPhone before each run. Filter by subsystem `com.tjbot.mobile`.

---

## Run 1 — Wi-Fi 10-turn Stability

**ACs:** AC-A1, AC-A3, AC-A4

**Preconditions:**
- iPhone on 5GHz Wi-Fi (no Network Link Conditioner active)
- Fresh app launch (kill + relaunch)
- Telemetry tail running
- Console.app attached

**Steps:**
1. Launch the app. Confirm session start event appears in telemetry.
2. Conduct 10 conversational turns, alternating short queries (~5 words) and long queries (~20 words).
3. Allow each turn to complete fully before starting the next (no barge-in during this run).
4. After 10 turns, stop and export the telemetry NDJSON.

**Events to capture:**
- `voice.assistant_turn.interrupted_timeout` — must be zero
- `voice.barge_in.budget_exhausted` — must be zero
- `provider.live_disconnected` — must be zero (except user-tapped end)
- `first_audio_received_latency_ms` — capture all values, compute p50 + p99
- `session_start_latency_ms` — capture all values, compute p50 + p99

**Pass thresholds:**
- AC-A1: zero `assistant_turn.interrupted_timeout`, zero unintended `RECONNECTING` transitions
- AC-A3: `first_audio_received_latency_ms` p50 ≤ 600 ms, p99 ≤ 1200 ms
- AC-A4: `session_start_latency_ms` p50 ≤ 800 ms, p99 ≤ 1500 ms

---

## Run 2 — LTE 10-turn Stability

**ACs:** AC-A2

**Preconditions:**
- Network Link Conditioner enabled with "LTE" preset (50 Mbps down, 50 ms RTT, 1% loss)
- Fresh app launch
- Telemetry tail running
- Console.app attached

**Steps:**
1. Enable Network Link Conditioner on iPhone: Settings > Developer > Network Link Conditioner > LTE.
2. Launch the app. Confirm session start event.
3. Conduct 10 conversational turns (same alternating short/long pattern as Run 1).
4. Allow each turn to complete fully. Note any reconnects in Console.app or telemetry.
5. Export telemetry NDJSON. Disable Network Link Conditioner after run.

**Events to capture:**
- `provider.live_disconnected` — count reconnect events
- Any `ASSISTANT_SPEAKING` state duration > 10 s past last audio chunk
- `voice.barge_in.budget_exhausted`

**Pass thresholds:**
- AC-A2: ≤ 1 reconnect across 10 turns; no stuck `ASSISTANT_SPEAKING` state > 10 s past last audio chunk

---

## Run 3 — Tap-interrupt × 50

**ACs:** AC-B1, AC-C2

**Preconditions:**
- iPhone on 5GHz Wi-Fi
- Fresh app launch
- Telemetry tail running
- Console.app attached
- Clock or stopwatch ready for manual latency spot-checks

**Steps:**
1. Start a long-form query (ask for a 2-minute explanation of any topic).
2. Once assistant audio begins, tap the interrupt button at approximately 1 s into the response.
3. Record: time from tap to `onPlaybackFinish` callback (visible in telemetry as `voice.barge_in.interrupt_to_listen_ms`).
4. Wait for app to return to `LISTENING` state. Then follow up with speech within 2 s.
5. Record: time from tap to first user audio chunk uplinked.
6. Repeat steps 1–5 for 50 trials (vary tap timing: 1 s, 3 s, 5 s, 8 s into response, cycling).

**Events to capture:**
- `voice.barge_in.interrupt_to_listen_ms` — all 50 values, compute p95
- `onPlaybackFinish` callback timing relative to `interruptPlayback()` invocation (< 150 ms)
- Total dead time: `interruptPlayback` → first user audio chunk uplinked

**Pass thresholds:**
- AC-B1: playback stops within 150 ms of `interruptPlayback()` invocation. ≥ 48/50 trials pass.
- AC-C2: tap-interrupt with follow-up speech within 2 s — total dead time ≤ 800 ms p95.

---

## Run 4 — Speak-interrupt × 50

**ACs:** AC-B2, AC-B3, AC-C1

**Preconditions:**
- iPhone on 5GHz Wi-Fi
- Fresh app launch
- Telemetry tail running
- Console.app attached
- `EXPO_PUBLIC_VOICE_CANCEL_UNACK_RECOVERY=true` set (for AC-B3 measurement)

**Steps:**
1. Start a long-form query.
2. Once assistant audio begins, wait ~2 s, then speak a short 3-word query (e.g., "What is that?").
3. Observe in telemetry:
   - `voiceMicVadStart` event timestamp
   - Time to `ASSISTANT_SPEAKING` → `INTERRUPTED` transition
   - Time to FSM reaching `USER_SPEAKING`
   - Whether `voice.barge_in.cancel_unacked` fires (server didn't ACK within 600 ms)
4. Allow the turn to complete. Repeat for 50 trials.

**Events to capture:**
- `voiceMicVadStart` timestamp
- `voice.barge_in.interrupt_to_listen_ms` (source = 'server_interrupted')
- `voice.barge_in.cancel_unacked` — count across 50 trials
- `voice.barge_in.cancel_unacked.recovery_close` (if recovery flag enabled)

**Pass thresholds:**
- AC-B2: playback stops within 400 ms of `voiceMicVadStart` event. ≥ 47/50 trials pass.
- AC-B3: `voice.barge_in.cancel_unacked` rate < 5% across 50 speak-interrupts (≤ 2 events).
- AC-C1: time from `voiceMicVadStart` → FSM reaches `USER_SPEAKING` ≤ 500 ms p95.

---

## Run 5 — AEC Fallback (Forced via Blocklist)

**ACs:** AC-B4

**Preconditions:**
- Current iPhone model identifier added to `aecBlocklist` in `VoiceMicModule.swift:68`
- App rebuilt and installed on iPhone
- Telemetry tail running
- Console.app attached
- This run uses Wi-Fi only

**Steps:**
1. Launch the app. The native AEC attach will fail for this device.
2. Confirm in Console.app that the native AEC attach failure log appears.
3. Conduct 3 conversational turns.
4. Check telemetry for `voice.aec.attach_failed` event with a `reason` field.
5. Verify the app continues operating (no crash, no FSM hang after 3 turns).
6. After run: revert the `aecBlocklist` change in `VoiceMicModule.swift`. Rebuild and reinstall.

**Events to capture:**
- `voice.aec.attach_failed` — must appear with non-empty `reason`
- Any crash reports or FSM hang (stuck state > 30 s)

**Pass thresholds:**
- AC-B4: app continues running, `voice.aec.attach_failed` telemetry emitted, no crash, no FSM hang. 3/3 turns complete.

---

## Results Table

Operator fills in during / after runs.

| AC ID | Target | Measured | Pass/Fail | Notes |
|-------|--------|----------|-----------|-------|
| AC-A1 | 0 `interrupted_timeout`, 0 unintended `RECONNECTING` | | | |
| AC-A2 | ≤ 1 reconnect, no stuck `ASSISTANT_SPEAKING` > 10 s | | | |
| AC-A3 | `first_audio_received_latency_ms` p50 ≤ 600 ms, p99 ≤ 1200 ms | | | |
| AC-A4 | `session_start_latency_ms` p50 ≤ 800 ms, p99 ≤ 1500 ms | | | |
| AC-A5 | 0 `chunk.dropped_barge_in` on non-barge-in turns | | | |
| AC-B1 | Playback stops ≤ 150 ms of `interruptPlayback()`. ≥ 48/50 pass | | | |
| AC-B2 | Playback stops ≤ 400 ms of `voiceMicVadStart`. ≥ 47/50 pass | | | |
| AC-B3 | `cancel_unacked` rate < 5% (≤ 2/50) | | | |
| AC-B4 | App runs, `voice.aec.attach_failed` emitted, no crash/hang | | | |
| AC-B5 | `pendingUserTurnIdAfterClearRef` consumed ≤ 800 ms, FSM → `USER_SPEAKING` | | | |
| AC-C1 | `voiceMicVadStart` → `USER_SPEAKING` ≤ 500 ms p95 | | | |
| AC-C2 | Tap-interrupt + follow-up speech dead time ≤ 800 ms p95 | | | |
| AC-C3 | WS close + reconnect within `VOICE_BARGE_IN_BUDGET_MS` + 1500 ms | | | |
| AC-C4 | `voice.barge_in.interrupt_to_listen_ms` emitted on every `INTERRUPTED` exit | | | |

---

## Sign-off

| Field | Value |
|-------|-------|
| Operator name | |
| Date | |
| Build SHA | |
| iPhone model | |
| iOS version | |
| Overall verdict | PASS / FAIL |

Overall verdict is PASS only if all AC-A*, AC-B*, and AC-C* rows are marked Pass.
