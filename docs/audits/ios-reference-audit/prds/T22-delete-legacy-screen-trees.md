# T22: Delete legacy screen trees and phantom aliases

## Status
Registry status: `NOT_STARTED` | Priority: `P1` | Blast radius: `LOW`

## Problem
The mobile codebase still ships two legacy screen trees that are not registered in the feature-owned navigation registry and that reference stale route names.

- `src/screens/*` contains a dead legacy screen tree:
  - `src/screens/dashboard/ParentDashboardScreen.tsx` hard-codes navigation to `LessonPlanner` and `LessonDemo` (lines 87–97), routes that are no longer part of `RootStackParamList`.
  - `src/screens/learning/ChildPracticeScreen.tsx` imports `LearningScreenProps<'ChildPractice'>` from `src/navigation/types.ts` (line 4) and references the `ChildPractice` route (line 35).
  - `src/screens/learning/LessonPlannerScreen.tsx` imports `LearningScreenProps<'LessonPlanner'>` (line 11) and navigates to `ChildPractice` (lines 154 and 213).
  - These files are not listed in any feature `navigation.ts` and only add compile weight and confusion.

- `src/app/screens/*` contains phantom aliases that re-export canonical feature screens:
  - `src/app/screens/SpeakScreen.tsx` re-exports `UserSpeakingScreen` (line 4).
  - `src/app/screens/ListenScreen.tsx` re-exports `RobotListeningScreen` (line 4).
  - `src/app/screens/DevicePairWifiScreen.tsx` re-exports `PairWifiScreen` (line 5).
  - The production navigation tree (`FEATURE_NAVIGATION_REGISTRY`) does not use these aliases, and `src/navigation/README.md` documents them as retired aliases (lines 149–150).

- `src/navigation/types.ts` still exports a legacy param list and props type that only the dead screens use:
  - Lines 86–95 define `LearningStackParamList` and `LearningScreenProps`.
  - The registry names them `LegacyMainStackParamList` / `MainStackScreenProps`; the actual symbol names in the current snapshot are `LearningStackParamList` / `LearningScreenProps`.

Audit sources:
- `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/reports/navigation-screens.md#improvements` (lines 87–106)
- `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/reports/navigation-screens.md#top-3-quick-wins` (line 167)

## Scope

### In scope
Files and symbols to delete or clean up:

- `src/screens/dashboard/ParentDashboardScreen.tsx`
- `src/screens/learning/ChildPracticeScreen.tsx`
- `src/screens/learning/LessonPlannerScreen.tsx`
- `src/app/screens/SpeakScreen.tsx`
- `src/app/screens/ListenScreen.tsx`
- `src/app/screens/DevicePairWifiScreen.tsx`
- `src/app/screens/` directory (remove after deleting the three alias files)
- `src/navigation/types.ts` — remove `LearningStackParamList` and `LearningScreenProps` exports
- `tests/screens/LessonPlannerScreen.test.tsx` — delete; it imports and tests the three legacy screens
- Empty parent directories (`src/screens/dashboard/`, `src/screens/learning/`) may be removed if they contain no other files

### Out of scope
- `src/screens/robot-lesson/RobotLessonControlScreen.tsx` and the `src/screens/robot-lesson/` directory (still imported by `src/features/lessonDemo/navigation.ts` and not listed in the registry scope)
- `src/navigation/routes.ts`
- `src/features/**`
- `src/app/providers/*`
- `src/api/learning.ts`, `src/api/client.ts`, and other API shims
- `src/navigation/inventory.ts` metadata strings (they already record the aliases as deleted)
- Deep-link or notification route handling (owned by T23)
- Any behavioral replacement for the deleted screens; this is pure cleanup

## Proposed solution

1. **Delete the legacy screen files**
   - Remove `src/screens/dashboard/ParentDashboardScreen.tsx`
   - Remove `src/screens/learning/ChildPracticeScreen.tsx`
   - Remove `src/screens/learning/LessonPlannerScreen.tsx`
   - Remove `src/app/screens/SpeakScreen.tsx`
   - Remove `src/app/screens/ListenScreen.tsx`
   - Remove `src/app/screens/DevicePairWifiScreen.tsx`

2. **Remove empty directories**
   - After deleting the three alias files, remove `src/app/screens/`.
   - Remove `src/screens/dashboard/` and `src/screens/learning/` if empty.
   - Do **not** remove `src/screens/` itself because `src/screens/robot-lesson/RobotLessonControlScreen.tsx` is out of scope and still referenced.

