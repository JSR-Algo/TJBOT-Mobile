# Navigation

This directory is the production React Navigation shell for `TJBot-mobile`.
Feature slices own screen registration. Central navigators compose feature
metadata and do not import feature screen components directly.

## Architecture

- `AppNavigator.tsx` wraps `RootStackNavigator` in `NavigationContainer`.
- `linking.ts` exposes the production deep-link config for `NavigationContainer`.
- `RootStackNavigator.tsx` gates auth, onboarding, and protected app routes from
  `AuthContext` and `HouseholdContext`; authenticated sessions remain on the
  loading gate while household/onboarding state resolves.
- `AuthNavigator.tsx` renders only auth feature screens.
- `OnboardingNavigator.tsx` renders only onboarding feature screens.
- `MainTabNavigator.tsx` renders the five protected tab roots.
- `ModalNavigator.tsx` renders every protected tab route as a tab-host screen,
  plus protected stack screens and modal groups.

## Source Of Truth

Each feature with routes has `src/features/<feature>/navigation.ts`.
Those files export stack, modal, or tab metadata with screen component imports.
Each feature also exports a `<FEATURE>_NAVIGATION` config with its `owner`,
`rootBranch`, `stackScreens`, `modalScreens`, and optional `tabScreen`. Owner
metadata, root branch metadata, initial route metadata, tab metadata, tab order,
and pending device setup route metadata live with the feature, not in the central
registry. `FEATURE_NAVIGATION_REGISTRY` in `featureRegistry.ts` imports only
these feature navigation configs, then derives initial routes, tabs, modal
groups, and protected stack groups from them.

`featureRouteEntries.ts` flattens that registry into shared route entries.
`routeOwnership.ts`, `routeMap.ts`, and coverage checks use those entries
instead of keeping separate route lists.
`linking.ts` also derives its route-to-path map from those entries, so deep
links cannot drift from feature-owned screen registration.

Do not register a feature screen directly inside a central navigator. Add or
move route metadata in the owning feature `navigation.ts` file instead.

## Route Map

`ROUTE_MAP` in `routeMap.ts` is derived from feature-owned metadata and
`ROUTE_OWNERS`. It records each route's owning feature, navigator, role, back
behavior, deep-link path, optional back target, allowed forward cycle group,
state machine ID, and multi-state IDs for routes that render several
feature-owned UI states.

Back behavior values are explicit:

- `blocked-auth`: auth routes cannot back into protected content.
- `linear-onboarding`: onboarding uses forward-only setup progression.
- `tab-root`: protected tab roots sit at the bottom of each tab.
- `stack-back`: protected stack routes use normal stack back behavior.
- `modal-stack-back`: modal routes with `backTarget` move within the modal flow.
- `modal-dismiss`: modal routes without `backTarget` dismiss the modal flow.

Route names live in `routes.ts`. New routes must be added there, then registered
in exactly one feature navigation bucket.
Deep-link paths are generated as `<feature>/<route-slug>` from the same feature
route entries. `migrate-ui-ux-to-mobile-app-docs/architecture/route-mapping.json`
records the same `deepLinkPath` for each route so exported architecture output
cannot drift from `linking.ts`.
`migrate-ui-ux-to-mobile-app-docs/architecture/navigation-forward-edges.json`
records static forward navigation edges scanned from feature screen code. Run
`npm run navigation:forward-edges -- --check` to prove hidden routes and
reciprocal cycle violations remain zero.

