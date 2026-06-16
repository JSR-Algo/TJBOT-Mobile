# T20: Implement the documented child-safety shim

## Status
Registry status: **BLOCKED** | Priority: **P0** | Blast radius: **HIGH**

> Implementation is blocked pending the Gemini voice decision recorded in **T00** (`SHIP_GEMINI` vs `REMOVE_GEMINI`). If the decision is `REMOVE_GEMINI`, this task is superseded by **T18/T19** and must not be executed. Do not start implementation until T00 is decided and T17 is accepted.

## Problem
`src/services/ai/safety/README.md` documents a complete three-layer child-safety system (input blocklist, age-aware persona, output blocklist) plus integrity hashing and telemetry. The directory currently contains only the README; none of the implementation files exist. There is therefore no deterministic input/output guard on the Gemini Live voice path.

Audit findings:
- `docs/audits/ios-reference-audit/reports/audio-voice.md` §Improvements, "Missing safety shim implementation" (lines 58–61):
  - "The README describes a complete Layer 1/2/3 child-safety system with blocklist, persona assembly, integrity hashing, telemetry, and tests. The directory contains only the README."
  - "There is no deterministic input/output guard."
- `src/services/ai/safety/README.md` §3–8 defines the public API, blocklist schema, persona rules, fail-closed contract, telemetry contract, and test expectations.
- `src/hooks/useGeminiConversation.ts` currently sends every mic chunk directly to `session.sendRealtimeInput` (lines 1414–1417) and appends every AI output transcript chunk without an output guard (lines 692–717).

This is a compliance/governance gap for a child-facing voice product.

## Scope

### In scope
Create and wire the safety shim layer:

- `src/services/ai/safety/index.ts` — public API: `checkInput`, `checkOutput`, `assemblePersona`, `BLOCKLIST_VERSION`, `TelemetryPort`, `SafetyContext`, `CheckResult`.
- `src/services/ai/safety/schemas.ts` — TypeScript types for payloads and blocklist structures.
- `src/services/ai/safety/inputBlocklist.ts` — Layer 1 deterministic regex scan.
- `src/services/ai/safety/outputBlocklist.ts` — Layer 3 deterministic regex scan.
- `src/services/ai/safety/persona.ts` — Layer 2 system-instruction assembly.
- `src/services/ai/safety/blocklist.v1.json` — 80–120 regexes, version, generated/approved metadata, `integritySha256`.
- `src/services/ai/safety/__tests__/corpus/benign.txt` — 50+ safe child utterances.
- `src/services/ai/safety/__tests__/corpus/canaries.txt` — 10+ known-bad utterances.
- `src/hooks/useGeminiConversation.ts` — wire `checkInput` into `handleMicChunk` and `checkOutput` into the `outputTranscription`/`serverContent` handler; pass the assembled persona into `systemInstruction`.
- `tests/verification/T20-implement-safety-shim.test.ts` — verification test (this deliverable).

### Out of scope
- `ios/**`, `android/**` — no native changes.
- `src/services/ai/safety/README.md` — contract source, not implementation.
- Server-side sys-05 pipeline (Sprint 12).
- OTA fetch of `blocklist.v1.json` (Sprint 28).
- Full behavioral voice-session test coverage of the 1,560-line hook (out of scope for this PR; use source-match + focused safety-module unit tests).
- Removing the Gemini layer (T18/T19) if T00 resolves to `REMOVE_GEMINI`.

## Proposed solution

1. **Create `schemas.ts`**
   - Export `TelemetryPort`, `SafetyContext`, `LessonTheme`, `CheckResult`, `BlocklistV1` interfaces matching README §3 and §4.
   - `CheckResult.verdict` is `'allow' | 'block'`; `category` and `termSha256` are optional but present on block.

2. **Create `blocklist.v1.json`**
   - Follow README §4 schema: `version`, `generatedAt`, `authoredBy`, `approvedBy`, `integritySha256`, `categories`.
   - Provide 80–120 total regexes across `violence`, `sexual`, `substance`, `self-harm`, `pii`, `prompt-injection`.
   - Compute `integritySha256` from the sorted-keys JSON of `categories` using SHA-256.

