# Behavior-Signal & Lesson Infrastructure Inventory

**Date:** 2026-06-29
**Provenance note:** This file was hand-synthesized by the orchestrator from `deleg_1c149250`'s timeout report after that audit ran out of tool budget before writing. A retry (`deleg_a691e227`) was dispatched at 14:53 with instructions to *append* rather than overwrite, but it also timed out at 600s/30-API-calls without producing new content. The deliverable in this file is unchanged from the original synthesis — no `## Audit retry note` block was added because the retry added no materially different findings. If you wish to refresh this file, do so against the concrete file:line citations in §1–§7, not by re-dispatching a copy of the original audit.

**Date:** 2026-06-29
**Mode:** Read-only audit. No source files touched.
**Author:** research-signal-inventory (sys-17 design-research); preserved with corrections by the orchestrator after the auditor reported tool-budget exhaustion before write.
**Companion briefs already landed:** `attention-patterns-2026-06-29.md`, `vietnamese-elt-2026-06-29.md`, (engagement-pedagogy in flight).
**Coordination gate in force:** COORDINATION_REQUESTS.md 2026-05-26 row OPEN — Mobile→Backend lesson fetch / attempt-recording / safe-fallback / offline+source-validation contract unresolved.

This file answers: **what's already shipping, what's already plumbed but inert, what's blocked, what's not even started** — across signal emission, lesson content, lesson-session runtime, safety, tests, and PRDs.

---

## 1. Signal emission — three pipelines, none end-to-end

The mobile codebase records behavior observations through **three disjoint paths**. None currently round-trips to a server-side curriculum/PDF or parent-summary endpoint; the closest thing (`/v1/learning/children/:childId/session/today`) doesn't exist yet per the coordination row.

### 1a. Voice-stack telemetry → Sentry + `/qa/voice-events`
- `src/services/observability/voice-telemetry.ts:191` — unified `track(category, event, fields?)` dispatcher.
- Sentry breadcrumbs: lines 220–227.
- QA-mode POST to `/qa/voice-events`: line 138. Only fires when `EXPO_PUBLIC_VOICE_TEST_HARNESS === 'true'` (.env.example). Production release-mode reaches only Sentry.
- Sampling: `SAMPLE_RATE` 1-in-50 for `capture`, 1-in-25 for `playback` (line 47). Other categories emitted at full rate.
- Categories: `session, capture, playback, barge_in, provider, error` (line 37).
- Call-sites: >60 across `useGeminiConversation.ts`, `useGeminiAudioSession.ts`, `useGeminiTimers.ts`. Covers barge-in, VAD, AEC, session start/stop, latency.

### 1b. PostHog analytics — gated OFF when `role === 'child'`
- `src/services/observability/analytics.ts:63` — `trackEvent` exports.
- Child gate at lines 23, 37. When `currentRole === 'child'` PostHog receives nothing.
- Consequence: child-mode behavior is **invisible to product analytics**, including retention/engagement funnels. Only Sentry breadcrumbs remain.

### 1c. Safety blocklist events via `ctx.telemetry.emit`
- `src/services/ai/safety/blocklist.ts:43, 54, 71, 83` — `ctx.telemetry.emit('safety_block_event' | 'safety_shim_error', ...)`.
- Emits only hashed terms (`termSha256`), never plaintext (line 22 builds hex digest).
- Routes to TelemetryPort interface; in production the default port is Sentry.

### 1d. Local-only lesson progress (SecureStore)
- `src/features/lessonDemo/store/useLessonDemoProgressStore.ts:79, 89, 94` — `streakCount`, `completedLessonIds`, `attempts[]` (last 40) under SecureStore key `tbot_lesson_demo_progress`.
- **No network emission.** This is the data that *would* go to `/v1/learning/session/complete` if the lesson-shape contract existed; today it lives and dies on the device.

### 1e. XState lessonSession emits — local test spy only
- `src/state/machines/lessonSession.machine.ts:90–103` — `emitInterruptedAnalytics` writes `lastAnalyticsEvent` into XState context only.
- Production call sites don't subscribe to `lastAnalyticsEvent`, so emissions **go nowhere in production**. They exist purely to keep the test suite honest.

### 1f. Net effect for downstream work
The mobile emits per-frame voice telemetry (sampled) and per-event safety telemetry to Sentry. It does **not** emit a learning-progress event anywhere except into local SecureStore. Building a behavior-signal feature today means first picking a sink: extend Sentry breadcrumb schema, enable PostHog for child sessions (which has open-questions of its own — see §6 below), or wire `useLessonDemoProgressStore` to a new endpoint (which requires resolving the §3 coordination row first).

---

