# network-auth-ws Audit

## Scope
HTTP client duplication, token refresh, WebSocket path mismatch, retry/circuit-breaker, secure storage, and error handling across TJBot-mobile's networking, authentication, and realtime layers.

## Files reviewed

### Mobile project files
- `src/services/http/client.ts`
- `src/services/http/tokens.ts`
- `src/services/http/refresh-queue.ts`
- `src/services/http/idempotency.js`
- `src/services/api/ai.ts`
- `src/services/api/auth.ts`
- `src/services/api/account.ts`
- `src/services/api/households.ts`
- `src/services/api/devices.ts`
- `src/services/api/device.api.ts`
- `src/services/api/parent.api.ts`
- `src/services/api/learning.ts`
- `src/services/ws/realtime.ts`
- `src/services/ws/xiaozhi-device.ts`
- `src/services/storage/secureStore.ts`
- `src/services/storage/index.ts`
- `src/contexts/AuthContext.tsx`
- `src/contexts/HouseholdContext.tsx`
- `src/auth/pendingCredentials.ts`
- `src/config.ts`
- `src/__env__.ts`
- `src/hooks/useGeminiConversation.ts`
- `src/hooks/useOfflineSync.ts`
- `src/utils/errors.ts`
- `src/app/providers/QueryProvider.tsx`
- `tests/contracts/parity.test.ts`
- `tests/integration/auth-isolation.test.ts`
- `tests/security/gemini-api-key.test.ts`

### Reference cards reviewed
- `docs/reference/ios/extractions/element-hq__element-x-ios.md`
- `docs/reference/ios/extractions/jellyfin__Swiftfin.md`
- `docs/reference/ios/extractions/Finb__Bark.md`
- `docs/reference/ios/extractions/jiacchen__V2Reader.md`
- `docs/reference/ios/extractions/permissionlesstech__bitchat.md`

## Reference benchmarks

| Reference | Relevant strengths for TJBot |
|---|---|
| **Element X** (Matrix Rust SDK) | Single shared client with token-refresh serialization, keychained restoration tokens, and a global `StateStoreViewModel` that reacts to auth state changes. Auth invalidation is a first-class state transition, not a side-effect. |
| **Swiftfin** (Jellyfin) | `ServerConnectionManager` probes server/session health and broadcasts connection changes; `CoreStore` for versioned local state; `KeychainSwift` for tokens; `Defaults` for lightweight settings. Clear separation of "server reachability" vs "auth validity". |
| **Bark** (push client) | RxSwift-based MVVM with explicit `Input`/`Output` contracts; `Moya/RxSwift` for typed network calls; `RealmSwift` local history; `CryptoSwift` for encrypted payloads. Demonstrates typed API abstractions and secure credential screens. |
| **V2Reader** (SwiftUI/V2EX) | Minimal SwiftUI architecture; token stored in system keychain via `SecItemAdd`/`SecItemCopyMatching`; `async/await` `URLSession`; `@MainActor` fetchers. Good reference for keeping the auth surface small and explicit. |
| **BitChat** (mesh/Nostr) | Dual transport with intelligent routing, adaptive reconnect, Noise/Keychain identity, and queued message delivery. Relevant for realtime resilience patterns and transport fallback logic. |

## Findings

### Improvements

- **File/path**: `src/services/http/client.ts` and `src/services/api/ai.ts`  
  **Observation**: Two separate axios instances (`client` and `_aiClient`) duplicate the same request/response interceptor logic for Bearer tokens and 401 refresh handling. The duplication is near line-by-line.  
  **Why it matters**: Any fix to refresh semantics (e.g., queue draining, auth-invalidated callback) must be applied in two places; drift is already visible—`client.ts` normalizes errors with `withRetryMetadata` and `normalizeError`, while `_aiClient.ts` rejects raw errors (line 73).  
  **Recommended change**: Create a single `createAuthenticatedClient({ baseURL, timeout, normalizeErrors })` factory in `src/services/http/client.ts` and reuse it for both REST and AI traffic. Share the refresh queue and invalidation handler.  **Risk/effort**: MEDIUM / MEDIUM

- **File/path**: `src/services/api/ai.ts:18`  
  **Observation**: `setAiAuthInvalidatedHandler` is exported but never registered by `AuthContext` or any other caller.  
  **Why it matters**: AI endpoint token refresh failures silently clear tokens but do not force the UI back to the auth stack, leaving the user stranded if the AI base URL rejects the session while the REST client does not.  
  **Recommended change**: Either wire `setAiAuthInvalidatedHandler` to the same `forceLogout` handler in `AuthContext.tsx`, or—preferably—collapse the AI client into the shared authenticated client so one handler covers all paths.  **Risk/effort**: LOW / LOW