`inventory.ts` exports `NAVIGATION_INVENTORY` for final delivery review. It
contains the architecture file list, route map, navigation tree, deleted legacy
routes, merged navigator paths, app entry wiring, route ownership map, business
flow summary, business flow sequence governance summary, stack hierarchy
summary, navigator composition summary, mobile transition summary, mobile
transition governance summary, reset-flow summary, route naming policy,
deterministic routing summary, one-route screen responsibility records, feature
ownership groups, state-machine alignment summary, deep-link coverage summary,
multi-agent safety summary, modal governance summary, back-behavior
coverage summary, route registration integrity summary, tab hierarchy summary,
screen component responsibility summary, forward cycle governance summary,
protected entry governance summary, root branch reset governance summary,
deep nested feature governance summary, feature slice governance summary,
delivery governance summary, remaining validation risks, and production
readiness status. Business flow
summary covers auth, onboarding, and protected app branches with their feature-
derived initial routes, tabs, stack routes, and modal routes. Business flow
sequence governance summary records canonical auth, onboarding, device-pairing,
and purchase route sequences, plus missing route-map entries, missing
state-machine metadata, wrong feature owners, and invalid back-chain violations.
Stack hierarchy summary records the shallow root-to-branch layout, protected
tab host, and modal presentation grouping. Mobile transition summary records push vs modal native-
stack options. Mobile transition governance summary records the actual
React Navigation option objects for auth, onboarding, protected stack, and
modal routes, plus modal presentation and gesture policy values. Reset-flow summary records logout, auth invalidation, and
onboarding-complete branch remount behavior. Route naming policy records
PascalCase route constants, allowed route suffixes, removed legacy aliases, and
generated deep-link path style, then computes `routeNameViolations` from
`ROUTE_MAP` so route normalization is reviewable from the final inventory.
Deterministic routing summary records route count, generated deep-link path
count, and duplicate deep-link path violations from `NAVIGATION_LINKING_SCREENS`.
Deep-link coverage summary records route count, path count, routes missing deep
links, deep links without route-map entries, and invalid generated path strings.
State-machine alignment summary records total route count, routes with
state-machine metadata, and missing metadata violations from `ROUTE_MAP`.
Screen responsibility records preserve each route's feature, navigator, bucket,
and role. Feature ownership groups list every route owned by each feature for
multi-agent review. Multi-agent safety summary records the feature navigation
source, registry ownership source, feature count, and duplicate route owner
violations. Modal governance summary records modal route count, modal bucket
violations, missing modal role violations, and protected stack routes that
incorrectly carry modal roles, plus interior modal routes missing `backTarget`.
Back-behavior coverage summary records total routes, missing back behaviors,
invalid back targets, modal stack routes missing back targets, and tab roots
that incorrectly declare back targets. Route
Navigator composition summary records auth routes, onboarding routes, protected
tab-host routes, protected stack routes, protected modal routes, and duplicate
route violations across tab/stack/modal buckets. Route
registration integrity summary records route map count, feature route entry
count, duplicate feature registrations, missing feature registrations, feature
registrations missing route-map entries, and unowned feature registrations. Tab
hierarchy summary records tab count, feature-owned tab names, tab routes,
default tab route, duplicate tab order/name violations, missing route-map
entries, and non-tab routes in the tab hierarchy. Screen component
responsibility summary records route count, registered component count,
duplicate component registrations by route, and routes missing components.
Forward cycle governance summary records declared reciprocal-navigation cycle
groups, each group's route list, unknown group violations, and singleton group
violations so approved cycles stay explicit.
Protected entry governance summary records the protected default route, pending
device setup route, allowed post-onboarding initial routes, invalid initial
route violations, and root reset branch keys.
Root branch reset governance summary records the source file, auth/onboarding/
protected React keys, auth and onboarding branch conditions, protected initial
route expression, default protected route, pending device setup route, missing
reset key violations, and missing branch condition violations.
Deep nested feature governance summary records each feature's tab routes, stack
entry routes, interior stack routes, modal entry routes, interior modal routes,
features missing an entry route, protected interior stack routes missing
`backTarget`, and modal interior routes registered outside `modalScreens`.
Feature slice governance summary records every feature's root branch, stack
route count, modal route count, tab route count, total route count, empty
feature violations, and ownership count mismatches.
Delivery governance summary records the final objective, feature-owned route
source, production navigator source, proof inventory fields, objective
violations, non-navigation blocker scope, blocker count, and readiness status.
App entry wiring is
`index.js` -> `src/App.tsx` -> `src/navigation/AppNavigator.tsx` ->
`src/features/*/navigation.ts`. Deleted-route output covers retired
app-navigation aliases, the legacy `src/screens` tree, removed prototype
`StubScreen` registrations, and retired route aliases such as `ListenScreen`,
`SpeakScreen`, and `DevicePairWifiScreen`.

## Navigation Tree

`NAVIGATION_TREE` in `routeMap.ts` is the AI-readable tree:

- root: `RootStackNavigator`
- auth: `AuthNavigator`
- onboarding: `OnboardingNavigator`
- protected: `ModalNavigator`
- generated tree output marks the auth initial route, onboarding initial route,
  protected default route, and pending device setup route
