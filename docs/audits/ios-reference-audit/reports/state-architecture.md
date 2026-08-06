# state-architecture Audit

## Scope
State Management, Feature Architecture & Data Flow for TJBot-mobile: compare the current React Native state layer (XState, Zustand, Context, React Query) against the curated iOS reference library and identify concrete gaps in modularity, duplication, machine boundaries, and side-effect layering. Focus from manifest: *“XState vs Zustand vs Context, feature modularity, duplication, machine boundaries, side-effect layering.”*

## Files reviewed

### Mobile project files
- `package.json` (deps: `@tanstack/react-query`, `@xstate/react`, `xstate`, `zustand`)
- `src/app/providers/AppProviders.tsx`
- `src/app/providers/QueryProvider.tsx`
- `src/app/providers/ThemeProvider.tsx`
- `src/App.tsx`
- `src/contexts/AuthContext.tsx`
- `src/contexts/HouseholdContext.tsx`
- `src/contexts/InteractionContext.tsx`
- `src/features/parent/context/ParentSessionContext.tsx`
- `src/state/voiceAssistantStore.ts`
- `src/state/machines/index.ts`
- `src/state/machines/devicePairing.machine.ts`
- `src/state/machines/devicePairing.types.ts`
- `src/state/machines/parentApproval.machine.ts`
- `src/state/machines/lessonSession.machine.ts`
- `src/features/device/pairing/pairingSession.ts`
- `src/features/device/pairing/screens/PairSearchScreen.tsx`
- `src/features/device/pairing/screens/PairFoundScreen.tsx`
- `src/features/device/pairing/screens/PairWifiScreen.tsx`
- `src/features/device/pairing/screens/PairWifiPasswordScreen.tsx`
- `src/features/device/pairing/screens/PairConnectingScreen.tsx`
- `src/features/lesson-session/sessionContext.ts`
- `src/features/lesson-session/screens/ConnectingScreen.tsx`
- `src/features/home/hooks/useHomeState.ts`
- `src/features/lesson-demo/store/useLessonDemoProgressStore.ts`
- `src/navigation/RootStackNavigator.tsx`
- `src/navigation/MainTabNavigator.tsx`
- `src/services/http/client.ts`
- `src/services/http/refresh-queue.ts`
- `src/services/http/tokens.ts`
- `src/services/api/ai.ts`
- `src/api/client.ts`
- `src/api/tokens.ts`
- `src/api/learning.ts`
- `src/hooks/useGeminiConversation.ts`
- `src/hooks/useRobotLessonStatusPoll.ts`
- `src/hooks/useOfflineSync.ts`
- `src/hooks/useStreamingTranscript.ts`
- `src/hooks/useVoiceActivity.ts`
- `src/hooks/useLatencyBudget.ts`
- `src/components/robot/LatencyHud.tsx`
- `src/features/lesson-demo/screens/RobotLessonControlScreen.tsx`
- Tests under `tests/state/`, `tests/contexts/`, `tests/learning/`

### Reference cards reviewed
- `docs/reference/ios/extractions/pointfreeco__swift-composable-architecture.md`
- `docs/reference/ios/extractions/element-hq__element-x-ios.md`
- `docs/reference/ios/extractions/jellyfin__Swiftfin.md`
- `docs/reference/ios/extractions/FaridSafi__react-native-gifted-chat.md`
- `docs/reference/ios/extractions/react-native-maps__react-native-maps.md`

## Reference benchmarks

- **pointfreeco/swift-composable-architecture (TCA):** strict unidirectional loop — `State` → `Action` → `Reducer` → `Effect` → `Store`. Side effects are isolated in `Effect`, dependencies are injected, and features compose via `scope`/`ifLet`/`forEach`. Tests drive the reducer directly. This is the strongest benchmark for turning multi-step flows (pairing, lesson session, parent gate) into testable state machines.
- **element-hq/element-x-ios:** SwiftUI + custom `StateStoreViewModel`/`StateStoreViewModelV2` with `@Published` context and `Combine`. High-level flows are owned by coordinators backed by state machines. Matrix logic is shared via the Rust SDK. Relevant pattern: secure storage of restoration tokens, notification-driven deep-link routing, and clear separation between UI state and heavy service/state-machine work.
- **jellyfin/Swiftfin:** MVVM + `Combine`, dependency injection through `Factory`, custom navigation coordinators (`RootCoordinator`, `TabCoordinator`, `NavigationRoute`). Persistence is split by concern: `CoreStore` for SQLite objects, `Defaults` for settings, `KeychainSwift` for tokens. Good reference for separating server state, local settings, and credentials.
- **FaridSafi/react-native-gifted-chat:** props-driven React composition, minimal external state. A small `GiftedChatContext` gives sub-components locale/action-sheet access. Shows how a focused React component family can stay simple without a heavy store.
- **react-native-maps/react-native-maps:** declarative props map to a native module. Less about app state, but reinforces the rule: keep the JS surface a thin, typed wrapper over the heavy layer rather than embedding orchestration logic in components.

