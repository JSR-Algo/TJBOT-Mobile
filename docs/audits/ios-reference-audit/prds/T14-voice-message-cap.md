# T14: Cap voice assistant message history

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: LOW

## Problem
`voiceAssistantStore.addMessage` appends every user/AI turn to an in-memory `messages` array with no upper bound. During long voice sessions the array grows without limit, causing:

- **Memory pressure** on child-companion iPads that may keep a session open for many turns.
- **Slow transcript re-renders** in components that render the full message history (e.g. `TranscriptPanel`).

Audit sources:

- `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/reports/state-architecture.md` §Improvements, line 80:
  > "`voiceAssistantStore` message array grows unbounded. `addMessage` at `src/state/voiceAssistantStore.ts` lines 393–402 appends every user/AI turn without a cap. Long voice sessions could accumulate enough messages to cause memory pressure and slow re-renders in `TranscriptPanel`. Cap the array (e.g., last 100 turns) and persist full history server-side."
- `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/reports/audio-voice.md` §Bottlenecks, lines 111–129 notes the same store is the central voice FSM state surface, reinforcing that unbounded growth is a runtime risk.
- Source: `src/state/voiceAssistantStore.ts`, lines 393–402:

```ts
addMessage: (role: 'user' | 'ai', text: string, interrupted?: boolean) => {
  if (!text.trim()) return;
  set((s) => ({
    messages: [
      ...s.messages,
      { role, text: text.trim(), ts: Date.now(), ...(interrupted ? { interrupted } : {}) },
    ],
    ...(role === 'user' ? { userTranscript: '' } : { aiTranscript: '' }),
  }));
},
```

The array is never trimmed.

## Scope

### In scope
- `src/state/voiceAssistantStore.ts`
  - Add a deterministic cap to `addMessage`.
  - Export the cap constant so tests and debugging tools can read it.
- `tests/verification/T14-voice-message-cap.test.ts`
  - Unit tests proving the cap and eviction order.

### Out of scope
- `src/hooks/useGeminiConversation.ts` and `src/components/gemini/TranscriptPanel.tsx` (registry non-scope). The cap is applied at the store level; consumers automatically see the trimmed window.
- Implementing server-side full-history persistence. We only document the future hook point and keep the client-side window small.
- Changing rate-limit/UUID test helpers (`__resetBargeInRateLimit`, `__setRandomUUID`) in the same file. Those are covered by the audio-voice audit's broader testability note, not this task.
- Modifying FSM transitions, `stopSession`, or `reset` behavior.

## Proposed solution

1. Introduce a named constant near the top of `src/state/voiceAssistantStore.ts`:

   ```ts
   export const VOICE_MESSAGE_HISTORY_CAP = 100;
   ```

   The value 100 matches the audit's "last 100 turns" example and gives ~50 user / 50 AI turns of local transcript history.

2. Rewrite `addMessage` so the new message is pushed and the array is then sliced to the last `VOICE_MESSAGE_HISTORY_CAP` items:

   ```ts
   addMessage: (role: 'user' | 'ai', text: string, interrupted?: boolean) => {
     if (!text.trim()) return;
     set((s) => {
       const next = [
         ...s.messages,
         { role, text: text.trim(), ts: Date.now(), ...(interrupted ? { interrupted } : {}) },
       ];
       return {
         messages: next.length > VOICE_MESSAGE_HISTORY_CAP
           ? next.slice(-VOICE_MESSAGE_HISTORY_CAP)
           : next,
         ...(role === 'user' ? { userTranscript: '' } : { aiTranscript: '' }),
       };
     });
   },
   ```

   - Oldest messages are evicted deterministically via `slice(-N)`.
   - The `> cap` guard avoids unnecessary array copies when under the cap.
   - `userTranscript` / `aiTranscript` clearing is preserved.

3. Do **not** add a test-only `__reset` helper for the cap. The constant is immutable; tests drive the store through its public API.

4. Server-side history: leave a short comment above the constant noting that full history lives server-side and the cap is a client-side window.

## Acceptance criteria

1. `addMessage` caps the `messages` array to the configured maximum (e.g., last 100 turns).
2. Oldest messages are evicted deterministically when the cap is exceeded.
3. The cap constant is exported from `src/state/voiceAssistantStore.ts`.
4. Full history can still be fetched/persisted server-side if needed (documented via code comment, not implemented here).
5. Unit tests verify cap behavior, including:
   - adding one message over the cap evicts the oldest message,
   - relative order of retained messages is preserved,
   - transcript clearing still works at the cap boundary.

## Dependencies

None.

## Exclusions / anti-overlap

- **T18 — Delete the orphaned Gemini Live JS layer** plans to delete `src/state/voiceAssistantStore.ts` if the Gemini path is removed. This task must not run in parallel with T18. If T18 is chosen, T14 becomes obsolete and should be closed as superseded.
- Do not modify `useGeminiConversation.ts` or `TranscriptPanel.tsx` for this fix; any work there belongs to T17/T18/T21.

## Verification test plan

- **Test file:** `tests/verification/T14-voice-message-cap.test.ts`
- **What it proves:** `voiceAssistantStore.addMessage` does not allow the `messages` array to exceed `VOICE_MESSAGE_HISTORY_CAP`; oldest messages are dropped first; relative order is preserved; transcript reset behavior is unchanged at the boundary.
- **How to run it:**
  ```bash
  cd /Users/thuanle/Documents/TamTMV/TbotREAL/original-app/TJBOT-Mobile
  npx jest tests/verification/T14-voice-message-cap.test.ts
  ```
- **Expected state before fix:** FAIL — the store has no exported `VOICE_MESSAGE_HISTORY_CAP` and `addMessage` keeps every message, so the cap assertions fail.
- **Expected state after fix:** PASS.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Existing tests or simulator flows assume an unbounded `messages` array. | The cap is large (100) and only trims on insertion; no existing test inserts that many turns. The new verification test covers the boundary. |
| Consumers read `messages.length` to decide whether to show a "scroll to start" affordance. | The cap is documented in the store; any such logic should rely on a server cursor or separate metadata, not array length. |
| T18 deletes the store after this fix is merged, wasting effort. | Gate T14 behind the T00 Gemini decision: only implement if the voice assistant store is expected to remain. Mark anti-overlap with T18 in sprint planning. |
| Cap value is arbitrary and may be too low for some sessions. | 100 turns ≈ a long session; server-side persistence is the documented long-term owner of full history. The constant export makes future tuning a one-line change. |

## Coordination notes

No cross-role coordination required. Notify the T18 owner that this task touches `src/state/voiceAssistantStore.ts` so merge ordering is respected.

## Implementation hints

- Read `src/state/voiceAssistantStore.ts` lines 175–402 for the `Message` type and the current `addMessage` implementation.
- The existing unit suite `tests/state/voiceAssistantStore.test.ts` uses `useVoiceAssistantStore.getState().reset()` in `beforeEach`; follow the same pattern in the verification test.
- Prefer `Array.prototype.slice(-N)` over `shift()` loops — it is O(N) for the copy but clearer and avoids mutating the intermediate array multiple times.
- Keep the change local to `addMessage`; do not refactor unrelated store internals.