3. **Clean up `src/navigation/types.ts`**
   - Delete the `LearningStackParamList` type (lines 86–91).
   - Delete the `LearningScreenProps` type (lines 93–95).
   - Keep all other exports (`FeatureRouteOwner`, `FeatureStackScreen`, `FeatureNavigationConfig`, etc.).

4. **Delete the obsolete unit test**
   - Remove `tests/screens/LessonPlannerScreen.test.tsx`; it cannot compile once the screens it tests are deleted.

5. **Verify no remaining references**
   - Run `npx tsc --noEmit`.
   - Run `npx jest tests/navigation/`.
   - Run the T22 verification test: `npx jest tests/verification/T22-delete-legacy-screen-trees.test.ts`.

## Acceptance criteria
1. Legacy screen files and the `src/app/screens` directory are deleted.
2. `LearningStackParamList` and `LearningScreenProps` are removed from `src/navigation/types.ts`.
3. No production source file imports any deleted symbol or legacy screen path.
4. `npm run typecheck` and navigation tests pass.

## Dependencies
None.

## Exclusions / anti-overlap
- **T23 — deep-link fallback logging**: T23 changes `src/navigation/linking.ts` and `AppNavigator.tsx`; it does not touch the legacy screen files or `src/navigation/types.ts`, so there is no file-level overlap.
- **T25 — lesson-session params refactor**: T25 edits `src/navigation/routes.ts`, which is explicitly out of scope for T22.
- **T18/T19 — Gemini deletion**: These tasks may delete Gemini-related JS/native modules but do not intersect with the legacy screen trees in `src/screens/` or `src/app/screens/`.
- **T32 — fix failing test baseline**: T32 touches broad test mocks and scripts, not the legacy screen files.

## Verification test plan
- **Test file:** `tests/verification/T22-delete-legacy-screen-trees.test.ts`
- **What it proves:** The legacy screen files and phantom alias directory are gone, the legacy param-list/props exports are removed from `src/navigation/types.ts`, no production source file still imports the deleted symbols, and the obsolete `tests/screens/LessonPlannerScreen.test.tsx` has been removed.
- **How to run it:** `npx jest tests/verification/T22-delete-legacy-screen-trees.test.ts`
- **Expected state before fix:** FAIL
- **Expected state after fix:** PASS

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| `tests/screens/LessonPlannerScreen.test.tsx` breaks after the screen files are deleted. | Delete the obsolete test as part of this task; it tests only dead screens. |
| A deep link, notification payload, or external reference still points to `LessonPlanner`, `ChildPractice`, `LessonDemo`, `SpeakScreen`, `ListenScreen`, or `DevicePairWifiScreen`. | Before merging, grep `src/navigation/linking.ts`, notification handlers, and marketing-link configs for these names. T23 adds a fallback for unknown links. |
| `src/navigation/types.ts` is imported by unexpected callers. | Run `npx tsc --noEmit` after removing the legacy types; TypeScript will surface any remaining consumers. |
| `src/screens/robot-lesson/RobotLessonControlScreen.tsx` is accidentally deleted because it lives under `src/screens/`. | Keep it out of scope; do not delete the `src/screens/` root. The verification test asserts only the specific legacy files are gone. |

## Coordination notes
No cross-role coordination required (`coordination_required: false`).

Optional product check: confirm that no live marketing links or push-notification campaigns reference the deleted route names (`LessonPlanner`, `ChildPractice`, `LessonDemo`, `SpeakScreen`, `ListenScreen`, `DevicePairWifiScreen`).

## Implementation hints
- The audit report uses the names `LegacyMainStackParamList` / `MainStackScreenProps`, but the current code uses `LearningStackParamList` / `LearningScreenProps` in `src/navigation/types.ts`. Remove whichever names are present.
- Use `grep -R "ParentDashboardScreen\|ChildPracticeScreen\|LessonPlannerScreen\|LearningScreenProps\|LearningStackParamList" src/` after deletion to confirm no references remain.
- `src/features/lessonDemo/navigation.ts` imports `RobotLessonControlScreen` from `../../screens/robot-lesson/RobotLessonControlScreen`; that path must keep working, so do not remove `src/screens/robot-lesson/`.
- `tests/navigation/no-phantom-routes.test.ts` already asserts the route map does not expose the alias routes; it should continue to pass without changes.
