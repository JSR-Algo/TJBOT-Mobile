# Task Registry Validation

## Summary

| Metric | Count |
|--------|-------|
| Total tasks | 34 |
| Tasks with scope >10 files | 2 |
| Tasks flagged for coordination | 9 |
| Dependency cycles detected | 0 |
| Files touched by more than one task | 13 |

**Key finding:** the registry is mostly coherent, but it has one clear file-renaming error, two oversized tasks, several overlapping tasks that need explicit sequencing, and a mutually-exclusive Gemini-voice fork that must be resolved by product before the fleet starts.

---

## Overlap analysis

For each file touched by >1 task, the table below lists the tasks and recommends whether to merge, split, or declare a dependency.

| File | Tasks | Recommendation |
|------|-------|----------------|
| `package.json` | T01, T02, T03, T18, T19, T34 | **Sequence, do not parallelize.** Six tasks editing `package.json` is the single highest merge-conflict risk in the registry. T01/T02/T03 are foundational and should land first (consider merging T02 into T01). T18/T19 should only run if the "remove Gemini" branch is chosen. T34 should depend on T18/T19 (if chosen) and on T33. |
| `src/contexts/HouseholdContext.tsx` | T11, T12, T15 | **Declare dependency.** T11 refactors the context internals; T12 rewrites its imports; T15 migrates it to React Query. Running T12 and T15 in parallel will conflict. Add `T12` to `T15.dependencies` so the React Query migration happens after the shim removal. |
| `src/config.ts` | T01, T08 | **Merge or shrink T08 scope.** T08 already depends on T01, but both tasks edit `src/config.ts`. The env-schema work in T01 and the WS-URL work in T08 are the same logical change. Either merge them or move T08's config edits into T01 and leave T08 with only `src/services/ws/realtime.ts` + tests. |
| `src/__env__.ts` | T01, T08 | **Same as above.** T01's acceptance criteria already say this file should stop being written by `metro.config.js`; T08 should not need to touch it. Remove `src/__env__.ts` from T08 scope. |
| `src/services/ble/service.ts` | T04, T07 | **Declare dependency.** Both tasks edit the allowlist/filter logic. T07 should depend on T04 so RSSI/timeout changes land before service-UUID hardening. |
| `src/services/ble/config.ts` | T04, T07 | **Declare dependency.** Same reasoning as `service.ts`. |
| `src/services/ws/realtime.ts` | T08, T10 | **OK as-is.** T10 already depends on T08. |
| `src/contexts/AuthContext.tsx` | T09, T12 | **OK as-is.** T12 already depends on T09. |
| `src/hooks/use-streaming-transcript.ts` | T13, T18 | **Resolve via Gemini fork decision.** If T18 is chosen, this file is deleted twice (redundant but not conflicting). If T17 is chosen, T18 is excluded and T13 still deletes it, which would break T17/T20/T21. Add `T18` to T13's exclusions, or only include this file in T13 when the "remove Gemini" branch is selected. |
| `src/state/voiceAssistantStore.ts` | T14, T18 | **Resolve via Gemini fork decision.** T14 caps the store; T18 deletes it. If T18 runs, T14 is wasted. Add `T18` to T14 exclusions (or make T14 depend on T17). |
| `src/navigation/routes.ts` | T17, T25 | **Add dependency or strong coordination note.** T25 refactors lesson-session param types and T17 may add a Gemini route. If T17 is selected, add T17 to T25 dependencies so the new route is included in the refactor. |
| `src/hooks/useGeminiConversation.ts` | T18, T20 | **OK given exclusions.** T20 depends on T17 and excludes T18; T18 excludes T17/T20. This overlap is only valid if the Gemini fork is enforced. |
| `.github/workflows/ci.yml` | T33, T34 | **Declare dependency.** T33 restructures CI jobs; T34 adds a coverage job. T34 should depend on T33. |

---

## Oversized tasks