- **File/path**: `src/services/http/client.ts:31` and `src/utils/errors.ts:117-123`  
  **Observation**: `validateStatus` allows `307` and `retry-after` is parsed, but there is no automatic retry for `429`, `503`, or `504`; the code only tags errors with `retryable: true`.  
  **Why it matters**: Render cold starts and shared-backend rate limits are explicitly called out in comments, yet every caller must implement its own retry. Reference projects (Swiftfin/Element X) centralize retry/circuit-breaker policy.  
  **Recommended change**: Add a lightweight axios retry plugin (e.g., `axios-retry`) configured for idempotent methods with exponential backoff, or implement a central `fetchWithRetry` wrapper that consumes `retryable` and `retryAfterSeconds`.  **Risk/effort**: MEDIUM / MEDIUM

- **File/path**: `src/services/http/client.ts:52-53`  
  **Observation**: Request ID generation for mutating methods falls back to `mobile-${Date.now()}-${Math.random()}`, and `idempotency.js` duplicates a separate `newRequestId()` generator.  
  **Why it matters**: Two different ID schemes increase the chance that the server cannot correlate `Idempotency-Key` with `X-Request-Id`. The current interceptor also does not attach an idempotency key to GETs, which is correct, but does not validate that commit-funnel callers supplied one.  
  **Recommended change**: Consolidate request-id generation in one module; make the interceptor use `newRequestId()` and require callers to pass `idempotencyKey` for commit endpoints (purchase, unlock, send-to-robot). Add unit tests that assert collision resistance.  **Risk/effort**: LOW / LOW

- **File/path**: `src/services/ws/realtime.ts:23-38`  
  **Observation**: The observer WebSocket derives its root URL with `httpBaseToWsRoot`, strips `/v\d+`, and appends `/v1/observer/${sessionId}?access_token=...`.  
  **Why it matters**: This is a likely source of the documented "WebSocket path contract mismatch" between mobile and backend (memory context 19391). The transformation is implicit and brittle: if `API_BASE_URL` ends in a non-version path, the WS root drifts; if the backend expects `/ws/v1/...` or a different route prefix, mobile silently connects to the wrong path.  
  **Recommended change**: Replace derivation with an explicit `ENV.WS_URL` default in `__env__.ts`/`config.ts` that matches the backend contract exactly, and log the resolved URL in `__DEV__` just as the HTTP client does. Add an integration test that asserts mobile and backend agree on the observer path.  **Risk/effort**: HIGH / LOW

- **File/path**: `src/services/ws/realtime.ts:105-112` and `src/services/ws/xiaozhi-device.ts:102-103`  
  **Observation**: Both WebSocket clients discard the original `Error`/`CloseEvent` data and replace it with a generic string (`Realtime WebSocket error`, `Xiaozhi device WebSocket error`).  
  **Why it matters**: Debugging WS failures in production requires codes, reasons, and clean/dirty flags. Element X and BitChat log full close events and use them for reconnect policy.  
  **Recommended change**: Forward the original event object (or its `code`/`reason`/`wasClean` fields) to `onError`/`onClose` callbacks and to telemetry.  **Risk/effort**: LOW / LOW

- **File/path**: `src/services/ws/realtime.ts:71-78`  
  **Observation**: Reconnect uses exponential backoff with `2 ** reconnectAttempt`, capped at 30s, but has no jitter, no max attempt limit, and no online/offline awareness.  
  **Why it matters**: On a flaky network or a permanently wrong URL, the client will hammer the server with deterministic retries.  
  **Recommended change**: Add jitter (e.g., `delay * (0.5 + Math.random())`), cap attempts and surface a terminal error to the UI, and pause reconnect while `NetInfo` reports offline.  **Risk/effort**: MEDIUM / MEDIUM

- **File/path**: `src/contexts/HouseholdContext.tsx:73-75` and `src/contexts/AuthContext.tsx:71-74`  
  **Observation**: Both contexts use arbitrary `setTimeout` fallbacks (5s and 12s) to unblock loading if SecureStore or the network hangs.  
  **Why it matters**: These timeouts mask real performance issues and can race with legitimate cold-start responses, especially because `refresh()` later uses 12s specifically for Render cold starts.  
  **Recommended change**: Surface loading-state guarantees through request cancellation (axios `AbortController`) or `Promise.race` against an operation-specific deadline, and log when the fallback fires so slow endpoints are visible in telemetry.  **Risk/effort**: MEDIUM / MEDIUM

