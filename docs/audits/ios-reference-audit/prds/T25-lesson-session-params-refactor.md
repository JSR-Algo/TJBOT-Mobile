# T25: Extract LessonSessionParams and normalize route param types

## Status
Registry status: NOT_STARTED | Priority: P2 | Blast radius: LOW

## Problem
`src/navigation/routes.ts` is the single source of truth for the `RootStackParamList`, but the lesson-session branch repeats the same ~15-field param shape 23 times and uses the `undefined | { ... }` style for optional params across the file:

- Lines 66–89 declare 24 lesson-session screens (`ConnectingScreen` through `ReconnectingScreen`). All but `LessonDoneScreen` repeat the identical object shape: `courseId`, `courseTitle`, `unitId`, `unitTitle`, `lessonId`, `lessonTitle`, `contentVersion`, `mode`, `activityIndex`, `activityTotal`, `beatIndex`, `lastPrompt`, `lastAcceptedProgress`, `voiceStateBeforeInterruption`, and `resumeReason`.
- `LessonDoneScreen` (line 76) is the same shape plus an extra `wordsLearned?: number` field.
- Many non-lesson routes (e.g., `CourseScreen: undefined | { courseId?: string }` at line 22, `OrderConfirmScreen` at line 49, `ReconnectingOverlay` at line 158) also use `undefined | { ... }` for optional params, which is more verbose than the React Navigation convention of `{ field?: Type }`.
- `src/navigation/types.ts` (line 86) still exposes a `LearningStackParamList` legacy extension, but `src/navigation/routes.ts` itself is the active authority for the root param list.

Sources:
- `docs/audits/ios-reference-audit/reports/navigation-screens.md#improvements` (lesson-session params duplicated 23 times, lines 126–129)
- `docs/audits/ios-reference-audit/reports/navigation-screens.md#simplifications` (`undefined | { ... }` optional param style, lines 133–135)

## Scope
### In scope
- `src/navigation/routes.ts`
  - Extract a reusable `LessonSessionParams` type.
  - Refactor all 24 lesson-session screen declarations to reuse it.
  - Preserve the extra `wordsLearned?: number` capability on `LessonDoneScreen`.
  - Normalize every `undefined | { ... }` optional param declaration to `{ ... }`.
  - Keep no-param screens as `undefined`.
- `tests/verification/T25-lesson-session-params-refactor.test.ts`
  - Source-level assertions that the refactor landed as specified.

### Out of scope
- `src/navigation/types.ts` — legacy `LearningStackParamList` cleanup is T22.
- `src/features/lesson-session/screens/*` — screen implementations do not change; any navigation call sites that need a mechanical `{}` argument because of the `undefined` removal are updated only to restore `npm run typecheck`.
- `src/navigation/ModalNavigator.tsx`, `src/navigation/linking.ts`, `src/navigation/AppNavigator.tsx` — unrelated navigation tasks.
- `nav-graph-data.json` — covered by T24.
- Runtime behavior changes.

## Proposed solution
1. **Extract the common lesson-session shape.** Add a top-level type in `src/navigation/routes.ts`:
   ```ts
   export type LessonSessionParams = {
     courseId?: string;
     courseTitle?: string;
     unitId?: string;
     unitTitle?: string;
     lessonId?: string;
     lessonTitle?: string;
     contentVersion?: string;
     mode?: 'lesson' | 'review' | 'mission';
     activityIndex?: number;
     activityTotal?: number;
     beatIndex?: number;
     lastPrompt?: string;
     lastAcceptedProgress?: number;
     voiceStateBeforeInterruption?: string;
     resumeReason?:
       | 'normal'
       | 'reconnecting'
       | 'audio_error'
       | 'timed_out'
       | 'exit_confirm'
       | 'parent_stopped'
       | 'cost_capped'
       | 'abandoned_disconnect';
   };
   ```
2. **Refactor lesson-session screen declarations.** Replace the 23 identical declarations with:
   ```ts
   ConnectingScreen: LessonSessionParams | undefined;
   GreetingScreen: LessonSessionParams | undefined;
   // ... etc.
   ```
   For `LessonDoneScreen`, preserve the extra field with an intersection:
   ```ts
   LessonDoneScreen: LessonSessionParams & { wordsLearned?: number } | undefined;
   ```
   Keeping `| undefined` preserves existing navigation calls that omit params entirely (e.g., `navigation.navigate('ConnectingScreen')`).