## Findings

### Improvements

- **`src/state/machines/*.ts` exist but are not wired to the UI.** `devicePairingMachine`, `parentApprovalMachine`, and `createLessonSessionMachine` are exported from `src/state/machines/index.ts` (lines 1–19) and covered by unit tests, yet no production code in `src/` imports `createActor` or `useMachine` from `@xstate/react`. The pairing screens instead use module-level mutable variables (`src/features/device/pairing/pairingSession.ts` lines 14–59) and local `React.useState`; lesson-session screens are mostly static placeholders. Either wire the machines into the flows or delete them to stop maintaining two models of the same truth.

- **Duplicate token-refresh interceptor in `src/services/api/ai.ts`.** Lines 22–75 repeat the same 401-queue-refresh-retry logic already implemented in `src/services/http/client.ts` lines 34–116. The AI client also exposes `setAiAuthInvalidatedHandler` (lines 16–20) but no code registers a handler, so an expired refresh token on an AI call will clear tokens without forcing the UI back to the Auth stack. Extract a shared `createAuthenticatedClient(baseURL)` factory and register the handler.

- **Pairing flow relies on module-scope mutable state.** `src/features/device/pairing/pairingSession.ts` stores `activeCandidate`, `connectedDevice` as mutable module variables (lines 14–16). This leaks across screen instances, survives component unmount, and is not reactive. If the user force-quits mid-pair, stale references can persist. Replace with an XState actor or at least a Zustand/React-Query store with cleanup on flow exit.

- **Server state is mostly fetched inside Context instead of React Query.** `HouseholdContext.tsx` lines 64–103 manually calls `householdsApi.list()` and `householdsApi.listChildren()`, keeps its own `isLoading`/`error`, and has no mutation invalidation. The only React Query usage is `useHomeState` (`src/features/home/hooks/useHomeState.ts` lines 231–238). Migrate household/children/course/progress data to React Query so caching, background refetch, stale-while-revalidate, and optimistic updates come for free.

- **`voiceAssistantStore` message array grows unbounded.** `addMessage` at `src/state/voiceAssistantStore.ts` lines 393–402 appends every user/AI turn without a cap. Long voice sessions could accumulate enough messages to cause memory pressure and slow re-renders in `TranscriptPanel`. Cap the array (e.g., last 100 turns) and persist full history server-side.

- **React Query `QueryClient` has no default configuration.** `src/app/providers/QueryProvider.tsx` lines 6–9 creates a bare `new QueryClient()`. There are no defaults for `retry`, `networkMode`, `refetchOnReconnect`, or global error handling. Add sensible defaults (e.g., 1 retry, `networkMode: 'online'`, staleTime tuned per feature) to avoid inconsistent behavior as more features adopt it.

- **`AuthContext` and `HouseholdContext` values are not memoized.** `AuthContext.tsx` line 213–217 and `HouseholdContext.tsx` line 176–180 build a new object each render, causing every consumer to re-render even when the underlying data has not changed. `ParentSessionContext.tsx` lines 72–82 already uses `React.useMemo` for the same pattern — apply that same discipline to the heavy auth/household contexts.

### Simplifications

- **Delete or consolidate dead provider wrappers.** `src/app/providers/AppProviders.tsx` lines 8–19 contains a comment claiming `QueryProvider`, `I18nextProvider`, and `ErrorBoundary` are “restored after dependency promotion,” but the file is not imported anywhere and `App.tsx` mounts its own provider tree (lines 71–87). `ThemeProvider.tsx` is also unused. Remove the dead wrappers or make `App.tsx` consume them to keep the provider hierarchy in one place.

- **Remove dead hooks and components.** `useOfflineSync.ts`, `useStreamingTranscript.ts`, `useVoiceActivity.ts`, `useLatencyBudget.ts`, and `LatencyHud.tsx` have no callers in `src/` other than their own files. They add maintenance surface and outdated assumptions (e.g., `useOfflineSync` re-implements fetch replay instead of using the shared axios client). Delete them unless they are part of an active upcoming feature.

- **Remove `src/api/*` re-export shims.** `src/api/client.ts`, `src/api/tokens.ts`, and `src/api/learning.ts` only re-export `src/services/*` symbols. They create two import paths for the same thing, which breaks “one canonical way to import” and makes impact analysis harder. Import directly from `src/services/http/client`, `src/services/http/tokens`, and `src/services/api/learning`.

- **Split UI-only flags out of the voice FSM core.** `voiceAssistantStore.ts` lines 191–209 mixes FSM state (`state`, `sessionId`, `epoch`) with presentation flags (`isBuffering`, `isPoorNetwork`, `audioMode`). These flags could be derived from native events or live in a smaller presentation store, shrinking the 437-line store and making the FSM invariant tests clearer.