- **File/path**: `src/hooks/useOfflineSync.ts:177-184`  
  **Observation**: Offline replay uses raw `fetch`, bypassing the axios client, token refresh, `normalizeError`, and request-id logic.  
  **Why it matters**: A queued request replayed after a long offline period may use an expired access token and fail with 401 instead of refreshing.  
  **Recommended change**: Replay queued requests through the shared axios client, or at least re-read the access token and run it through the same interceptor pipeline.  **Risk/effort**: MEDIUM / MEDIUM

- **File/path**: `src/contexts/AuthContext.tsx:93-98`  
  **Observation**: Token validation during hydrate checks `status === 401` by probing both `err.status` and `err.response.status`.  
  **Why it matters**: This relies on axios error shape knowledge inside a React context and will break if `normalizeError` is changed to always produce `AppError`.  **Recommended change**: Use the normalized `AppError.status` field consistently, or expose an `isAuthError(error)` predicate from `utils/errors`.  **Risk/effort**: LOW / LOW

- **File/path**: `src/services/http/tokens.ts:5-7`  
  **Observation**: `keychainAccessible` is set to `WHEN_UNLOCKED`.  
  **Why it matters**: This is appropriate for a child-companion COPPA app, but there is no biometric/PIN gate before exposing sensitive parent data. Reference projects (Swiftfin `WithUserAuthentication`, Element X app lock) add an explicit local auth layer.  **Recommended change**: Keep `WHEN_UNLOCKED`, but add a parent-gate screen (matching `parent.api.ts` `/parent/auth`) before showing account/deletion/billing flows.  **Risk/effort**: MEDIUM / MEDIUM

### Simplifications

- **File/path**: `src/api/client.ts`, `src/api/tokens.ts`, `src/api/learning.ts`  
  **Current complexity**: These files are shallow re-exports of `services/http/client`, `services/http/tokens`, and `services/api/learning`.  
  **Simpler alternative**: Remove the `src/api/` indirection and update imports to point directly at `src/services/http/*` and `src/services/api/*`. The alias adds no value and fragments discovery.  **Risk/effort**: LOW / LOW

- **File/path**: `src/services/storage/secureStore.ts` and `src/services/http/tokens.ts`  
  **Current complexity**: Two wrappers around `expo-secure-store` with slightly different option objects (`OPTIONS` vs `SECURE_STORE_OPTIONS`) and overlapping helpers (`getSecureJson`, `setSecureJson`, `deleteSecureItem`).  
  **Simpler alternative**: Consolidate on one secure-storage module. `services/storage/secureStore.ts` already throws typed `StorageError`s; move token helpers there and delete `tokens.ts` duplication.  **Risk/effort**: LOW / LOW

- **File/path**: `src/services/api/account.ts:159-180`  
  **Current complexity**: `getAccountSummary`, `isCoppaVerified`, and other account calls all hit `/account/export` because `/me` is not deployed.  
  **Simpler alternative**: Add a single `getCurrentUser()` helper that calls `/me` when available and falls back to `/account/export`; remove the repeated `data.data ?? data` unwrapping with the shared `unwrap` helper already used in `households.ts`.  **Risk/effort**: LOW / LOW

- **File/path**: `src/hooks/useGeminiConversation.ts` (lines 176-982)  
  **Current complexity**: The hook is ~1,560 lines and owns FSM timers, native audio lifecycle, Gemini SDK setup, reconnect, telemetry, and barge-in ordering.  
  **Simpler alternative**: Extract transport-agnostic pieces: `GeminiSessionManager` (WS/reconnect/resumption), `AudioPipeline` (mic/playback), and `VoiceStateTimers`. This mirrors Element X's service-layer decomposition and would make the realtime path testable.  **Risk/effort**: MEDIUM / HIGH

- **File/path**: `src/services/api/learning.ts`  
  **Current complexity**: Every function throws `backendContractUnavailable`, yet the types and DTOs are fully defined.  **Simpler alternative**: Either keep a feature flag that disables the module, or implement the actual endpoints against the backend contract. The current stubs force callers to handle `FeatureUnavailableError` without delivering value.  **Risk/effort**: LOW / MEDIUM

### Bottlenecks

- **File/path**: `src/services/http/refresh-queue.ts:21`  
  **Observed bottleneck**: `failedQueue` is a module-level mutable array shared across all axios instances. While this serializes refresh, concurrent 401s from many parallel calls can queue a large number of entries and retry them all once the token returns.  
  **Why it matters**: Burst request patterns (e.g., home screen loading) can create a thundering herd after refresh.  
  **Recommended change**: Cap queue length, de-duplicate in-flight requests by URL/method, and consider request coalescing for identical GETs during refresh.  **Risk/effort**: MEDIUM / MEDIUM

