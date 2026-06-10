# Plan: Gemini Live — Stable Responses + Reliable Barge-in (iOS focus)

**Date:** 2026-05-21
**Owner:** TJBOT-Mobile voice pipeline
**Mode:** Direct plan (RALPLAN skipped per user)
**Target devices:** iPhone real hardware (no Android scope, no simulator-only acceptance)
**Branch state at planning time:** uncommitted FSM v2 + barge-in stabilization diff present (see `git diff HEAD`)

---

## 1. Requirements Summary

User goal (verbatim, VN): *"Tôi muốn google api live phản hồi ổn định cho tôi, tôi có thể ngắt ngang."*

Translated to engineering scope, three symptom clusters MUST all improve:

| Cluster | Symptom | Today's fragile area |
|---|---|---|
| **A. Stability** | Gemini turns dropout / stuck / never finish | `serverContent.interrupted` race, goAway reconnect, PcmStream stuck-state, jitter buffer under poor network |
| **B. Barge-in correctness** | User interrupts but AI keeps speaking | `activityHandling` field disabled (SDK rejects), `cancel_unacked` is telemetry-only with no recovery, missing JS subscriber for `voiceAecAttachFailed` |
| **C. Dead-time** | After interrupt, app silent 1–5 s before listening again | `VOICE_BARGE_IN_BUDGET_MS` = 5000ms full wait when user taps but doesn't speak, `INTERRUPTED → LISTENING` transition gated on native clear() promise |

In-scope: TS hook `src/hooks/useGeminiConversation.ts`, native iOS modules (`VoiceMicModule`, `PcmStreamModule`, `VoiceSessionModule`, `SharedVoiceEngine`), `src/native/VoiceMic.ts`, `src/config.ts`, telemetry, P0 test suite.

Out-of-scope (this plan): Android-specific tuning, server-side prompt changes (`suka-prompt.ts` already in diff — leave as is), web wrapper, new UI affordances.

---

## 2. Acceptance Criteria (testable on iPhone hardware)

All thresholds measured from existing telemetry events (`track(...)` calls). Tests run on iPhone connected to dev menu, telemetry captured to `/v1/qa/voice-events` when `EXPO_PUBLIC_VOICE_TEST_HARNESS=true`.

### Cluster A — Stability
- **AC-A1** ≥ 10 consecutive Gemini turns on iPhone over 5GHz Wi-Fi with **zero** `voice.assistant_turn.interrupted_timeout` and **zero** unintended `RECONNECTING` transitions (i.e. no `voice.barge_in.budget_exhausted` and no `provider`→`live_disconnected` other than user-tapped end).
- **AC-A2** Same 10-turn run under Network Link Conditioner = "LTE" (downlink 50 Mbps, 50 ms RTT, 1% loss) completes with ≤ 1 reconnect and **no** stuck `ASSISTANT_SPEAKING` state >10 s past last audio chunk.
- **AC-A3** `first_audio_received_latency_ms` p50 ≤ 600 ms, p99 ≤ 1200 ms over the Wi-Fi run (matches existing A7 AC 2.4 target at `useGeminiConversation.ts:498`).
- **AC-A4** `session_start_latency_ms` p50 ≤ 800 ms, p99 ≤ 1500 ms (existing A7 AC 2.1 target at `useGeminiConversation.ts:474`).
- **AC-A5** No `playback`→`voice.assistant.chunk.dropped_barge_in` events on turns where no barge-in occurred (sanity: stale-window gate is not firing spuriously).

### Cluster B — Barge-in correctness
- **AC-B1** **Tap-to-interrupt** during `ASSISTANT_SPEAKING`: playback stops within **150 ms** of `interruptPlayback()` invocation (measured from JS call to `onPlaybackFinish` callback). 50 trials, ≥ 48/50 pass.
- **AC-B2** **Speak-to-interrupt** during `ASSISTANT_SPEAKING`: playback stops within **400 ms** of native `voiceMicVadStart` event. 50 trials, ≥ 47/50 pass.
- **AC-B3** `voice.barge_in.cancel_unacked` rate < 5% across 50 speak-interrupts on Wi-Fi (server `serverContent.interrupted` arrives within 600 ms).
- **AC-B4** Forced AEC attach failure (iPhone model temporarily added to `aecBlocklist` in `VoiceMicModule.swift:68`): app continues running, JS-side log breadcrumb `voice.aec.attach_failed` emitted, no crash, no FSM hang. Currently the native event has no JS subscriber.
- **AC-B5** B-then-A race (VAD fires before native `clear()` promise resolves): `pendingUserTurnIdAfterClearRef` is consumed within 800 ms and FSM reaches `USER_SPEAKING`. Verified via static assertion + at least one manual scripted reproduction.