- **Replace the wall of per-state timers in `useGeminiConversation` with declarative delayed transitions.** Lines 996–1122 contain ten separate `useEffect` timers keyed on `fsmState`. The same semantics (e.g., `ERROR_RECOVERABLE → IDLE` after 5s, `RECONNECTING → ERROR_RECOVERABLE` after 8s) can be expressed as `after:` transitions in XState or as a small declarative table, making the FSM testable without mounting the full native voice stack.

- **Simplify `HouseholdContext` by extracting concerns.** The context currently owns onboarding persistence, household list, child list, active household selection, pending device setup, and protected initial route. Split into `OnboardingContext`, `HouseholdContext`, and `NavigationContext` (or move server state to React Query) so each provider has a single reason to change.

### Bottlenecks

- **`useGeminiConversation.ts` is a 1,560-line orchestration hook with ~30 refs and 10+ timers.** The file coordinates WebSocket lifecycle, native audio, resumption handles, barge-in ordering, and telemetry all in one place. This is the highest-risk surface for race conditions and is extremely hard to unit-test. Reference pattern: TCA’s `Effect` and `AudioRecorderClient` dependency show how to move each capability into a small, swappable client.

- **`HouseholdContext.refresh()` blocks cold start on sequential API calls.** Lines 64–103 await `householdsApi.list()` then `householdsApi.listChildren()`, with a 12s timeout. There is no abort on unmount, no parallel fetch, and no fallback to cached data beyond SecureStore. On slow networks this delays the protected route decision.

- **Pairing screens have no explicit timeouts or global cancellation.** `PairConnectingScreen.tsx` lines 51–107 runs BLE connect + Wi-Fi provision + device claim without a timeout. `PairWifiScreen.tsx` lines 31–75 scans Wi-Fi without a deadline. If the native provisioning layer hangs, the UI hangs with it. The existing `devicePairingMachine` already defines timeouts (30s/60s) — use it.

- **`RobotLessonControlScreen.tsx` polling stops on any error and does not cancel in-flight requests on unmount.** Lines 39–68 call `useRobotLessonStatusPoll`, which stops the poll on the first error (`src/hooks/useRobotLessonStatusPoll.ts` lines 52–55). There is also no `AbortController` or effect cleanup for the `client.post('/robot-lessons/start')` call, so a late response can call `setState` on an unmounted screen.

- **Static lesson-session screens do not reflect real state.** `src/features/lesson-session/screens/ConnectingScreen.tsx` lines 15–18 hard-codes an 1.8s `setTimeout` before navigating to `GreetingScreen`, regardless of whether the WebSocket/audio layer is actually ready. The `lessonSessionMachine` supports server-driven terminals and reconnections, but the screens are not connected to it, so resilience features cannot be exercised.

- **Context tree re-renders can cascade.** `AuthContext` and `HouseholdContext` are mounted near the root (`App.tsx` lines 75, 61). Because their value objects are recreated every render, any state change in either context re-renders the entire authenticated subtree. For a child-companion app that runs on older iPads, this is a measurable frame-time risk.

## Top 3 quick wins

1. **Delete dead state code** — remove `AppProviders.tsx`/`ThemeProvider.tsx` (or integrate them), delete unused hooks (`useOfflineSync`, `useStreamingTranscript`, `useVoiceActivity`, `useLatencyBudget`, `LatencyHud`), and drop the `src/api/*` re-export shims. This immediately reduces the state surface and removes misleading examples for future contributors.

2. **Memoize `AuthContext` and `HouseholdContext` values** — wrap the provider values with `React.useMemo` and stable callback refs, mirroring `ParentSessionContext`. Low effort, immediate reduction in re-render cascades.

3. **Cap the voice transcript history and register the AI auth-invalidated handler** — add a max-length guard in `voiceAssistantStore.addMessage` and call `setAiAuthInvalidatedHandler(forceLogout)` in `App.tsx`. Both are small, contained changes that close real runtime risks.

## Risk / effort estimates

| Recommendation | Risk | Effort |
|---|---|---|
| Wire XState machines into UI (or delete them) | HIGH | HIGH |
| Consolidate axios token-refresh into a shared factory | MEDIUM | LOW |
| Replace module-scope pairing state with actor/store | MEDIUM | MEDIUM |
| Migrate server state from Context to React Query | MEDIUM | HIGH |
| Cap voice message history | MEDIUM | LOW |
| Configure default React Query options | LOW | LOW |
| Memoize Auth/Household context values | LOW | LOW |
| Delete dead providers/hooks/components | LOW | LOW |
| Remove `src/api/*` re-export shims | LOW | LOW |
| Split UI flags out of voice FSM core | LOW | MEDIUM |
| Replace per-state timers with declarative delayed transitions | MEDIUM | HIGH |
| Split HouseholdContext concerns | MEDIUM | MEDIUM |
| Refactor `useGeminiConversation` into smaller clients/effects | HIGH | HIGH |
| Add timeouts/cancellation to pairing flows | MEDIUM | MEDIUM |
| Fix RobotLessonControlScreen unmount safety and error handling | MEDIUM | LOW |
| Connect lesson-session screens to `lessonSessionMachine` | HIGH | HIGH |
