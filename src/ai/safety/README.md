# Safety Shim v1 (Mobile) — Reference

**Scope:** TBOT Mobile v1 internal alpha. **Lifecycle:** Bridge to sys-05 full pipeline (Sprint 12).

**Authoritative system design:** [../../../../docs/site/releases/v1-alpha-internal.md §6](../../../../docs/site/releases/v1-alpha-internal.md)

This README is the **contract that agents must implement** for the safety shim. Do not deviate without updating the system-design doc first.

> **Integration-point update (2026-04-24):** The earlier custom `GeminiLiveClient` WebSocket wrapper has been removed. The Gemini Live integration now runs through `@google/genai` SDK in `src/hooks/useGeminiConversation.ts`. When implementing §8.3 below, map:
> - `GeminiLiveClient._sendSetup()` → the `systemInstruction` field passed to `GoogleGenAI.live.connect({ config })` in `useGeminiConversation.ts`.
> - `GeminiLiveClient.sendAudio` → `session.sendRealtimeInput({ audio: { data, mimeType } })` called from `handleMicChunk` in `useGeminiConversation.ts`.
> - `GeminiLiveClient._handleMessage` → the inbound-message handler driven by `session.on('message', ...)` in the same hook.

---

## 1. Why this exists (in one paragraph)

An alpha child-facing voice product cannot ship without defense-in-depth safety. Full sys-05 (topic classifier + PII ML + intent classifier) is Sprint 12 — too far for alpha. This shim is the **minimum defensible alpha surface**: two deterministic blocklist layers + an age-aware persona enforcing refusal patterns, paired with invite-only distribution and transcript audit. It will be **superseded**, not extended, when sys-05 lands.

---

## 2. Files (target structure)

```
tbot-mobile/src/ai/safety/
├── README.md                 ← this file
├── index.ts                  ← public API: SafetyShim.check(...), assemblePersona(...)
├── inputBlocklist.ts         ← Layer 1 implementation
├── outputBlocklist.ts        ← Layer 3 implementation
├── persona.ts                ← Layer 2 system-instruction assembly
├── blocklist.v1.json         ← 80–120 terms, hashed, never hand-edited in prod
├── schemas.ts                ← TS types for all payloads
└── __tests__/
    ├── inputBlocklist.test.ts
    ├── outputBlocklist.test.ts
    ├── persona.test.ts
    └── corpus/
        ├── benign.txt        ← 50+ lines, must all pass
        └── canaries.txt      ← 10+ blocklist canaries, must all block
```

---

## 3. Public API

```ts
// index.ts
export interface TelemetryPort {
  emit(event: "safety_block_event" | "safety_shim_error", payload: Record<string, unknown>): void;
}

export interface SafetyContext {
  readonly childAgeBracket: "4-6" | "7-9" | "10-12";
  readonly childProfileId: string;
  readonly sessionId: string;
  readonly theme: LessonTheme;
  readonly telemetry: TelemetryPort; // injected — no global I/O
}

export interface CheckResult {
  readonly verdict: "allow" | "block";
  readonly category?: "violence" | "sexual" | "substance" | "self-harm" | "pii" | "prompt-injection";
  readonly termSha256?: string;    // never the plaintext term
  readonly fallback?: string;       // prebuilt audio-playable refusal
}

// Return value is deterministic; telemetry emit is the single documented side effect.
export function checkInput(utterance: string, ctx: SafetyContext): CheckResult;
export function checkOutput(transcriptChunk: string, ctx: SafetyContext): CheckResult;
export function assemblePersona(ctx: SafetyContext): string; // system-instruction text
export const BLOCKLIST_VERSION: string; // "v1.0.0"
```

**Purity contract (clarified):**
- **Return values are deterministic** given the same inputs (blocklist version fixed at build). Tests rely on this.
- **Synchronous execution.** No `await`, no promises in the call-site critical path.
- **One documented side effect:** on a `block` verdict or exception, the function emits a telemetry event via an injected `telemetry.emit(...)` port. This is a side effect by necessity — safety events must be logged — and is explicit in the signature via a context argument, not hidden global I/O. Tests inject a mock emitter.
- **No other I/O:** no file reads, no network calls, no timers.

This is a pragmatic contract: "no hidden async state, deterministic verdicts, one explicit observer." Full mathematical purity is not the goal.

---

## 4. Blocklist format (`blocklist.v1.json`)

```json
{
  "version": "v1.0.0",
  "generatedAt": "2026-04-21T00:00:00Z",
  "authoredBy": "safety-lead@tbot",
  "approvedBy": "legal-lead@tbot",
  "integritySha256": "<sha256 of the categories object below>",
  "categories": {
    "violence":        ["regex1", "regex2", "..."],
    "sexual":          ["regex1", "..."],
    "substance":       ["..."],
    "self-harm":       ["..."],
    "pii":             ["\\b\\d{3}[-.]\\d{3}[-.]\\d{4}\\b", "..."],
    "prompt-injection":["ignore (?:all )?previous instructions", "..."]
  }
}
```

**Integrity check:** at app start, compute SHA-256 of `categories` (sorted-keys JSON), compare to `integritySha256`. Mismatch → log + refuse to start safety shim → RobotScreen entry blocked (fail-closed).