| Task | Scope count | Issue | Suggested split |
|------|-------------|-------|-----------------|
| **T18** — Delete the orphaned Gemini Live JS layer | 12 items | Deletes hooks, components, audio shims, native TS wrappers, AI state, and edits `package.json` in one change. | Split into **T18a** (delete JS/TS source: hooks, components, audio, state, AI) and **T18b** (scrub `package.json` dependencies). Or keep T18 as the source sweep and move `package.json` cleanup to T19, which already touches `package.json` for native dependency removal. |
| **T29** — Centralize icon library and remove inline SVG/emoji | 11 items | Touches fallback components, Gemini components, design-system primitives, device UI, and onboarding shell in one PR. | Split by surface: **T29a** fallback/device/onboarding components (`ErrorMessage`, `EmptyState`, `DeviceRow`, `MicButton`, `OnbShell`), **T29b** Gemini/design-system components (`BigMicButton`, `ControlBar`, `CircleBtn`, `PageHeader`). This keeps each PR focused and reviewable. |

Both tasks are conceptually "delete/replace across the codebase," which is exactly the kind of work that creates huge PRs and merge conflicts. Splitting them will also make the verification tests smaller and more deterministic.

---

## Dependency/ordering issues

### No cycles
A full graph traversal found **0 dependency cycles** and **0 dependencies pointing to non-existent tasks**. The explicit dependency graph is technically sound.

### Missing or weak dependencies

1. **T04 → T07** (BLE service/config overlap). T07 should depend on T04.
2. **T12 → T15** (HouseholdContext overlap). T15 should depend on T12.
3. **T33 → T34** (`.github/workflows/ci.yml` overlap). T34 should depend on T33.
4. **T08 → T16** (WebSocket semantics). T16's notes say "coordinate with T08/T10," but the lesson-session machine cannot be wired correctly until the WS contract and event-forwarding shape are stable. Add T10 to T16 dependencies.
5. **Fleet-wide gate: T32**. Almost every task adds a `tests/verification/*.test.ts` file whose `expected_after` is `PASS`. If the baseline test suite is still broken (the stated problem of T32), those tests cannot be trusted. T32 should either be a dependency of every verification-bearing task or documented as a fleet-wide prerequisite gate.

### The Gemini fork is not gated

Tasks T17/T20/T21 (ship Gemini) are mutually exclusive with T18/T19 (remove Gemini). The registry uses `exclusions` to express this, but there is no single decision task or feature-flag state that forces the fleet to pick one branch. This will lead to a planning deadlock unless product decides first.

Recommended resolution:
- Add a meta/decision task (e.g., `T00-gemini-voice-decision`) with two outcomes: `SHIP_GEMINI` or `REMOVE_GEMINI`.
- Make T17/T20/T21 conditional on `SHIP_GEMINI`.
- Make T18/T19 conditional on `REMOVE_GEMINI`.
- Until the decision is made, mark T17–T21 as `BLOCKED`.

---

## Feasibility notes

### Files that do not exist or may have been renamed

#### Expected new files (fine — tasks create them)
These files are listed in scopes but do not exist yet; they are intentionally created by the task:

- `src/features/device/pairing/pairingStore.ts` (T06)
- `src/features/fallback/NotFoundScreen.tsx` (T23)
- `src/features/gemini/navigation.ts` (T17)
- `src/features/gemini/screens/GeminiConversationScreen.tsx` (T17)
- `src/services/ai/safety/index.ts`, `inputBlocklist.ts`, `outputBlocklist.ts`, `persona.ts`, `schemas.ts`, `blocklist.v1.json` (T20)
- All `tests/verification/T*.test.{ts,tsx}` files

#### Renamed files already fixed
- **T13** originally listed `src/hooks/useStreamingTranscript.ts` and `src/hooks/useVoiceActivity.ts`. The actual files are kebab-case: `src/hooks/use-streaming-transcript.ts` and `src/hooks/use-voice-activity.ts`. **This registry entry was corrected** to match the source tree.