- generated tree route nodes include each feature-owned route bucket and role,
  for example `stackScreens / stack-entry` and `modalScreens / modal-entry`
- protected tabs: Home, Devices, Library, Progress, Profile
- protected stack: derived from `PROTECTED_STACK_SCREENS`
- protected modals: derived from `PROTECTED_MODAL_SCREENS`

Tab roots are registered through `tabScreen` only. `ModalNavigator` mounts the
same tab navigator under every tab route name so `navigation.navigate()` can
target `DeviceHomeScreen`, `CourseLibraryScreen`, `TodayProgressScreen`, and
other feature tab routes deterministically. Each tab root owns its
`tabName`, `title`, `tabIcon`, and `tabBarButtonTestID` in feature metadata.
Tab order is feature-owned through `tabOrder`; `featureRegistry.ts` sorts the
tab screens by that value instead of keeping a central tab-label array.
Modal routes are registered through `modalScreens` only. Modal flow entry
routes use `role: 'modal-entry'`; interior modal routes use `role: 'modal'`
and must have real inbound navigation. Protected stack routes are registered
through `stackScreens` only. Protected stack roots that are valid direct entry
points use `role: 'stack-entry'`; interior stack routes use `role: 'stack'`
and must have real inbound navigation.

## Ownership

`routeOwnership.ts` derives `ROUTE_OWNERS` from `FEATURE_NAVIGATION_REGISTRY`.
No hand-written owner map or central owner literal list exists. If a route
appears in more than one feature or more than one bucket, tests fail.

Current owners:

- `auth`
- `onboarding`
- `home`
- `course`
- `course-library`
- `purchase`
- `lesson-session`
- `progress`
- `parent`
- `device`
- `robot-mgmt`
- `fallback`

## Invariants

- No legacy app-navigation system.
- No central imports from `src/features/*/screens`.
- No production-visible routes without forward inbound navigation or explicit entry role; contract-blocked prototypes must declare `productionVisible: false` and a reason.
- Forward-edge artifact must report zero hidden routes and zero reciprocal
  cycle violations.
- Back-only links (`backTarget`, `onBack`, `prev`) do not count as reachability.
- Home hub CTA targets enter feature flows through entry-capable routes only.
- Cross-feature forward navigation targets entry-capable routes only; direct
  jumps into another feature's interior stack are blocked by tests.
- Reciprocal forward navigation requires a shared declared `forwardCycleGroup`,
  and each declared group must contain at least two routes.
- No hidden interior modal routes; only `modal-entry` may serve as a static
  modal flow entry.
- No placeholder or demo navigation labels.
- No unapproved circular forward navigation.
- Every custom back button has matching `backTarget` route metadata.
- Every state-machine route has `stateMachineId` matching its feature states.
- Multi-state routes use `stateMachineIds` so one screen can own several
  documented UI states without creating duplicate routes.
- Modal routes declare `role: 'modal'` in feature metadata.
- Interior modal routes must declare `backTarget`; only modal entry routes may
  dismiss without an in-flow back target.
- Tab hosts, protected stack routes, and protected modal routes cannot duplicate
  route names across buckets.
- Auth/onboarding root branches disable gestures; protected stack and modal
  flows enable mobile gestures, with modal flows using native modal presentation.
- Auth, onboarding, and protected root branch grouping is declared by
  `rootBranch` in feature metadata.
- Each feature's stack/modal/tab bucket counts are derived from
  `FEATURE_NAVIGATION_REGISTRY`; empty features and ownership mismatches are
  inventory violations.
- Auth and onboarding stack entry routes are declared by `initialRoute` in
  feature metadata.
- Pending device setup entry is declared by `pendingDeviceSetupRoute` in the
  device feature metadata.
- Protected initial routes must be non-modal protected routes with entry-capable
  roles: `tab`, `stack-entry`, `state-machine`, or `fallback-entry`.
- Root branch resets must use stable React keys `auth`, `onboarding`, and
  `protected` in `RootStackNavigator.tsx`.
- Protected branch initial route selection must remain
  `pendingDeviceSetup ? PENDING_DEVICE_SETUP_ROUTE : protectedInitialRoute`.
- Deep protected stack interiors must declare `backTarget` route metadata when
  they are not entry-capable routes.
- Auth and onboarding routes never enter the protected stack.

Current route coverage check:

- 130 screen files
- 122 routes registered
- 122 feature route registrations
- 0 duplicate screen registrations