3. **Create `inputBlocklist.ts` and `outputBlocklist.ts`**
   - Each exports a synchronous scanner function.
   - Load `blocklist.v1.json` at module init (static import).
   - Verify `integritySha256` on first import; mismatch → emit `safety_shim_error` via injected telemetry and fail-closed (return `verdict: 'block'`).
   - Iterate regexes deterministically (category order fixed by JSON; within a category, array order).
   - On match, return `{ verdict: 'block', category, termSha256: sha256(regex) }`.
   - On exception, emit `safety_shim_error` and return `verdict: 'block'`.
   - Never include the plaintext regex in telemetry.

4. **Create `persona.ts`**
   - Export `assemblePersona(ctx: SafetyContext): string`.
   - Substitute `{AGE_BRACKET}`, `{ALLOWED_TOPICS_FOR_AGE}`, `{LESSON_VOCAB}`, `{LESSON_OPENER}`, `{EXPRESSION_SET}`, `{MOTION_SET}` deterministically.
   - `{LESSON_OPENER}` uses `ctx.theme.openers[sessionCount % openers.length]`; for v1 alpha use a stable default (e.g., `0`) if session count is not yet plumbed.
   - `EXPRESSION_SET` = 14 expressions; `MOTION_SET` = 12 motions.
   - Assert output ≤ 2 kB in unit tests.

5. **Create `index.ts`**
   - Re-export public API.
   - Implement `checkInput` and `checkOutput` as thin wrappers that call the layer scanners and emit `safety_block_event` on block.
   - Export `BLOCKLIST_VERSION` from the imported JSON.

6. **Wire `useGeminiConversation.ts`**
   - Import `{ checkInput, checkOutput, assemblePersona }` from `@/services/ai/safety`.
   - Extend `GeminiConversationOptions` or derive a `SafetyContext` from the active child profile/session:
     - `childAgeBracket` from the active child (default `'4-6'` if unavailable in alpha).
     - `childProfileId` from the active child.
     - `sessionId` from `sessionIdRef.current` or a stable string.
     - `theme` from the active lesson theme or a safe default.
     - `telemetry` adapter wrapping the existing `track(...)` function to emit the required event names.
   - In `startConversation`, replace:
     ```ts
     systemInstruction: options.systemInstruction || undefined,
     ```
     with:
     ```ts
     systemInstruction: options.systemInstruction || assemblePersona(safetyContextRef.current),
     ```
   - In `handleMicChunk` (around line 1414), before `sessionRef.current?.sendRealtimeInput?.(...)`, call `checkInput` on the transcribed text if available, or on a small cached utterance buffer. For the audio path the practical insertion is to gate **after** the mic chunk is buffered; because live transcription arrives later via `inputTranscription`, the primary enforcement in v1 alpha is:
     - Drop the chunk if `checkInput` blocks on the most recently known user transcript (or a short rolling text buffer), and do not call `sendRealtimeInput`.
   - In the `onmessage` output-transcription handler (lines 692–717), call `checkOutput(outputTranscription.text, safetyContext)`; if blocked, drop the transcript text and any queued audio chunk for that turn, and emit telemetry.
   - Ensure fail-closed: any safety exception in the hook short-circuits to the blocked path (drop audio/transcript, emit `safety_shim_error`).

7. **Add corpus files**
   - `__tests__/corpus/benign.txt` and `__tests__/corpus/canaries.txt` as documented.

8. **Update `src/services/ai/safety/README.md` only if the contract changes**
   - Not expected; if a deviation is required, update the system-design doc first per README §1.

## Acceptance criteria

1. `checkInput` and `checkOutput` are deterministic, synchronous, and fail-closed.
2. `blocklist.v1.json` has a verifiable `integritySha256` and 80–120 regexes.
3. `assemblePersona` substitutes age bracket, theme, and vocab deterministically and stays under 2 kB.
4. Telemetry emits `safety_block_event` and `safety_shim_error` with no plaintext terms.
5. The conversation hook calls `checkInput` on mic chunks and `checkOutput` on transcript chunks.
6. No native modules are removed or changed.
7. `npm test` and `npm run typecheck` pass after implementation.