#### Casing/portability issue
- **T19** lists Android native module paths with PascalCase (`android/app/src/main/java/**/VoiceMic/**`, `**/PcmStream/**`, `**/VoiceSession/**`). The actual directories are lowercase: `voicemic`, `pcmstream`, `voicesession`. On case-sensitive CI runners the current wildcards will not match. Update the patterns to lowercase or use a case-insensitive glob.

### Tasks blocked by a product decision
- **T17, T18, T19, T20, T21** are all blocked by the Gemini voice ship/remove decision. T17 and T18/T19 are mutually exclusive; T20/T21 only make sense if T17 is chosen. Do not start these tasks until product/legal confirms the direction.

### Tasks whose verification test design looks unrealistic
- **T32** — acceptance criteria include "npm test reports zero failed suites," but the verification is a single Jest test file. A single test cannot assert the status of the entire suite. The verification should be a CI check or a wrapper script, not a Jest test.
- **T03** — acceptance criteria include "Android debug build succeeds," but verification is a Jest test. A unit test cannot compile the Android native binary. Add a build-step gate or change the acceptance criterion.
- **T19** — acceptance criteria include "iOS and Android debug builds succeed after cleanup," but verification is a Jest test. Same issue as T03.
- **T20** — acceptance criterion "blocklist.v1.json has 80-120 regexes" is testable, but legal/safety must approve the blocklist before it can ship. The verification test can check structure/count, not content approval.
- **T24** — acceptance criterion "Edges are populated from actual navigators or the file is retired" is a product/tech-debt decision, not a pure implementation task.

---

## Recommended registry edits

Concrete JSON-level changes to apply before launching the PRD fleet:

1. **T13 scope** (already applied):
   - `src/hooks/useStreamingTranscript.ts` → `src/hooks/use-streaming-transcript.ts`
   - `src/hooks/useVoiceActivity.ts` → `src/hooks/use-voice-activity.ts`

2. **Add missing dependencies:**
   - `T07.dependencies`: add `"T04"`
   - `T15.dependencies`: add `"T12"`
   - `T34.dependencies`: add `"T33"`
   - `T16.dependencies`: add `"T10"` (or at least `"T08"`)

3. **Resolve T08/T01 overlap:**
   - Remove `src/config.ts` and `src/__env__.ts` from T08 scope; fold WS-URL config into T01 acceptance criteria, or
   - Merge T08 into T01.

4. **Resolve Gemini fork:**
   - Add `T18` to `T14.exclusions` (and vice versa), OR make T14 depend on T17.
   - Add `T17` to `T25.dependencies` if Gemini is kept.
   - Add a decision task `T00-gemini-voice-decision` and mark T17–T21 `BLOCKED` until it resolves.

5. **Fix T19 Android wildcards:**
   - `android/app/src/main/java/**/VoiceMic/**` → `android/app/src/main/java/**/voicemic/**`
   - `android/app/src/main/java/**/PcmStream/**` → `android/app/src/main/java/**/pcmstream/**`
   - `android/app/src/main/java/**/VoiceSession/**` → `android/app/src/main/java/**/voicesession/**`

6. **Split oversized tasks:**
   - **T18** → T18a (JS/TS deletion) + T18b (`package.json` cleanup, or fold into T19).
   - **T29** → T29a (fallback/device/onboarding icons) + T29b (Gemini/design-system icons).

7. **Fleet-wide testing gate:**
   - Add `"T32"` to the `dependencies` of every task whose verification adds a new test, OR
   - Add a top-level note that T32 is a fleet-wide prerequisite and no verification task should be started before T32 is green.

8. **Fix unrealistic verification for build tasks:**
   - For T03 and T19, change verification from a Jest test to a build-step gate, or soften acceptance criteria to "build script/config is correct" with a separate CI build job.
   - For T32, change verification to run `npm test` and assert exit code 0, or split into a CI gate task.

---

*Report generated from registry.json and source-tree verification on 2026-06-16.*
