# navigation-screens Audit

## Scope

Route organization, deep links, modal usage, screen ownership, prop types, and navigation state vs URL for the TJBot-mobile React Native app.

## Files reviewed

### TJBot-mobile navigation core
- `src/navigation/README.md`
- `src/navigation/AppNavigator.tsx`
- `src/navigation/RootStackNavigator.tsx`
- `src/navigation/MainTabNavigator.tsx`
- `src/navigation/AuthNavigator.tsx`
- `src/navigation/OnboardingNavigator.tsx`
- `src/navigation/ModalNavigator.tsx`
- `src/navigation/types.ts`
- `src/navigation/routes.ts`
- `src/navigation/routeMap.ts`
- `src/navigation/routeOwnership.ts`
- `src/navigation/options.ts`
- `src/navigation/linking.ts`
- `src/navigation/featureRegistry.ts`
- `src/navigation/featureRouteEntries.ts`
- `src/navigation/inventory.ts`
- `src/navigation/AgeScreen.tsx`
- `src/app/RootNavigator.tsx`
- `nav-graph-data.json`

### Feature navigation metadata
- `src/features/auth/navigation.ts`
- `src/features/onboarding/navigation.ts`
- `src/features/home/navigation.ts`
- `src/features/course/navigation.ts`
- `src/features/course-library/navigation.ts`
- `src/features/purchase/navigation.ts`
- `src/features/lesson-session/navigation.ts`
- `src/features/progress/navigation.ts`
- `src/features/parent/navigation.ts`
- `src/features/device/navigation.ts`
- `src/features/robot-mgmt/navigation.ts`
- `src/features/fallback/navigation.ts`

### Representative screens
- `src/features/home/screens/HomeHubScreen.tsx`
- `src/features/auth/screens/LoginScreen.tsx`
- `src/features/course-library/UnlockConfirmModal.tsx`
- `src/features/fallback/ReconnectingOverlay.tsx`
- `src/app/screens/SpeakScreen.tsx`
- `src/app/screens/ListenScreen.tsx`
- `src/app/screens/DevicePairWifiScreen.tsx`
- `src/screens/dashboard/ParentDashboardScreen.tsx`
- `src/screens/learning/ChildPracticeScreen.tsx`
- `src/screens/learning/LessonPlannerScreen.tsx`
- `src/features/lesson-demo/screens/RobotLessonControlScreen.tsx`

### Navigation tests
- `tests/navigation/navigation-architecture.test.ts`
- `tests/navigation/type-safe-feature-navigation.test.ts`
- `tests/navigation/route-ownership.test.ts`
- `tests/navigation/notification-linking.test.ts`
- `tests/navigation/modal-usage.test.ts`
- `tests/navigation/route-reachability.test.ts`
- `tests/navigation/state-machine-route-alignment.test.ts`

### Reference cards
- `docs/reference/ios/extractions/element-hq__element-x-ios.md`
- `docs/reference/ios/extractions/jellyfin__Swiftfin.md`
- `docs/reference/ios/extractions/tnantoka__edhita.md`
- `docs/reference/ios/extractions/permissionlesstech__bitchat.md`
- `docs/reference/ios/extractions/LiveContainer__LiveContainer.md`

## Reference benchmarks

- **element-hq/element-x-ios** uses a hierarchy of flow coordinators (`AppCoordinator`, `AuthenticationFlowCoordinator`, `UserSessionFlowCoordinator`) backed by state machines, with SwiftUI `navigationDestination` driven by route enums. Deep links are resolved inside the coordinator layer, not just by URL-to-screen mapping.
- **jellyfin/Swiftfin** defines a value-type `NavigationRoute` abstraction (id, style `.sheet`, etc.) and composes flows through `RootCoordinator`/`TabCoordinator`. Auth gating is explicit via `WithUserAuthentication`, and the root view swaps among loading/server-check/user-selection/main-tab states.
- **tnantoka/edhita** is a minimal SwiftUI example: a single `NavigationView` with a file-list/detail push pattern. Useful as a contrast — it shows how much simpler a navigation model can be when the app does not need feature ownership, deep links, or state-machine alignment.
- **permissionlesstech/bitchat** keeps high-level state in `AppRuntime` and dispatches deep links through `runtime.handleOpenURL(_:)`. UI state is derived from central observable models, so the navigation surface is thin.
- **LiveContainer/LiveContainer** uses a standard SwiftUI `TabView`/`NavigationView` shell and routes URLs through `.onOpenURL`. It demonstrates the simplest robust pattern: one tab host plus URL dispatch.

Compared with these, TJBot-mobile has a very strong feature-owned registry and excellent test coverage, but it is over-engineered in a few places and still carries dead legacy code.

## Findings

### Improvements

