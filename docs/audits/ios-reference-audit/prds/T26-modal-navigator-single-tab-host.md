# T26: Refactor ModalNavigator to a single MainTabNavigator

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: HIGH

## Problem
`ModalNavigator` currently mounts five independent `MainTabNavigator` instances — one per bottom-tab route (`Home`, `Devices`, `Library`, `Progress`, `Profile`).

- `src/navigation/ModalNavigator.tsx` lines 29 and 55–74 map `MAIN_TAB_SCREENS` to a `Stack.Screen` for each tab, and each screen renders its own `<MainTabNavigator initialTabName={screen.tabName} ... />`.
- `src/navigation/MainTabNavigator.tsx` lines 33–48 then wrap every tab screen in a `createTabRouteScreen` closure that synthesizes a fake `route` object and threads `initialRouteName` / `initialRouteParams` through every host.

Audit source: `docs/audits/ios-reference-audit/reports/navigation-screens.md#improvements` and `#bottlenecks` (lines 120–124 and 147–149).

This creates five parallel React Navigation state machines and tab bars instead of one. It bloats memory on low-end iOS devices, complicates deep-link state handling, and forces the app to thread deep-link params into every host. Reference iOS projects (Swiftfin, Element X, LiveContainer) all use a single tab host.

## Scope

### In scope
- `src/navigation/ModalNavigator.tsx` — replace per-tab screen mapping with a single `MainTabNavigator` screen.
- `src/navigation/MainTabNavigator.tsx` — consume a single active-tab prop / route param and remove the per-host closure.
- `tests/navigation/modal-usage.test.ts` — update if it asserts the old tab-host-per-route structure.
- `tests/navigation/main-tab-active-state.test.tsx` — update if it depends on five hosts.
- `tests/verification/T26-modal-navigator-single-tab-host.test.tsx` — new regression test (this deliverable).

### Out of scope
- `src/navigation/routes.ts` — route shape changes belong to T25.
- `src/navigation/featureRegistry.ts` — tab metadata is unchanged.
- `src/navigation/types.ts` — type shape is unchanged unless required by T25.
- Individual tab screen components.
- Deep-link parser / `linking.ts` path mapping (handled by T23).
- `HouseholdContext` / auth routing decisions.

## Proposed solution

1. **Single tab host screen in `ModalNavigator.tsx`.**
   - Remove `MAIN_TAB_SCREENS.map(renderTabHostScreen)` (line 29).
   - Remove `renderTabHostScreenWithInitial` (lines 55–74).
   - Add one `Stack.Screen` that renders `MainTabNavigator` as its `component`.
   - Keep `renderStackScreen` and `initialParamsFor` for protected stack/modal routes.

2. **Pass the active tab into the host via route params.**
   - Derive the target `FeatureTabName` from `initialRouteName` using the existing `MAIN_TAB_SCREENS` metadata.
   - Set `initialParams={{ initialTabName: targetTabName, ...initialRouteParams }}` on the single `MainTabNavigator` screen.

3. **Update `MainTabNavigator.tsx` to read the active tab.**
   - Read `initialTabName` from props (or from `useRoute().params.initialTabName`) and use it as the bottom-tabs `initialRouteName`.
   - Remove the synthetic `route` object in `createTabRouteScreen`; let each tab screen receive the real React Navigation route via `useRoute` if needed.

4. **Update tests that assume the old structure.**
   - `tests/navigation/modal-usage.test.ts` currently does not assert the host count, but verify after the change.
   - `tests/navigation/main-tab-active-state.test.tsx` tests icon styling and should keep working; confirm it does not rely on duplicate hosts.
   - `tests/navigation/route-map.test.ts` line 66 expects `MAIN_TAB_SCREENS.map(renderTabHostScreen)`; this will need to change to a single-host assertion.