### Cluster C — Dead-time
- **AC-C1** **Speak-interrupt** path: time from `voiceMicVadStart` → FSM reaches `USER_SPEAKING` ≤ **500 ms** p95.
- **AC-C2** **Tap-interrupt with follow-up speech** within 2 s: total dead time (interruptPlayback → first user audio chunk uplinked) ≤ **800 ms** p95.
- **AC-C3** **Tap-interrupt with NO follow-up speech**: WS close + reconnect completes within `VOICE_BARGE_IN_BUDGET_MS` + 1500 ms. Today's default budget = 5000 ms (`src/config.ts:54`). Plan does NOT reduce this default in code (token blast-radius cap), but adds a new env knob to allow staging override and documents the calibration window.
- **AC-C4** New telemetry `voice.barge_in.interrupt_to_listen_ms` is emitted on every `INTERRUPTED → LISTENING` or `INTERRUPTED → USER_SPEAKING` transition.

### Quality gates
- **AC-Q1** All existing assertions in `tests/hooks/useGeminiConversation-p0.test.ts` continue to pass.
- **AC-Q2** New tests added (see §4 step 5) covering cancel-unack recovery, AEC fallback subscriber, interrupt-to-listen telemetry.
- **AC-Q3** TypeScript compile clean, no new ESLint warnings introduced.

---

## 3. Risks and Mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Converting `cancel_unacked` from telemetry-only to forced reconnect causes unnecessary reconnect storms when server is just slow | M | H | Gate behind env flag `EXPO_PUBLIC_VOICE_CANCEL_UNACK_RECOVERY=true`; default OFF; emit dedicated `voice.barge_in.cancel_unacked.recovery_close` for tracking; only fire if FSM still in `ASSISTANT_SPEAKING` and VAD ongoing |
| R2 | Re-enabling `realtimeInputConfig.activityHandling` re-triggers the 2026-04-23 "Lỗi kết nối Gemini" regression noted at `useGeminiConversation.ts:448-455` | H | H | **Do NOT re-enable** the field. Leave default behavior. Plan is explicit: rely on START_OF_ACTIVITY_INTERRUPTS default. |
| R3 | Adding new VAD subscribers worsens the multi-listener race already mitigated by P0-22 | M | M | Centralize via existing subscription pattern; never add a new `VoiceMic.onVadStart()` listener inside a useEffect without a matching cleanup. Add a unit-static assertion that the number of `onVadStart` call sites is ≤ 4 (current count). |
| R4 | iPhone AEC blocklist test temporarily ships to a real device → echo loop during testing | L | M | Only enable the blocklist override behind `EXPO_PUBLIC_VOICE_FORCE_AEC_OFF=true`; revert before any user-facing build |
| R5 | 200 ms jitter buffer on excellent Wi-Fi adds perceptible latency to first audio | L | M | Telemetry already captures `first_audio_received_latency_ms` (AC-A3). If p50 regresses >100 ms vs prior baseline, add adaptive shrink path in a follow-up (out of scope here). |
| R6 | Static-assertion test style (grep-based) cannot catch runtime ordering bugs | M | M | Add at least 2 integration-style scenarios manually scripted in QA section; document them in `.omc/plans/qa-checklist-gemini-live.md` for repeat runs |

---

## 4. Implementation Steps

Steps are ordered by dependency. Each step has a single concrete code touchpoint.

### Step 1 — Wire JS subscriber for `voiceAecAttachFailed`
**Why:** Native event already emitted at `VoiceMicModule.swift:225,261` but no JS listener exists. AEC attach failures are currently invisible.

