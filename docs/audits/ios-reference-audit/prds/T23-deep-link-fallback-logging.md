# T23: Add unknown deep-link fallback and logging

## Status
Registry status: `NOT_STARTED` | Priority: `P1` | Blast radius: `MEDIUM`

## Problem
Unknown `TJBot://` deep links are silently dropped with no logging or fallback screen, making marketing-link and notification misconfigurations hard to debug.

Evidence from the audit:

- `src/navigation/linking.ts` lines 62–69: `navigationTargetForDeepLinkUrl` returns `null` when a path is neither a registered feature route nor a dynamic notification path.
- `src/navigation/AppNavigator.tsx` lines 18–21: `handleDeepLinkUrl` returns early when `navigationTargetForDeepLinkUrl(url)` is `null`, so the user sees nothing and no telemetry is recorded.
- `src/navigation/linking.ts` lines 71–76: `shouldHandleDeepLinkManually` only returns `true` for dynamic notification paths, leaving truly unknown links unhandled.
- The fallback feature (`src/features/fallback/`) has no `NotFoundScreen`, so there is nowhere to route an unrecognized deep link.

Audit sources:

- `original-app/TJBOT-Mobile/docs/audits/ios-reference-audit/reports/navigation-screens.md#improvements` (lines 108–111)
- `original-app/TJBOT-Mobile/src/navigation/linking.ts` (lines 62–76)
- `original-app/TJBOT-Mobile/src/navigation/AppNavigator.tsx` (lines 14–27)

## Scope

### In scope

- `src/navigation/linking.ts` — make `navigationTargetForDeepLinkUrl` return a `NotFoundScreen` target for unknown `TJBot://` paths; keep schemeless/non-TJBot URLs returning `null`.
- `src/navigation/AppNavigator.tsx` — route unrecognized deep links to the fallback screen and log the full URL to Sentry and analytics.
- `src/features/fallback/screens/NotFoundScreen.tsx` — new screen that displays a child-friendly "page not found" message and a way back to `HomeHubScreen`.
- `src/features/fallback/navigation.ts` — register `NotFoundScreen` in `FALLBACK_SCREENS`.
- `src/navigation/routes.ts` — add `NotFoundScreen` to `RootStackParamList` with an optional `{ url?: string }` param. This is a minimal one-line type addition; see the anti-overlap note about T25.
- `tests/verification/T23-deep-link-fallback-logging.test.tsx` — verification test.

### Out of scope

- `src/navigation/routes.ts` is listed as non-scope in the registry, but adding a new route name is unavoidable. The implementation must limit the change to the single `NotFoundScreen` entry and its param type.
- `src/navigation/RootStackNavigator.tsx` (registry non-scope) — the new screen is registered through the feature navigation registry, so no changes are required here.
- `src/navigation/featureRegistry.ts`, `src/navigation/featureRouteEntries.ts`, `src/navigation/routeMap.ts` — these are derived from the feature registry; no direct edits.
- Marketing-link configuration or notification payload changes.
- UI copy/illustration polish beyond a basic fallback message.

## Proposed solution

1. **Add a `NotFoundScreen` route.**
   - Create `src/features/fallback/screens/NotFoundScreen.tsx`. It accepts an optional `url` route param and renders a simple fallback UI with a back-to-home action.
   - Register it in `src/features/fallback/navigation.ts` as a `fallback-entry` screen with `backTarget: ROUTES.HomeHubScreen`.
   - Add `NotFoundScreen: { url?: string } | undefined;` to `RootStackParamList` in `src/navigation/routes.ts`.

2. **Resolve unknown `TJBot://` paths to the fallback target.**
   - In `src/navigation/linking.ts`, update `navigationTargetForDeepLinkUrl` so that after checking the registered route map and dynamic notification targets, if the URL uses the `TJBot://` scheme and still has no match, it returns:
     ```ts
     { name: ROUTES.NotFoundScreen, params: { url } }
     ```
   - Non-TJBot URLs (e.g., `https://example.com`) should continue to return `null` so the OS/browser can handle them.

3. **Route unrecognized URLs in `AppNavigator`.**
   - In `handleDeepLinkUrl`, after resolving the target, dispatch the fallback when the target is `NotFoundScreen` (in addition to the existing manual dispatch for dynamic notification paths).
   - Keep the existing behavior for known feature routes: React Navigation continues to own those via `NAVIGATION_LINKING_CONFIG`.
   - Pseudocode shape:
     ```ts
     const target = navigationTargetForDeepLinkUrl(url);
     if (!target) return;

     if (target.name === ROUTES.NotFoundScreen) {
       logUnknownDeepLink(url);
     }

     if (target.name === ROUTES.NotFoundScreen || shouldHandleDeepLinkManually(url)) {
       if (navigationRef.isReady()) {
         navigationRef.dispatch(CommonActions.navigate(target));
       } else {
         setPendingDeepLinkTarget(target);
       }
     }
     ```