5. **Shape of the expected fix (illustrative only).**

   ```tsx
   // ModalNavigator.tsx
   <Stack.Navigator initialRouteName={initialRouteName} screenOptions={PROTECTED_STACK_SCREEN_OPTIONS}>
     <Stack.Screen
       name="MainTabHost"
       component={MainTabNavigator}
       initialParams={{
         initialTabName: targetTabNameFrom(initialRouteName),
         ...initialRouteParams,
       }}
     />
     {PROTECTED_STACK_SCREENS.map(renderProtectedStackScreen)}
     <Stack.Group screenOptions={MODAL_STACK_SCREEN_OPTIONS}>
       {PROTECTED_MODAL_SCREENS.map(renderProtectedStackScreen)}
     </Stack.Group>
   </Stack.Navigator>
   ```

   ```tsx
   // MainTabNavigator.tsx
   export function MainTabNavigator({ initialTabName }: Props): React.JSX.Element {
     const route = useRoute<RouteProp<RootStackParamList, 'MainTabHost'>>();
     const activeTab = initialTabName ?? route.params?.initialTabName ?? DEFAULT_MAIN_TAB_NAME;
     // ... render <Tab.Navigator initialRouteName={activeTab}> ...
   }
   ```

## Acceptance criteria
1. `ModalNavigator` contains a single `MainTabNavigator` instance.
2. Route params select the active tab on deep-link entry (e.g., a deep link to `DeviceOverviewScreen` lands on the `Devices` tab).
3. Existing tab-level navigation tests are updated and pass.
4. Memory snapshot / render tree shows only one tab host mounted at a time.
5. `npm test` and `npm run typecheck` pass after the changes.

## Dependencies
- **T25 — `lesson-session-params-refactor`**: T25 normalizes optional route param shapes in `routes.ts`. Any new route-param contract used to thread the active tab through `ModalNavigator` should reuse the patterns established by T25. Implement T25 first, or coordinate closely with its owner.

## Exclusions / anti-overlap
- **T28 — `unify-token-surface`**: Will touch `MainTabNavigator.tsx` token imports. Do not migrate tokens here; leave that to T28.
- **T29 — `centralize-icon-library`**: Will replace inline tab icons. Do not change icon wiring here.
- **T17 / T25 / T23**: Route additions or deep-link fallback logic should not be duplicated here.

## Verification test plan
- **Test file:** `tests/verification/T26-modal-navigator-single-tab-host.test.tsx`
- **What it proves:**
  - `ModalNavigator` renders exactly one `MainTabNavigator` host regardless of which protected route is the entry point.
  - The single host receives the correct active tab name derived from the entry route params.
- **How to run it:** `npx jest tests/verification/T26-modal-navigator-single-tab-host.test.tsx`
- **Expected state before fix:** FAIL — the current code renders five `MainTabNavigator` hosts and passes `initialTabName: 'Home'` for the first host.
- **Expected state after fix:** PASS — one host is rendered and its `initialTabName` matches the tab of the requested entry route.

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Existing tests (`route-map.test.ts`, `root-navigator.test.tsx`) assert the old multi-host structure. | Update those tests as part of this task; do not land the source change without fixing the test suite. |
| Deep-link params may be dropped when only one host keeps state. | Pass `initialRouteParams` into the host’s `initialParams` and preserve the original `initialRouteName` for non-tab protected routes. |
| `MainTabNavigator` currently synthesizes a fake `route` object for each tab screen; removing it may break screens that rely on `route.params`. | Replace the synthetic route with real React Navigation routing inside a single host; tab screens already use `useRoute` in most places. |
| Bottom-tabs `initialRouteName` only affects first mount; switching tabs afterwards must remain interactive. | Keep `MAIN_TAB_SCREENS.map` inside `MainTabNavigator` for tab definitions; only `initialRouteName` changes. |
| Auth / onboarding remounts the protected branch with a new `key`; the single host must reset state. | `RootStackNavigator` already keys `ModalNavigator` with `key="protected"`; verify the host resets on key change. |

## Coordination notes
- No external role coordination required per registry.
- Coordinate with T25 owner if the active-tab route-param contract conflicts with the optional-param normalization.

## Implementation hints
- Read `src/navigation/ModalNavigator.tsx` lines 21–75 and `src/navigation/MainTabNavigator.tsx` lines 33–102 first.
- `MAIN_TAB_SCREENS` in `src/navigation/featureRegistry.ts` already maps each tab route name to its `tabName`; use it to derive `targetTabNameFrom(initialRouteName)`.
- `DEFAULT_MAIN_TAB_NAME` is exported from `featureRegistry.ts` and can remain the fallback.
- If `MainTabNavigator` is updated to read `route.params`, add a matching route entry in `routes.ts` for the host screen name (e.g., `MainTabHost: { initialTabName?: FeatureTabName }`). T25 is the right place to land that type change; this task should not expand `routes.ts` independently.
- Run `npm run test:navigation` after the fix to catch structural test regressions early.