## Dependencies

- **T00** — Gemini Live voice ship/remove decision. If `REMOVE_GEMINI`, do not implement T20; follow T18/T19 instead.
- **T17** — Gemini conversation screen must be wired so the safety shim has a reachable call site and a stable session context. T20 may be implemented in the same branch as T17, but T17 must merge first.

## Exclusions / anti-overlap

- **T18** (`delete-orphaned-gemini-js`) and **T19** (`remove-gemini-native-modules`) are mutually exclusive with T20. Do not run them in parallel.
- Do not edit `src/hooks/useGeminiConversation.ts` in T18/T19 while T20 is in flight.
- Do not change `src/services/ai/safety/README.md` unless the system-design doc is updated first.

## Verification test plan

- **Test file:** `tests/verification/T20-implement-safety-shim.test.ts`
- **What it proves:**
  - The safety shim module exists and exports the documented public API.
  - `blocklist.v1.json` carries a valid `integritySha256` and the required regex count.
  - `assemblePersona` produces deterministic output under 2 kB.
  - `useGeminiConversation.ts` imports the shim and calls `checkInput`/`checkOutput` at the documented sites.
  - Telemetry events never carry plaintext terms.
- **How to run it:** `npx jest tests/verification/T20-implement-safety-shim.test.ts`
- **Expected state before fix:** FAIL (safety module files do not exist; hook does not import or call the shim).
- **Expected state after fix:** PASS

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Legal/safety rejects the blocklist or persona content | Keep blocklist content out of this PR's scope; the PR only enforces structure, count, and wiring. Content approval is a coordination gate before merge. |
| Performance: regex scanning every mic chunk at ~50 Hz | Scan text, not raw audio. Use compiled RegExp objects cached at module init. Target ≤ 5 ms per `checkInput` on iPhone 12. Add a perf benchmark in a follow-up. |
| False positives break the voice UX | Include a benign corpus of 50+ child utterances in tests; any regression must keep 100% pass rate. Document known limitations in the alpha brief per README §10. |
| Fail-open bug due to swallowed exception | Wrap every scanner call in try/catch that returns `verdict: 'block'`. Unit-test exception paths explicitly. |
| Hook wiring creates circular import or breaks existing P0 tests | Run the full `tests/hooks/useGeminiConversation*.test.ts` suite after wiring. Source-match tests should only need additive regex updates. |
| T00 resolves to `REMOVE_GEMINI` after T20 starts | Mark T20 BLOCKED in the registry and do not merge. Re-allocate effort to T18/T19. |

## Coordination notes

- **Legal / Safety:** Must approve the content of `blocklist.v1.json` and `persona.ts` before merge. The verification test asserts structure and count, not content approval.
- **Backend / AI:** Confirm that the assembled `systemInstruction` length (≤ 2 kB) is compatible with the Gemini Live model token budget and backend prompt-service conventions.
- **Mobile (T17 owner):** Confirm the child-profile/session context shape so `SafetyContext` can be populated without a new data fetch in the conversation hook.

## Implementation hints

- **Files to read first:**
  - `src/services/ai/safety/README.md` — full contract.
  - `src/hooks/useGeminiConversation.ts` lines 512 (`systemInstruction`), 692–717 (output transcription), 1385–1436 (`handleMicChunk`), 1414–1417 (`sendRealtimeInput`).
  - `src/state/voiceAssistantStore.ts` — for session ID and existing FSM state if needed for context.
- **Patterns to follow:**
  - Use static JSON import for `blocklist.v1.json` so it is bundled deterministically.
  - Use Node `crypto` or a small SHA-256 helper for integrity; in React Native use `expo-crypto` if available, otherwise precompute at build time and verify via JSON parse only. For Jest, the Node `crypto` module is available.
  - Keep the safety module free of React / native imports so it can be unit-tested in Node.
- **Pitfalls:**
  - Do not put plaintext regexes in telemetry payloads or error messages.
  - Do not make `checkInput`/`checkOutput` async — the call sites are on the hot audio path.
  - Do not scan raw base64 audio data; scan text transcripts only.