**Size budget:** 80–120 total regexes. Benchmark target: ≤ 5 ms per `checkInput` on iPhone 12 baseline.

---

## 5. Persona assembly rules

`assemblePersona(ctx)` returns a single string, injected once at `GeminiLiveClient._sendSetup()` under field `system_instruction.parts[0].text`.

**Template source:** [../../../../docs/site/releases/v1-alpha-internal.md §6.2](../../../../docs/site/releases/v1-alpha-internal.md)

**Substitution precedence (deterministic):**
1. `{AGE_BRACKET}` — from `ctx.childAgeBracket`.
2. `{ALLOWED_TOPICS_FOR_AGE}` — from `ctx.theme.allowedTopics`.
3. `{LESSON_VOCAB}` — from `ctx.theme.vocab`, joined by `, `.
4. `{LESSON_OPENER}` — deterministic: `ctx.theme.openers[sessionCount % openers.length]`.
5. `{EXPRESSION_SET}`, `{MOTION_SET}` — const list of 14 expressions + 12 motions.

**Output constraint:** the assembled system instruction MUST be ≤ 2 kB (Gemini soft limit for reliable adherence). Assert at test time.

---

## 6. Fail-closed behavior (MANDATORY)

Every exception path MUST block, not allow:

```ts
export function checkInput(utterance: string, ctx: SafetyContext): CheckResult {
  try {
    // ... regex scan ...
    return result;
  } catch (err) {
    // do NOT swallow silently
    telemetry.emit("safety_shim_error", { side: "input", err: err.name });
    return { verdict: "block", category: "prompt-injection", fallback: FALLBACK_AUDIO };
  }
}
```

The same rule holds for `checkOutput` and blocklist integrity. **Never** default to allow.

---

## 7. Telemetry contract

Every block event MUST emit:

```ts
telemetry.emit("safety_block_event", {
  sessionId: ctx.sessionId,
  side: "input" | "output",
  category: CheckResult.category!,
  termSha256: CheckResult.termSha256!,
  blocklistVersion: BLOCKLIST_VERSION,
  promptVersion: ctx.theme.version,
  tsMs: Date.now(),
});
```

**Never** include the plaintext term. Hash only. Verified by grep audit in release.

---

## 8. Testing

### 8.1 Corpus (`__tests__/corpus/`)

- `benign.txt` — 50+ lines of safe child utterances, all must return `verdict:"allow"`.
- `canaries.txt` — 10+ known-bad utterances (one per category), all must return `verdict:"block"` with the correct `category`.

### 8.2 Unit tests

- `inputBlocklist.test.ts` — benign corpus passes, canary corpus blocks, exception → fail-closed.
- `outputBlocklist.test.ts` — same, applied to simulated streaming chunks.
- `persona.test.ts` — substitution determinism, 2 kB size cap, age-bracket filtering.

### 8.3 Integration with GeminiLiveClient

- Mock `GeminiLiveClient.sendAudio`. Assert it is NOT called when `checkInput` returns `block`.
- Mock inbound transcript. Assert audio chunks are dropped (existing `_handleMessage` patched) when `checkOutput` returns `block`.

### 8.4 Performance benchmark

Run `npx jest --runInBand __bench__/safety-shim.bench.ts` on CI nightly. Alert if p99 input-check latency > 10 ms.

---

## 9. Authoring / governance workflow

1. **New term candidate** → safety lead adds regex to a PR branch.
2. **Review** → safety lead + legal lead approve.
3. **Test** → CI validates blocklist integrity, regex compiles, benign corpus still 100% pass, canary corpus still 100% block.
4. **Version bump** → `version` field increments semver; `integritySha256` recomputed.
5. **Merge + OTA** → new `blocklist.v1.json` shipped via remote-config fetch at session start (out of scope for v1 alpha — alpha ships bundled; OTA fetch is Sprint 28 followup).

**Never hand-edit** the `integritySha256` field. Use `tools/safety/rehash-blocklist.ts`.

---

## 10. Known limitations (must be called out in alpha brief)

- **Paraphrase:** "hurt myself" blocked, "make myself not exist" not blocked. Output blocklist + transcript audit are the net.
- **Obfuscation:** "w34p0n" not blocked unless regex includes leet-speak. v1 adds only obvious cases.
- **Multilingual:** Vietnamese / other languages not covered. v1 persona enforces English-only.
- **Context:** "gun" in "the Beatles song 'Happiness Is a Warm Gun'" is blocked. Acceptable false-positive rate for alpha.

---

## 11. Supersession

When sys-05 (Sprint 12) ships server-side pipeline:
- Client shim becomes a **tertiary** layer (server-side is primary).
- Persona assembly moves to server-side prompt-service.
- Blocklist file retained as an OTA emergency override.
- This README archived at `docs/site/releases/archive/v1-alpha-safety-shim.md`.

---

## 12. References

- System design: [../../../../docs/site/releases/v1-alpha-internal.md](../../../../docs/site/releases/v1-alpha-internal.md)
- Target pipeline: [../../../../docs/site/software/systems/05-conversation-intelligence-and-safety.md](../../../../docs/site/software/systems/05-conversation-intelligence-and-safety.md)
- Plan: [../../../../.omc/plans/mobile-v1-internal-alpha-speech-ai.md](../../../../.omc/plans/mobile-v1-internal-alpha-speech-ai.md)