## 2. Curriculum content — 120 lesson fixtures + 4 curated

### 2a. The six-month lesson pack
- `src/features/lessonDemo/content/sixMonthLessonPack.ts` (327 lines) — top-level orchestrator.
- Imports 6 JSON fixtures under `src/features/lessonDemo/content/fixtures/lesson_objectives_weeks_{01_04,05_08,09_12,13_16,17_20,21_24}.json` — each a 20-lesson array → **120 lessons total**.
- Three age bands `4-6 | 7-9 | 10-11` (line 14).
- Lesson shape (per `src/features/lessonDemo/types.ts:49–69`):
  `{lessonId, week, day, ageBand, cefrLevel, objective, focusItems[], vietnameseL1Target, practiceMethod, reviewItems[], rewardEvent, parentSummary, steps[7], sourceCardIds[], fallbackLessonId?, media?}`
- Steps follow fixed 7-template: `warmup / teach / listen / repeat / choice / review / reward` (`types.ts:3–10`).

### 2b. Curated lessons
- `src/features/lessonDemo/content/curatedLegacyLessons.ts` (197 lines) — 4 hand-curated lessons:
  - `BARN_SAY_IT` (recent wave-0 build, see commit `d9b695d feat(lesson): voice-activated barn lesson with fullscreen video player`).
  - `HAPPY_SAD`, `RED_BLUE`, `CAT_DOG` (recent wave `bcd6763 feat(lesson): add happy-sad, red-blue, cat-dog curated lessons + picker`).
- Asset refs at lines 13–20: `require('../../../assets/lessons/barn-round-field.mp4')` etc. Local Metro bundle; **no CDN.**
- L1 Vietnamese target strings hard-coded inline at `sixMonthLessonPack.ts:74–85` (no i18n key). Other EN copy (`practice_method`, `learning_objective`) lives in JSON fixtures.

### 2c. Consequence for "more lessons" expansion
Adding a new lesson without a coordination-row resolution is a 12–16 hour authoring job (write a JSON fixture entry, write asset files, validate the 7-step shape, hand-tune Vietnamese L1 strings) — and the lesson **never round-trips**: the device-local progress stays on the device. A meaningful "more lessons" push needs both (a) authoring tooling for `curatedLegacyLessons` (currently only hand-editable) and (b) the contract unblock before any lesson session can produce parent-visible effects.

---

## 3. Lesson-session runtime — stubbed at the seam

### 3a. The seam is intentional, not an oversight
- `src/services/api/lesson-session.api.ts` (67 lines) defines five exported functions:
  - `startSession` — `src/services/api/lesson-session.api.ts:35` — `if (!FEATURE_LESSON_SESSION) throw new FeatureLessonSessionDisabledError('startSession')`; then `throw new Error('not implemented')` on line 38.
  - `endSession` — line 42/45: same gate-then-stub pattern.
  - `sendUtterance` — line 49/52: same.
  - `getActivityList` — line 56/59: same.
  - `reportSafetyEvent` — line 63/66: same.
- `FEATURE_LESSON_SESSION` is the master flag in `src/config/feature-flags.ts:72`.

This matches the 2026-05-26 coordination row exactly: those five endpoints are what Mobile asked Backend to define. Until that row closes, `FEATURE_LESSON_SESSION` is intentionally false and any code path that tries to invoke a real session throws cleanly.

### 3b. What's actually wired (and live)
- `src/services/api/learning.ts` — six functions that *do* hit `/v1/learning/...`:
  - `getTodaySession` — `GET /v1/learning/children/:childId/session/today` (line 116).
  - `saveInteraction` — line 121.
  - `getKPIs` — line 149.
  - `completeSession` — line 154.
  - `getPronunciationTrend` — line 165.
  - `getChildProfile` / `updateChildProfile` — for parental child-profile settings.
- Missing per `COORDINATION_REQUESTS.md 2026-05-26`:
  - dedicated `POST /v1/learning/lessons` fetch (or equivalent),
  - attempt-recording contract for STT + scoring,
  - safe-fallback lesson shape (per `ENGLISH_LEARNING.md §6`),
  - offline + source-validation handling.

### 3c. The XState machine itself is fully built
- `src/state/machines/lessonSession.machine.ts` (389 lines) — full XState v5:
  - Terminal states: `COMPLETED | TIMED_OUT | COST_CAPPED | PARENT_STOPPED | ABANDONED | ABANDONED_DISCONNECT | SAFETY_HALT` (lines 364–370; `SAFETY_HALT:364, TIMED_OUT:365, COST_CAPPED:366, PARENT_STOPPED:367, COMPLETED:368, ABANDONED:369, ABANDONED_DISCONNECT:370`).
  - `INTERRUPT` event accepts `{reason: 'bargein' | 'gentle_correction' | 'retry' | 'offtopic'}` (`types.ts:29–33`).
  - Context tracks `bargeinCount`, `turnsCount`, `costUsdCents`.
  - Three unimplemented service stubs at lines 152–164 call `services.startSession` / `services.endSession` / `services.reconnectSession`.
  - Currently driven by `noopLessonSessionServices` (`lessonSession.machine.ts:378`).