3. **Normalize optional param unions.** Convert every remaining `ScreenName: undefined | { ... }` to `ScreenName: { ... }`. This includes course, course-library, purchase, lesson-demo, device/pairing, parent, fallback, and modal screens. Screens that genuinely accept no params remain `ScreenName: undefined;`.
4. **Clean up inline imports (optional but recommended).** Move the inline `import('@/features/lessonDemo/types').LessonAgeBand` and `import('@/features/fallback/recoveryTypes').*` type references to top-level `import type` statements so the param list object is easier to scan.
5. **Run typecheck and fix call sites mechanically.** Because removing `undefined |` from object-style params can make `navigate('ScreenName')` calls without a params argument fail, run `npx tsc --noEmit` and add `{}` where the compiler requires it. Do not change screen logic.
6. **Run the verification test.** `npx jest tests/verification/T25-lesson-session-params-refactor.test.ts` must pass.

## Acceptance criteria
1. A `LessonSessionParams` type is extracted and reused across all lesson-session screens.
2. Optional route params use `{ field?: string }` instead of `undefined | { field?: string }`.
3. TypeScript still type-checks all navigation calls.

## Dependencies
- **T17** (`wire-gemini-conversation-screen`) is a conditional dependency. If the SHIP_GEMINI decision (T00) is chosen, T17 may add a Gemini route to `routes.ts`; coordinate ordering so T25’s refactor does not conflict with the new route. If Gemini is removed (T18/T19), no dependency applies.
- T32 (fix-failing-test-baseline) is a fleet-wide integration prerequisite per registry notes; ensure the unit-test baseline is green before relying on verification results.

## Exclusions / anti-overlap
- **T17** may edit `routes.ts` to add a Gemini route. Do not land T17 and T25 in parallel without first agreeing on the final route list.
- **T22** deletes legacy `src/screens/*` and `src/app/screens/*` but does not touch `routes.ts`.
- **T23**, **T24**, **T26**, and **T27** touch other navigation files; they should not edit `routes.ts` while T25 is in flight.
- **T01** touches `package.json`; no overlap with `routes.ts`.

## Verification test plan
- Test file: `tests/verification/T25-lesson-session-params-refactor.test.ts`
- What it proves: `src/navigation/routes.ts` exports `LessonSessionParams`, every lesson-session screen declaration references it, the verbose `undefined | { ... }` pattern is gone, and the repeated inline fields are no longer scattered across the file.
- How to run it: `npx jest tests/verification/T25-lesson-session-params-refactor.test.ts`
- Expected state before fix: FAIL
- Expected state after fix: PASS
- Additional gate: `npx tsc --noEmit` must pass to confirm all navigation calls still type-check.

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Removing `undefined |` from object param types breaks existing `navigate('ScreenName')` calls without params. | Run `npx tsc --noEmit`; add `{}` to those calls mechanically. Do not change screen behavior. |
| `LessonDoneScreen` loses `wordsLearned` if folded into the base type without the intersection. | Use `LessonSessionParams & { wordsLearned?: number } \| undefined` for `LessonDoneScreen`. |
| A Gemini route is added to `routes.ts` in parallel. | Confirm T00/T17 status before editing; land T17 first or defer T25 until route list is stable. |
| `nav-graph-data.json` or route-coverage scripts assume the literal string shape in `routes.ts`. | These tools consume `ROUTE_MAP` / screen file paths, not param literal text; still run `npm run check:route-coverage` and `npm run check:screen-prop-types` after the change. |
| Refactor touches screens outside the stated scope. | Only mechanical `{}` additions to call sites are in scope; no screen logic changes. |

## Coordination notes
No cross-role coordination required. Coordinate with the T17 owner if the SHIP_GEMINI branch is selected, because a new route entry in `routes.ts` would be edited by both tasks.

## Implementation hints
- Read `src/navigation/routes.ts` lines 1–160 before editing. The lesson-session block is lines 66–89.
- Read `docs/audits/ios-reference-audit/reports/navigation-screens.md` lines 126–135 for the audit recommendation.
- Keep the exported `ROUTES` constant and the `satisfies` clause unchanged; only the `RootStackParamList` type shape changes.
- The verification test reads `routes.ts` as text. After the refactor, no line should contain `undefined | {`; the only occurrence of `voiceStateBeforeInterruption` should be inside the `LessonSessionParams` definition.
