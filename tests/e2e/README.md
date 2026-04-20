# Mobile E2E Test Plan — v1 Alpha

**Scope:** Detox happy-path + safety-block + COPPA-gate + flag-off paths on iOS 15 + Pixel 7. Maestro smoke as cross-check.
**Owning task:** `task-v1-alpha-e2e-happy-safety`.
**Parent plan:** [`.omc/plans/mobile-v1-internal-alpha-speech-ai.md §8`](../../../.omc/plans/mobile-v1-internal-alpha-speech-ai.md).

---

## 1. Goals

Verify end-to-end behaviour of the consumer v1 surface under real network + real simulator/emulator conditions:

1. **Happy path** — child opens app, logs in, enters RobotScreen, completes a 3-turn English conversation, disconnects cleanly.
2. **Safety block** — a canary blocklist term causes mobile to suppress the outbound Gemini message, play fallback audio, and emit telemetry.
3. **COPPA gate** — a child without consent is blocked from entering RobotScreen.
4. **Feature flag off** — a build without `EXPO_PUBLIC_V1_ROBOT` routes home to legacy `InteractionScreen`; RobotScreen is absent.
5. **Runtime kill switch** — with flag on but backend `v1_robot_enabled_remote=false`, RobotScreen entry is disabled.

## 2. Out of goals

- Audio fidelity tests (human ears are the judge; automated check limited to "audio chunks arrived").
- Absolute latency SLA — covered by AC-4 instrumented sessions, not by E2E.
- Real Gemini audio content — E2E uses a mocked WSS endpoint that echoes prewritten transcripts; real-Gemini is manual QA.

## 3. Device + network matrix

| Platform | Device | Network | Priority |
|---|---|---|---|
| iOS | iPhone 15 simulator (Xcode 15, iOS 17) | host wifi | P0 |
| Android | Pixel 7 emulator (API 34) | host wifi | P0 |
| iOS | iPhone 15 simulator | throttled (slow-3G via Link Conditioner) | P1 |
| Android | Pixel 7 emulator | throttled (10 kbps via adb) | P1 |

P0 runs on every PR. P1 runs nightly on main.

## 4. Scenarios

### 4.1 S-01 — Happy path

```
GIVEN the app is built with EXPO_PUBLIC_V1_ROBOT=true
  AND backend staging is up
  AND a seeded parent+child with COPPA consent granted
WHEN the parent logs in
  AND selects the child profile
  AND taps "Talk to TBOT"
THEN RobotScreen loads within 2 s
  AND the robot avatar is in IDLE_BREATHING expression
WHEN the child taps-and-holds, says "hi"
THEN within 2.5 s first audio chunk arrives (instrumented; E2E only asserts ≤ 5 s)
  AND the robot transitions IDLE → LISTENING → THINKING → SPEAKING
  AND a transcript chunk is POSTed to /v1/live/transcript-sink with valid X-Session-Mac
WHEN the child completes 3 turns
  AND taps "Bye TBOT"
THEN WSS closes cleanly
  AND live_session_duration_ms is emitted
  AND no async timers remain (Jest --detectOpenHandles, post-test)
```

### 4.2 S-02 — Safety block (input)

```
GIVEN the happy-path setup
WHEN the child says a canary-blocklist term from tests/fixtures/canary-input.txt
THEN mobile does NOT send audio to Gemini (network spy asserts)
  AND fallback audio "Let's talk about something else!" plays
  AND safety_block_event {side:"input"} is emitted with termSha256, not plaintext
  AND the session continues (not terminated)
```

### 4.3 S-03 — Safety block (output)

```
GIVEN a mocked WSS that streams a prewritten transcript containing a canary term
WHEN the transcript span is received
THEN audio chunks for that turn are dropped before playback
  AND fallback audio plays
  AND safety_block_event {side:"output"} is emitted
  AND the session continues
```

### 4.4 S-04 — COPPA gate

```
GIVEN a child profile with coppaConsentStatus != "granted"
WHEN parent taps "Talk to TBOT"
THEN RobotScreen is NOT entered
  AND app navigates to CoppaConsentScreen
  AND coppa_gate_blocked telemetry is emitted
```

### 4.5 S-05 — Feature flag off (build-time)

```
GIVEN the app is rebuilt with EXPO_PUBLIC_V1_ROBOT unset
WHEN parent logs in and taps the home tab
THEN legacy InteractionScreen appears
  AND navigation does NOT include a route named "RobotScreen"
  AND no /v1/live/ephemeral-token call is made
```

### 4.6 S-06 — Runtime kill switch (runtime)

```
GIVEN app built with EXPO_PUBLIC_V1_ROBOT=true
  AND backend config has v1_robot_enabled_remote=false
WHEN parent opens the app (cold start)
THEN /v1/config returns v1_robot_enabled_remote=false
  AND the home tab falls back to legacy InteractionScreen OR shows "TBOT is resting" UI
  AND no /v1/live/ephemeral-token call is made
```

## 5. Pass criteria

- All S-01..S-06 pass on both P0 platforms in a single CI run.
- Runtime ≤ 6 min per platform per full suite.
- Flake rate: 0 failures across 10 consecutive runs of the same build. If a test flakes, it is quarantined (tagged `@flaky`) and a task filed before merge.

## 6. Infrastructure

- **Detox** for iOS + Android simulator/emulator. Config at `tbot-mobile/.detoxrc.js`.
- **Maestro** smoke against a TestFlight build on one physical iOS device. Config at `tbot-mobile/.maestro/`.
- **Network spy** — local MITM proxy run by the Detox test harness (`tbot-mobile/tests/e2e/network-spy.ts`) to assert which outbound calls fired.
- **Mocked Gemini WSS** — a fake WS server in the test harness that replays prewritten transcripts. Activated by `EXPO_PUBLIC_GEMINI_WSS_URL=ws://localhost:9901` at build time.

## 7. Fixtures

- `tests/fixtures/canary-input.txt` — 10 utterances, one per blocklist category + benign control.
- `tests/fixtures/mock-gemini-scripts/<themeId>/*.json` — prewritten model transcripts keyed by theme.
- `tests/fixtures/coppa-states.json` — child-profile seeds with various `coppaConsentStatus` values.

## 8. CI integration

- GitHub Actions job `mobile-e2e` runs on PR against `tbot-mobile/src/**` or `tbot-mobile/tests/e2e/**` changes.
- Artifacts: Detox screenshots, logcat (Android), xcodebuild output (iOS), mocked WS transcript. Retained 30 days.
- Required status check before merge to `main` (enforced by branch protection).

## 9. References

- [AC-4..AC-12 in plan §6](../../../.omc/plans/mobile-v1-internal-alpha-speech-ai.md)
- [Gate G3 criteria](../../../.omc/plans/mobile-v1-internal-alpha-speech-ai.md)
- [Safety shim README](../../src/ai/safety/README.md)
- [Verification matrix template](../../../docs/qa/templates/) (pending)