**The machine is built; the wire is missing.** Flip one flag (resolve the coordination row, fill in the five stubs with real `fetch(...)` calls), and the runtime comes alive.

---

## 4. Safety blocklist — substantive but integrity placeholder

- `src/services/ai/safety/blocklist.v1.json` — 6 categories: `violence, sexual, substance, self-harm, pii, prompt-injection`. 20+ PII regexes. `version: "v1.0.0"`, generated 2026-04-21.
- **`integritySha256` is `0000…0000`** (line 6 of the JSON).
- `src/services/ai/safety/blocklist.ts:25` — `return hex === data.integritySha256;` would be a real check, but the data's hash is zero.
- `validateIntegrity` (`blocklist.ts:30`) only checks `typeof === 'string' && length === 64` (line 33). It does not perform an SHA-256.
- Practical effect: every release ships with the placeholder so the *length* check passes but the *content* is unverifiable. Anyone editing `blocklist.v1.json` between releases is invisible to the runtime.

### 4a. Persona/branding surface
- `src/services/ai/safety/persona.ts` exports `AGE_BRACKET`, `ALLOWED_TOPICS_FOR_AGE`, `LESSON_VOCAB`, `LESSON_OPENER`, `EXPRESSION_SET` (14 items), `MOTION_SET` (12 items).
- Tuned only by JSON regex/keyword edits; no remote config.

### 4b. i18n gap
Fallback message in `blocklist.ts:99`: "I'm not allowed to talk about that. Let's practice English instead!"
- **No Vietnamese translation of this fallback** in either `vi.json` (locale dictionary) or blocklist data.
- Consequence: when a 6-year-old triggers a block on their device, the screen shows them an English sentence they may not parse. This is a known x-research finding of the vietnamese-elt brief (losing-face pattern).

---

## 5. Test coverage — adequate for plumbing, absent for the network seam

| Surface | Test files | Posture |
|---|---|---|
| `tests/features/lessonDemo/` | 9: `barnSayItLesson`, `companionVoicePrompt`, `curatedLegacyLessons`, `fullscreenLessonScene`, `lessonDemoProgressStore`, `LessonDemoScreens`, `lessonPickScreen`, `lessonScene`, `robotCompanionScreen`, `sixMonthLessonPack` | Fixture-driven; no network-test gap (correct, given the seam is inert). |
| `tests/features/lesson-session/` | 2: `lesson-hardware-back-wiring`, `use-lesson-hardware-back` | Hook-level coverage only. **No `lessonSession.machine.test.ts`** in the tree — meaning the XState transitions, terminal states, and event payloads are untested as discrete unit cases. |
| `tests/features/parent/` | 6: `course-insights`, `parent-history-screen`, `parent-session-context`, `parent-summary-screen`, `parent-today-screen`, `use-parent-gate-guard` | UI + hook coverage. **No telemetry assertion anywhere.** |
| `tests/api/learning-api.test.ts` | exists | Tests old `/v1/learning/children/...` surface. |
| `tests/api/lesson-assignment-api.test.ts` | exists | Assignment-edge correctness. |
| `tests/api/lesson-progress-normalization.test.ts` | exists | Progress serialization shape. |
| `tests/api/lesson-flow-edge-cases.test.ts` | exists | Edge-case but not network wiring. |
| `tests/api/lesson-session*.test.ts` | **does not exist.** | Cannot exist until the seam is real. |

The test posture is honest about the state of the seam — it's tested as a stub, not as a contract.

---

## 6. PRD coverage — what the iOS-reference audit reserves for lesson work

Source: `docs/audits/ios-reference-audit/tasks/registry.json` (35 tasks, top keys `version, source, tasks, notes`).

Lesson-/signal-relevant PRD statuses (verified inline):