- **`src/screens/*` still contains a dead legacy screen tree.**
  - `src/screens/dashboard/ParentDashboardScreen.tsx` navigates to hard-coded routes `LessonPlanner` and `LessonDemo` (lines 87–97) that are no longer in `RootStackParamList`.
  - `src/screens/learning/ChildPracticeScreen.tsx` imports `MainStackScreenProps<'ChildPractice'>` (line 35) and references route `ChildPractice`.
  - `src/screens/learning/LessonPlannerScreen.tsx` imports `MainStackScreenProps<'LessonPlanner'>` (line 71) and references route `ChildPractice` (line 154).
  - These files are not registered in any feature `navigation.ts` and only add compile weight and confusion.
  - **Why it matters:** Dead screens with stale route names leak old navigation assumptions and make it harder for new engineers to trust `RootStackParamList` as the source of truth.
  - **Recommended change:** Delete `src/screens/` and its four files; update any remaining imports.

- **`src/app/screens/*` phantom aliases are still present but unregistered.**
  - `src/app/screens/SpeakScreen.tsx` re-exports `UserSpeakingScreen` (line 4).
  - `src/app/screens/ListenScreen.tsx` re-exports `RobotListeningScreen` (line 4).
  - `src/app/screens/DevicePairWifiScreen.tsx` re-exports `PairWifiScreen` (line 5).
  - `src/navigation/README.md` lists these as deleted legacy aliases and `src/app/screens` is referenced as a merged legacy path.
  - **Why it matters:** The production navigation tree (`FEATURE_NAVIGATION_REGISTRY`) does not use these aliases, but their continued existence contradicts the documented state of the migration.
  - **Recommended change:** Delete `src/app/screens/*` and the `src/app/screens` directory.

- **`src/navigation/types.ts` exports a `LegacyMainStackParamList` that only the dead screens use.**
  - Lines 84–93 define `LegacyMainStackParamList` extending `RootStackParamList` with `LessonPlanner`, `ChildPractice`, `LessonDemo`, and `Progress`, plus `MainStackScreenProps`.
  - **Why it matters:** A legacy param list in the production navigation types file is a direct violation of the "no legacy app-navigation system" invariant stated in `src/navigation/README.md`.
  - **Recommended change:** Remove `LegacyMainStackParamList` and `MainStackScreenProps`; migrate any still-needed helpers to use `RootStackParamList`.

- **Deep links that do not match any known path are silently dropped.**
  - In `src/navigation/linking.ts`, `navigationTargetForDeepLinkUrl` returns `null` for unknown paths (lines 62–69) and `shouldHandleDeepLinkManually` only returns `true` for dynamic notification paths (lines 71–76).
  - In `src/navigation/AppNavigator.tsx`, `handleDeepLinkUrl` returns early when `navigationTargetForDeepLinkUrl(url)` is null (lines 18–21) with no logging or fallback.
  - **Why it matters:** References like Swiftfin, Element X, Bitchat, and LiveContainer all route unknown/invalid URLs to a fallback or at least log them. Silent dropping makes debugging marketing links, misconfigured notifications, and user-reported routing bugs harder.
  - **Recommended change:** Add a `NotFoundScreen` or fallback route and route unrecognized `TJBot://` URLs there; log the unknown path to Sentry/analytics.

- **`nav-graph-data.json` is a large parallel source of route-to-state mapping that is not validated against `ROUTE_MAP`.**
  - `nav-graph-data.json` contains 978 lines mapping state IDs to screen file paths and titles.
  - `src/navigation/inventory.ts` and the navigation tests verify `route-mapping.json`, `navigation-tree.mmd`, and `navigation-forward-edges.json`, but none of them check `nav-graph-data.json`.
  - **Why it matters:** Drift between the runtime registry and the graph data will break any script or visualization that consumes the graph.
  - **Recommended change:** Either generate `nav-graph-data.json` from `ROUTE_MAP` + feature states, or add a test that asserts every entry maps to the same screen file recorded in `ROUTE_MAP`.

- **`ModalNavigator` mounts a separate `MainTabNavigator` for every tab route.**
  - `src/navigation/ModalNavigator.tsx` lines 29 and 55–74 create one tab host per tab (`Home`, `Devices`, `Library`, `Progress`, `Profile`).
  - `src/navigation/MainTabNavigator.tsx` lines 33–48 then wraps each screen in a `createTabRouteScreen` closure that synthesizes a `route` object and threads `initialRouteName`/`initialRouteParams` through every host.
  - **Why it matters:** This creates five independent bottom-tab navigator instances instead of one. It bloats memory, complicates state inspection, and forces the app to thread deep-link params into every host. LiveContainer and Swiftfin both use a single tab host.
  - **Recommended change:** Refactor `ModalNavigator` to contain a single `MainTabNavigator` and use route params to select the active tab on deep-link entry. This is a larger change because several tests assert the current tab-host-per-route structure.

- **Lesson-session route params are duplicated 23 times in `routes.ts`.**
  - Lines 58–82 repeat the same ~15-field `undefined | { courseId?; courseTitle?; unitId?; ... resumeReason?; }` shape for every lesson-session screen.
  - **Why it matters:** Repetition invites mismatched optional/nullable shapes and makes the central route type file unnecessarily large.
  - **Recommended change:** Extract a `LessonSessionParams` type and reuse it: `ConnectingScreen: LessonSessionParams | undefined;`.

