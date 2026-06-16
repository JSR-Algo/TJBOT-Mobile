# Registry Fixes Applied

This file summarizes the changes applied to `registry.json` based on the concrete recommendations in `registry-validation.md`.

## Changes Made

1. **Added meta task `T00-gemini-voice-decision`** at the top of the tasks array.
   - Status: `BLOCKED`, Priority: `P0`, `coordination_required: true`
   - Scope is empty; acceptance criteria capture the `SHIP_GEMINI` / `REMOVE_GEMINI` outcome.
   - Notes state that `T17-T21` are gated by this decision.

2. **Blocked Gemini fork tasks** `T17`, `T18`, `T19`, `T20`, `T21`.
   - Set status to `BLOCKED`.
   - Added `T00` to each task's `dependencies`.

3. **Added missing dependencies**:
   - `T07` now depends on `T04`
   - `T15` now depends on `T12`
   - `T34` now depends on `T33`
   - `T16` now depends on `T10`

4. **Resolved `T08`/`T01` overlap**:
   - Removed `src/config.ts` and `src/__env__.ts` from `T08.scope`.
   - Added a note that `T08`'s WS URL work uses the canonical schema established by `T01`.

5. **Gemini fork cross-references**:
   - Added `T18` to `T14.exclusions`.
   - Added `T17` to `T25.dependencies` with a conditional note (only if Gemini is kept).

6. **Fixed `T19` Android wildcard casing**:
   - Replaced PascalCase Android directory names with lowercase in `scope`:
     - `VoiceMic` → `voicemic`
     - `PcmStream` → `pcmstream`
     - `VoiceSession` → `voicesession`
   - Updated the first acceptance criterion to reference lowercase Android directories.

7. **Fixed `T32` verification design**:
   - Changed `verification.test_file` to `scripts/verification/T32-fix-failing-test-baseline.js`.
   - Changed `verification.test_command` to `node scripts/verification/T32-fix-failing-test-baseline.js`.
   - Updated acceptance criteria to state the gate is `npm test` exiting 0, with unit test fixes as implementation.
   - Added a top-level registry note that `T32` is a fleet-wide integration prerequisite.

8. **Added native `build_gate` fields for build tasks**:
   - `T03.build_gate`: `npx react-native run-android`
   - `T19.build_gate`: `npx react-native run-android && npx react-native run-ios`
   - Updated both task notes to clarify that the Jest test asserts config correctness while the build gate asserts native compilation.

9. **Added `T20` legal/safety note**:
   - Notes now explicitly state that legal/safety must approve blocklist content before merge and that the verification test only checks structure/count.

10. **Added `T24` escalation note**:
    - Notes now state that the edge-population acceptance criterion is a product/tech-debt decision that may need escalation.

11. **Validated all `dependencies` arrays**:
    - Removed any duplicates and ensured every dependency references an existing task ID.

## What Was NOT Changed

- `T18` and `T29` were **not** split into sub-tasks per the "What NOT to do" instruction.
- Existing task IDs were **not** renumbered.

## Remaining Risks

- `T18` and `T29` remain oversized (12 and 11 scope items respectively). They are flagged in notes but still large PRs; PRD agents should plan internal phases.
- The Gemini fork is now gated by `T00`, but the actual product/legal decision has not been made; `T17-T21` must stay `BLOCKED` until it is.
- `T25` now conditionally depends on `T17`; fleet planners must respect the `SHIP_GEMINI` / `REMOVE_GEMINI` outcome when scheduling.
- `T32` is documented as a fleet-wide prerequisite but is not injected into every task's `dependencies`; planners must enforce the top-level note.
- The new `build_gate` fields (`T03`, `T19`) and `T32` script path are registry metadata only; the actual scripts/commands must still be authored in the project.