- **File/path**: `src/services/http/client.ts:29`  
  **Observed bottleneck**: A 30-second timeout is set globally to accommodate Render cold starts.  
  **Why it matters**: Long global timeouts degrade UX for fast endpoints and can exhaust the JS request pool on poor networks.  
  **Recommended change**: Keep 30s only for known cold-start endpoints; use 10–15s for most endpoints and expose per-call overrides.  **Risk/effort**: LOW / LOW

- **File/path**: `src/hooks/useGeminiConversation.ts:499-842`  
  **Observed bottleneck**: The Gemini Live connect callback and message handler run synchronously on the JS thread and perform many store updates, JSON parsing, and regex checks for every inbound message.  
  **Why it matters**: Under high-frequency audio chunk traffic, this can drop frames and increase latency on lower-end devices.  
  **Recommended change**: Move audio-chunk routing to a minimal native-side or worklet path where possible, and batch non-critical store updates (transcript append, expression detection) with `requestAnimationFrame` or a small debounce.  **Risk/effort**: MEDIUM / HIGH

- **File/path**: `src/services/api/ai.ts:77-133`  
  **Observed bottleneck**: `transcribe`, `chat`, and `synthesize` are fully stubbed, so all AI traffic is forced through the Gemini Live SDK instead of backend AI endpoints.  
  **Why it matters**: Backend resilience (caching, rate limiting, fallback models) is bypassed, and the mobile client depends entirely on Google's realtime path.  **Recommended change**: Implement the backend AI endpoints or remove them and document the conscious architecture decision.  **Risk/effort**: MEDIUM / MEDIUM

- **File/path**: `src/contexts/HouseholdContext.tsx:64-103`  
  **Observed bottleneck**: `refresh()` sequentially fetches households then children, blocking the UI for the sum of both latencies.  
  **Why it matters**: With Render cold starts, this easily exceeds the 12s timeout and leaves returning users on a loading spinner.  
  **Recommended change**: Fetch households and active-household children in parallel (`Promise.all`), and cache the last known household list in AsyncStorage for instantaneous hydration.  **Risk/effort**: LOW / LOW

## Top 3 quick wins

1. **Unify the two axios clients** (`src/services/http/client.ts` + `src/services/api/ai.ts`) into one factory and wire a single auth-invalidated handler. This removes the duplicate interceptor code and closes the stranded-session gap for AI calls. (MEDIUM / MEDIUM)
2. **Fix the realtime WebSocket URL contract**: add an explicit `WS_URL` default in `config.ts`/`__env__.ts`, stop deriving the path from the HTTP base URL, and add an integration test against the backend. (HIGH / LOW)
3. **Forward raw WebSocket close/error events** in `src/services/ws/realtime.ts` and `src/services/ws/xiaozhi-device.ts` to telemetry and callbacks, and add jitter plus offline awareness to the reconnect loop. (MEDIUM / MEDIUM)

## Risk / effort estimates

| Recommendation | Risk | Effort | Notes |
|---|---|---|---|
| Unify axios clients and auth handler | MEDIUM | MEDIUM | Touches most API modules; needs regression of login/logout/refresh flows. |
| Explicit WS_URL + integration test | HIGH | LOW | Backend contract must be confirmed first; implementation is small. |
| Central retry/circuit-breaker | MEDIUM | MEDIUM | Introduces new behavior; test with Render cold-start scenarios. |
| Consolidate request-id/idempotency | LOW | LOW | Straightforward refactor; add unit tests. |
| WS error/close forwarding + reconnect jitter | LOW | LOW | Low blast radius; high observability payoff. |
| Replace arbitrary loading timeouts with cancellation | MEDIUM | MEDIUM | Requires auditing all loading states. |
| Offline replay through axios client | MEDIUM | MEDIUM | Prevents stale-token failures after long offline periods. |
| Use normalized `AppError` in AuthContext | LOW | LOW | Type safety improvement. |
| Remove `src/api/` re-export indirection | LOW | LOW | Import-only cleanup. |
| Consolidate secure-storage wrappers | LOW | LOW | Delete duplicated helpers. |
| Parallel household/children fetch + cache | LOW | LOW | Immediate perceived-performance win. |
| Decompose `useGeminiConversation.ts` | MEDIUM | HIGH | Best long-term maintainability move. |
| Implement or remove AI endpoint stubs | MEDIUM | MEDIUM | Product decision required. |