### Simplifications

- **`src/navigation/routes.ts` uses `undefined | { ... }` for optional params.**
  - Many routes (e.g., `CourseScreen: undefined | { courseId?: string }` at line 22) declare params as `undefined | object`. React Navigation convention is simply `{ courseId?: string }`; the params object is always present when the screen is mounted.
  - **Simpler alternative:** Drop the `undefined |` union for routes that accept optional params. This removes the need for `route.params?.x ?? undefined` patterns and aligns with `@react-navigation/native-stack` typing used by the reference SwiftUI-based projects.

- **`src/navigation/inventory.ts` is an 872-line governance file evaluated at module import.**
  - It computes route ownership, tab hierarchy, forward-cycle governance, etc., every time the module loads.
  - **Simpler alternative:** Keep the exported `NAVIGATION_INVENTORY` object, but generate it from a build-time script and commit the result. The current runtime generation is fine for tests, but it makes the navigation module heavier than it needs to be at app start.

- **`src/navigation/AgeScreen.tsx` lives in the navigation folder but is not a route.**
  - It is rendered conditionally inside `RootStackNavigator.tsx` (lines 66–73) before any navigator branch is chosen.
  - **Simpler alternative:** Move it to `src/features/onboarding/screens/` or `src/components/`; the current location is confusing because `AgeScreen` does not appear in `routes.ts` or `ROUTE_MAP`.

### Bottlenecks

- **Five tab navigator instances increase memory and re-render cost.**
  - As noted above, `ModalNavigator` creates five tab hosts. Each host instantiates its own React Navigation state machine and tab bar. On low-end iOS devices this is a measurable startup cost for the protected branch.

- **`ReconnectingOverlay` uses a hard-coded 2400 ms timeout before navigating.**
  - `src/features/fallback/ReconnectingOverlay.tsx` lines 18–31 start a `setTimeout` and then push to `HomeHubScreen` or `HelpFaqScreen`.
  - **Why it matters:** If the modal is dismissed by the user or by a system event before the timeout fires, the timeout still fires and navigates away from whatever screen the user is now on. This is a reliability risk for a fallback flow.
  - **Recommended change:** Clear the timeout based on `navigation.addListener('beforeRemove')` or drive the retry decision from a service that cancels when the overlay unmounts.

- **`AppNavigator` only stores the last pending deep link before the navigator is ready.**
  - `src/navigation/AppNavigator.tsx` lines 22–26 dispatch immediately if ready; otherwise it overwrites `pendingDeepLinkTarget`.
  - **Why it matters:** A burst of notification + Linking URLs during startup will drop all but the last one.
  - **Recommended change:** Use a small queue instead of a single mutable target, or record dropped links for analytics.

- **`RootStackNavigator` consumes pending deep links even when the target belongs to a different root branch.**
  - Lines 52–56 call `onDeepLinkRouteConsumed` whenever `canShowProtected && pendingDeepLinkTarget`, regardless of whether `pendingDeepLinkTarget.name` is actually a protected route.
  - **Why it matters:** If a cold-start deep link targets an auth-only or onboarding-only route, the pending target is cleared and ignored once the protected branch mounts.
  - **Recommended change:** Branch-aware consumption: only clear the pending target after it has been dispatched into the matching navigator, or let `AppNavigator` dispatch directly once `navigationRef` is ready.

## Top 3 quick wins

1. **Delete the legacy `src/screens` tree, `src/app/screens` phantom aliases, and `LegacyMainStackParamList`.** This is pure cleanup, requires no behavior change, and immediately removes stale route names from the codebase.
2. **Add a test that verifies `nav-graph-data.json` matches `ROUTE_MAP` and feature `states.ts` files.** This prevents silent drift in the graph visualization/scripting layer.
3. **Extract `LessonSessionParams` in `routes.ts` and remove `undefined |` unions for optional route params.** This improves type safety and shrinks the central route definition file.

## Risk / effort estimates

| Recommendation | Risk | Effort |
|---|---|---|
| Delete legacy `src/screens`, `src/app/screens`, and `LegacyMainStackParamList` | LOW (verify no imports) | LOW |
| Add unknown deep-link fallback + logging | LOW | MEDIUM |
| Add nav-graph-data.json alignment test | LOW | MEDIUM |
| Extract `LessonSessionParams` and normalize optional params | LOW | LOW |
| Refactor `ModalNavigator` to a single `MainTabNavigator` | HIGH (tests, deep-link params) | HIGH |
| Harden `ReconnectingOverlay` timeout against unmount races | LOW | LOW |
| Queue pending deep links instead of overwriting | LOW | MEDIUM |
| Move `AgeScreen.tsx` out of `src/navigation/` | LOW | LOW |