**Files:**
- `src/native/VoiceMic.ts` — add `onAecAttachFailed(cb)` API mirroring `onVadStart` pattern (event name `voiceAecAttachFailed`).
- `src/hooks/useGeminiConversation.ts` — add a top-level useEffect that subscribes once on mount, calls `track('voice', 'voice.aec.attach_failed', { reason })` + `jsErrorBreadcrumb('voice.aec.attach_failed', reason)`. No FSM transition.

**Verification:** Toggle blocklist override env, launch app, confirm telemetry in `/v1/qa/voice-events`.

### Step 2 — Convert `cancel_unacked` watchdog to opt-in recovery
**Why:** Today the 600 ms watchdog at `useGeminiConversation.ts:1046-1055` is observability-only. When server never sends `serverContent.interrupted`, user hears AI keep speaking until the 5 s budget watchdog fires (AC-B3 / Cluster B failure mode).

**Files:**
- `src/config.ts` — add `VOICE_CANCEL_UNACK_RECOVERY: ENV.EXPO_PUBLIC_VOICE_CANCEL_UNACK_RECOVERY === 'true'` (default `false`).
- `src/__env__.ts` — add `EXPO_PUBLIC_VOICE_CANCEL_UNACK_RECOVERY: ""`.
- `src/hooks/useGeminiConversation.ts:1046-1055` — inside the existing watchdog firing block, when `Config.VOICE_CANCEL_UNACK_RECOVERY === true` AND `store.getState().state === 'ASSISTANT_SPEAKING'`:
  1. Emit new telemetry `voice.barge_in.cancel_unacked.recovery_close` with `responseId` and `deadline_ms`.
  2. Add session to `suppressedCloseSessionIdsRef` (same pattern as line ~1088).
  3. Call `sessionRef.current?.close?.()`.
  4. Transition `RECONNECTING` and `queueMicrotask(() => reconnectRef.current?.())` (mirrors `useGeminiConversation.ts:1101-1102`).

**Verification:** Set env flag in QA build, simulate by forcing server to omit `interrupted` (manual override possible only via mocked SDK; otherwise verify in staging).

### Step 3 — Add `interrupt_to_listen_ms` telemetry
**Why:** AC-C1 / AC-C4 need a directly measurable dead-time metric. Today we only have `voice.barge_in.budget_exhausted` (5 s timeout case) and `voice.barge_in.user_resumed` (happy path), neither of which gives a clean latency number for the post-interrupt resume.

**Files:**
- `src/hooks/useGeminiConversation.ts` — add a new ref `interruptedAtMsRef`. Stamp it on every transition into `INTERRUPTED`. On the next transition out of `INTERRUPTED` (to `LISTENING` or `USER_SPEAKING`), emit `voice.barge_in.interrupt_to_listen_ms` with `{ ms, destination_state, source: 'tap' | 'server_interrupted' }` and clear the ref.

**Verification:** Trigger 5 tap-interrupts and 5 speak-interrupts on iPhone; confirm 10 events with reasonable values appear in telemetry.

### Step 4 — Robustness verification of existing FSM guards (no code change)
**Why:** The uncommitted diff already adds `suppressedCloseSessionIdsRef`, `isCurrentSession()` callback guards, `_stopAudioCapture()` in onclose, and jitter buffer 200 ms. These need a deliberate stress run before claiming AC-A.

**Files (read-only inspection + manual stress):**
- `useGeminiConversation.ts:88` `suppressedCloseSessionIdsRef`
- `useGeminiConversation.ts:464,481,700,703` `isCurrentSession()` guards
- `useGeminiConversation.ts:739-740` `_stopAudioCapture` + `playbackRef.interrupt` on close
- `PcmStreamModule.swift:56` jitterBufferDefaultMs = 200
- `SharedVoiceEngine.swift:137` `stopIfIdleForReconfigure()`

**Verification:** 10-turn Wi-Fi + 10-turn LTE runs per AC-A1 / AC-A2.

### Step 5 — Test suite extensions
**Why:** AC-Q2 requires new assertions for steps 1–3.