| ID | Title | Status |
|---|---|---|
| T00 | Gemini Live voice ship/remove decision | **BLOCKED** |
| T16 | Wire lesson session screens to the lessonSessionMachine | NOT_STARTED |
| T20 | Implement the documented child-safety shim | **BLOCKED** |
| T25 | Extract LessonSessionParams and normalize route param types | NOT_STARTED |
| T21 | Consolidate avatar and waveform primitives on Reanimated | **BLOCKED** |
| T22 | Delete legacy screen trees and phantom aliases | NOT_STARTED |
| T26 | Refactor ModalNavigator to a single MainTabNavigator | NOT_STARTED |
| T27 | Harden ReconnectingOverlay timeout cleanup | NOT_STARTED |
| T28 | Unify design-token surface and migrate legacy imports | NOT_STARTED |
| T29 | Centralize icon library and remove inline SVG/emoji | NOT_STARTED |
| T23 | Add unknown deep-link fallback and logging | NOT_STARTED |
| T24 | Add nav-graph-data.json alignment test | NOT_STARTED |
| T30 | Haptics, Box typing, and Text primitive compliance | NOT_STARTED |

**Reading:** of the lesson-shape adjacent work, only one PRD is BLOCKED on a decision (T00 Gemini ship/remove), one is BLOCKED on the safety shim contract (T20 — but the shim code exists, see §4), and the rest are all NOT_STARTED. The audit register treats this work as not in flight — which matches what the coordination row already tells us.

---

## 7. Audit-to-action handback

For any downstream "more lessons" feature agent:

1. **Coordinate first, code second.** The 2026-05-26 coordination row is the single chain that gates everything in §3. Even a 12-hour lesson-authoring push is wasted if it lands before the contract does, because device-local progress is the only sink that exists.
2. **Decide T00 (Gemini ship/remove) before T16/T21/T22 fork.** T00 is the lone meta-PRD gating T17–T21; if voice goes one way it triggers the Gemini-conversation screen, if it goes the other it triggers Gemini code removal. Pick before opening either lane.
3. **The XState runtime is done. The wire is missing.** Building the lesson session is mostly about `src/services/api/lesson-session.api.ts` (5 stubs) plus the §3b missing endpoints. The screens, the state machine, the lesson content, the persona, and the safety blocklist are all already shipping or plumbed.
4. **The persona voice is intentionally English-only on child surfaces** (per ENGLISH_LEARNING.md §1, §7.5). Vietnamese scaffolding belongs only in: contrastive pronunciation hints, ask-a-grown-up safety prompts, warmth beats ("Giỏi quá!"), and parent-facing copy. Adding VN L1 to more places is its own coordination row.
5. **The integrity-hash placeholder in the safety blocklist (`blocklist.v1.json:6`) is a real production liability.** Any release that ships this zero-string leaves `validateIntegrity` unable to detect tampering. Either pin the hash to a real SHA-256 at build time, or invert the check (block on placeholder).
6. **PostHog gating off child sessions is an open ethical product call.** Re-enabling PostHog for child role would let the engagement-funnel research land in product analytics, but it has COPPA / parent-notice implications. Resolution requires explicit human sign-off.
7. **No-PII is enforced by hash-only emission, but the design contract isn't documented anywhere an engineer will look first.** Worth promoting to ENGLISH_LEARNING.md or BEHAVIOR.md so the rule doesn't depend on having read 3 source files end-to-end.
8. **The 6 pending surfaces in the redesign-2026 hub are waiting for fresh sim builds**, not research. They will fill in automatically the next time `expo run:ios` lands and `node tools/capture-mobile-surfaces.mjs --surfaces <ids>` is run. Out of scope for this audit.

---

## 8. Inventory to ledger keys (audit-friendly)

| Inventory item | Cross-reference |
|---|---|
| `src/features/lessonDemo/content/sixMonthLessonPack.ts` (120 lessons) | `en/curriculum/sixMonthLessonPack.json` (the JSON fixtures it imports) |
| `src/features/lessonDemo/content/curatedLegacyLessons.ts` (4 curated) | redesign-2026 wave 1; commits `bcd6763`, `d9b695d` |
| `src/services/api/lesson-session.api.ts` (5 stubs) | `COORDINATION_REQUESTS.md` 2026-05-26 (gating row) |
| `src/services/api/learning.ts` (6 live calls) | backend OpenAPI `/v1/learning/...` |
| `src/state/machines/lessonSession.machine.ts` (full runtime) | `tests/features/lesson-session/` (under-covered) |
| `src/services/ai/safety/blocklist.ts` + `.v1.json` | ENGLISH_LEARNING.md §11.5 / T20 PRD |
| PRD T00 (Gemini fork) | T17, T18, T19, T20, T21 (gated) |
| PRD T16 (lesson session wiring) | `lesson-session.api.ts` (5 stubs) |
| PRD T25 (param refactor) | `lessonSession.machine.ts:152–164` service stubs |

End of inventory. Use as the substrate for any new lesson-shape v2 spec and any 2026-05-26 coordination follow-up.