4. **Log the unknown URL.**
   - Import `trackEvent` from `@/services/observability/analytics` and `captureMessage` from `@sentry/react-native`.
   - In the fallback branch, log:
     ```ts
     trackEvent('mobile.deep_link.unknown', { url });
     Sentry.captureMessage(`Unknown deep link: ${url}`, 'warning');
     ```
   - The URL is a `TJBot://` marketing/notification path; it contains no credentials or PII, so logging the full URL is acceptable. If any path segment could later contain free-form user input, hash or redact it before logging.

5. **Preserve existing notification deep links.**
   - Do not change `notificationTargetForPath` or `shouldHandleDeepLinkManually` logic for dynamic paths (`TJBot://device/:id`, `TJBot://device/:id/summary/:date`, `TJBot://settings/account`, `TJBot://settings/data-privacy`).

## Acceptance criteria

1. `navigationTargetForDeepLinkUrl` returns a `NotFoundScreen` target for unknown `TJBot://` paths instead of `null`.
2. `AppNavigator` routes unrecognized `TJBot://` URLs to the fallback screen (either immediately or by setting `pendingDeepLinkTarget`).
3. Unknown `TJBot://` paths are logged to Sentry and analytics with the full URL.
4. Existing notification deep links (`TJBot://device/...`, `TJBot://settings/...`) continue to resolve and dispatch correctly.

## Dependencies

None.

## Exclusions / anti-overlap

- **T22 — delete legacy screen trees**: T22 deletes `src/screens/` and `src/app/screens/` and edits `src/navigation/types.ts`. T23 does not touch those files.
- **T25 — lesson-session params refactor**: T25 makes broad edits to `src/navigation/routes.ts`. T23 only adds the `NotFoundScreen` entry; if T25 lands first, rebase the single line. If T23 lands first, T25 should keep the new entry.
- **T26 — ModalNavigator single tab host**: T26 changes how the protected branch mounts. T23 registers `NotFoundScreen` through the feature registry, so ModalNavigator will pick it up automatically after T26.
- **T27 — ReconnectingOverlay cleanup**: T27 edits `src/features/fallback/ReconnectingOverlay.tsx`; no overlap with T23.
- **T32 — fix failing test baseline**: T32 touches test mocks and scripts. Coordinate if the new `NotFoundScreen` test needs additional mocks.

## Verification test plan

- **Test file:** `tests/verification/T23-deep-link-fallback-logging.test.tsx`
- **What it proves:**
  - Unknown `TJBot://` URLs resolve to a `NotFoundScreen` target carrying the original URL.
  - Non-TJBot URLs still return `null`.
  - Known feature routes and dynamic notification routes keep working.
  - `AppNavigator` forwards an unknown URL to `RootStackNavigator` as `pendingDeepLinkTarget` and logs the URL to analytics and Sentry.
- **How to run it:** `npx jest tests/verification/T23-deep-link-fallback-logging.test.tsx`
- **Expected state before fix:** FAIL
- **Expected state after fix:** PASS

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Returning `NotFoundScreen` for every non-matching URL could accidentally swallow URLs that should open externally. | Only return the fallback for URLs whose protocol is `tjbot:`. All other schemes continue to return `null`. |
| Manual dispatch in `AppNavigator` could duplicate React Navigation’s automatic handling for known routes. | Keep the existing gate: known routes are owned by React Navigation; only `NotFoundScreen` and dynamic notification paths are dispatched manually. |
| Logging full URLs could leak PII if marketing links later include tokens or identifiers. | Document that only path segments are safe; if user-generated content appears, hash or redact before `trackEvent`/`captureMessage`. |
| Adding `NotFoundScreen` to `RootStackParamList` creates a merge conflict with T25. | Limit the change to one new entry. Add a coordination note in both PRs. |
| The fallback screen is registered in the protected branch, so unauthenticated users hitting an unknown link will not see it until after login. | This matches the current architecture: the navigator resolves the target but the root branch still gates on auth/onboarding. Document as expected behavior. |

## Coordination notes

No cross-role coordination required (`coordination_required: false`).

Internal coordination:

- Confirm with the product owner that `TJBot://` unknown links should land in-app on a fallback screen rather than being ignored.
- If marketing or notifications start using new path patterns, update either `NAVIGATION_LINKING_SCREENS` (for feature routes) or `notificationTargetForPath` (for dynamic notification routes) instead of relying on the fallback.

## Implementation hints

- Read `src/navigation/linking.ts` carefully; `normalizedPathForUrl` is the right place to inspect the URL scheme before deciding on a fallback.
- The existing fallback screens in `src/features/fallback/screens/` (e.g., `NetworkErrorScreen.tsx`) are good templates for `NotFoundScreen.tsx`.
- `src/navigation/routes.ts` currently declares `SupportScreen: undefined | { context?: ... }`. Add `NotFoundScreen` nearby under the fallback screens section.
- `ROUTE_MAP` and the navigation inventory are derived from `FEATURE_NAVIGATION_REGISTRY`, so registering the screen in `src/features/fallback/navigation.ts` is enough to make it reachable from the route map.
- The verification test mocks `RootStackNavigator` so it does not need to mount the full auth/household providers; this keeps the test focused on deep-link resolution and dispatch.