**Files:**
- `tests/hooks/useGeminiConversation-p0.test.ts` — add static assertions:
  - **AEC-1** assert `src/hooks/useGeminiConversation.ts` contains `VoiceMic.onAecAttachFailed(`
  - **CANCEL-RECOVERY-1** assert `src/config.ts` contains `VOICE_CANCEL_UNACK_RECOVERY`
  - **CANCEL-RECOVERY-2** assert `useGeminiConversation.ts` references `voice.barge_in.cancel_unacked.recovery_close`
  - **DEAD-TIME-1** assert `useGeminiConversation.ts` references `voice.barge_in.interrupt_to_listen_ms`
- `tests/native/VoiceMic-events.test.ts` (create if missing) — assert `voiceAecAttachFailed` is in the supported event list.

### Step 6 — QA checklist file (operator-facing)
**Why:** AC-Q runs are manual on iPhone. Operator needs a repeatable script.

**Files:**
- Create `.omc/plans/qa-checklist-gemini-live.md` with the 5 test runs (Wi-Fi stability, LTE stability, 50 tap-interrupts, 50 speak-interrupts, AEC fallback) and a results table template.

---

## 5. Verification Steps (operator script)

Each run requires `EXPO_PUBLIC_VOICE_TEST_HARNESS=true` and an iPhone with Console.app attached. Record telemetry CSV from `/v1/qa/voice-events`.

1. **Wi-Fi 10-turn stability** — fresh app launch on 5GHz Wi-Fi → 10 conversational turns (1 short + 1 long, alternating) → assert AC-A1, AC-A3, AC-A4.
2. **LTE 10-turn stability** — Network Link Conditioner = "LTE" → 10 turns → assert AC-A2.
3. **Tap-interrupt × 50** — start a long-form answer, tap interrupt button at 1 s, 3 s, 5 s, 8 s into the response; record `voice.barge_in.interrupt_to_listen_ms` and timestamp delta to `onPlaybackFinish` → assert AC-B1, AC-C2.
4. **Speak-interrupt × 50** — start a long-form answer, speak a 3-word query at 2 s into the response → assert AC-B2, AC-B3, AC-C1.
5. **AEC fallback** — add current iPhone model to `aecBlocklist` (temporary), launch, run 3 turns → assert AC-B4, telemetry `voice.aec.attach_failed` emitted.

Each AC is signed off in `.omc/plans/qa-checklist-gemini-live.md`.

---

## 6. Out-of-Scope / Deferred

| Item | Why deferred |
|---|---|
| Re-enabling `realtimeInputConfig.activityHandling` field | Known regression 2026-04-23 (`useGeminiConversation.ts:448-455`); requires SDK upgrade investigation. |
| Adaptive jitter buffer (shrink to 50 ms on strong Wi-Fi) | First confirm AC-A3 isn't regressed by static 200 ms; if regression observed, open follow-up. |
| Reducing `VOICE_BARGE_IN_BUDGET_MS` default below 5000 ms | Needs staging telemetry per `src/config.ts:48-53` calibration plan; reducing without data risks cutting off slow speakers. |
| Android parity | User scoped iOS only for this plan. |
| Server-side `suka-prompt.ts` review | Already adjusted in uncommitted diff; not a stability lever. |

---

## 7. Step Sequencing & Rough Effort

| Step | Estimated effort | Blockers |
|---|---|---|
| 1. AEC subscriber | ~30 min | none |
| 2. cancel_unack recovery | ~45 min | env knob plumbing |
| 3. interrupt_to_listen telemetry | ~30 min | none |
| 4. Stability stress verification | ~60 min on device | needs iPhone + Network Link Conditioner |
| 5. Test additions | ~30 min | steps 1–3 |
| 6. QA checklist file | ~15 min | none |

Coding steps 1–3 + 5 are safe to run via `/team` (parallel-friendly: distinct file touchpoints). Steps 4 and 6 are operator-driven. Total coding effort ≈ 2.5 h, total verification ≈ 1.5 h.

---

## 8. Next Action

Recommended execution path:

```
/oh-my-claudecode:ralph .omc/plans/gemini-live-stability-and-bargein.md
```

or, for parallel execution of the 4 coding steps:

```
/oh-my-claudecode:team .omc/plans/gemini-live-stability-and-bargein.md
```

After code lands, run the operator verification (§5) on a real iPhone before merging.
