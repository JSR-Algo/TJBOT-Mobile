# T10: Forward raw WebSocket events and harden reconnect logic

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: MEDIUM

## Problem
Both WebSocket transports in the mobile layer discard original close/error event data and replace it with generic strings, stripping away the codes and reasons required for production debugging. The reconnect loop also retries deterministically without jitter, without a maximum attempt limit, and without awareness of the device going offline.

Specific issues (from `reports/network-auth-ws.md#improvements`):

- `src/services/ws/realtime.ts:105-112` and `src/services/ws/xiaozhi-device.ts:102-103` replace the original `Error`/`CloseEvent` data with generic strings (`Realtime WebSocket error`, `Xiaozhi device WebSocket error`).
- `src/services/ws/realtime.ts:71-78` uses exponential backoff (`2 ** reconnectAttempt` capped at 30 s) but has no jitter, no maximum attempt limit, and no online/offline awareness.

This means:
- Production WS failures cannot be differentiated by close code (`1006` abnormal closure vs. `1011` server error vs. `4401` auth expiry).
- A bad URL or flaky network causes deterministic retry storms against the server.
- Users who lose connectivity keep seeing reconnect attempts instead of a clear offline state.

## Scope

### In scope
- `src/services/ws/realtime.ts`
  - `RealtimeHandlers.onError` / `RealtimeHandlers.onClose` signatures
  - `ws.onerror` / `ws.onclose` forwarding
  - `scheduleReconnect` jitter, attempt cap, terminal error surfacing
  - `NetInfo` subscription for offline pause/resume
  - Telemetry capture of raw close codes
- `src/services/ws/xiaozhi-device.ts`
  - `XiaozhiConnectParams.onError` / `onClose` forwarding
  - Same resilience behaviors as realtime.ts (jitter, cap, offline pause)
- `tests/verification/T10-ws-resilience-event-forwarding.test.ts`

### Out of scope
- `src/config.ts` and `src/__env__.ts` — explicit `WS_URL` resolution is owned by T08.
- `src/services/http/client.ts` — axios retry/unified client is owned by T09.
- Native WebSocket implementation changes.
- New UI screens or copy; terminal errors are surfaced through existing `onError`/`onClose` contracts.

## Proposed solution

1. **Forward original error data**
   - In `realtime.ts`, change `ws.onerror` from `handlers.onError?.(new Error('Realtime WebSocket error'))` to pass a structured object or an `Error` whose `cause`/`message` contains the original event data (e.g., `{ message: string; code?: number; original?: unknown }`).
   - Apply the same change in `xiaozhi-device.ts` for `params.onError`.

2. **Forward `wasClean` on close**
   - Change `realtime.ts` `ws.onclose` to call `handlers.onClose?.(ev.code, ev.reason || '', ev.wasClean)`.
   - Change `xiaozhi-device.ts` `ws.onclose` to call `params.onClose?.(ev.code, ev.reason || '', ev.wasClean)`.
   - Update the public handler type signatures so callers can optionally consume `wasClean` without breaking existing two-argument callbacks.

3. **Harden reconnect logic in `realtime.ts`**
   - Add jitter: `const jittered = delay * (0.5 + Math.random())`.
   - Add `RECONNECT_MAX_ATTEMPTS` (suggest `10` for P1; product can tune).
   - After exhausting attempts, call a new `onTerminalError` handler (or reuse `onError` with a terminal flag) and stop scheduling reconnects.
   - Track whether the connection has ever successfully opened; do not treat the initial failure as terminal immediately.

4. **Add offline awareness**
   - Subscribe to `NetInfo.addEventListener` inside `openRealtime`.
   - When `!state.isConnected`, cancel any pending reconnect timer and set a flag `isOffline = true`.
   - When the device comes back online and the socket is closed and not explicitly closed by the client, immediately reset `reconnectAttempt` (or clamp to a small value) and call `connect()`.
   - Unsubscribe in the `close()` cleanup.

5. **Telemetry**
   - Import `@sentry/react-native` and/or `posthog-react-native` (already mocked in tests) and include the raw close code and reason in the event context/extras when a non-clean close occurs.
   - Keep the event lightweight; do not log the access token.

6. **Apply equivalent changes to `xiaozhi-device.ts`**
   - The device path does not need infinite reconnect (callers can recreate the connection), but it should still forward original events and include jitter/max-attempt logic if it already has reconnect behavior. If `xiaozhi-device.ts` currently has no reconnect loop, limit this task to event forwarding and add a TODO/comment that resilience mirroring is future work.

## Acceptance criteria
Registry criteria (refined):

- [ ] `onError` callbacks receive the original error code/reason or a structured object.
- [ ] `onClose` callbacks receive `code`, `reason`, and `wasClean`.
- [ ] Reconnect delay includes jitter and caps attempts before surfacing a terminal error.
- [ ] Reconnect pauses while NetInfo reports offline and resumes when online.
- [ ] Telemetry includes raw close codes for production debugging.

## Dependencies
- **T08** — explicit `WS_URL` contract. T10 changes the WebSocket surface but should not change URL derivation; it must build on top of T08's resolved URL.

## Exclusions / anti-overlap
- **T09** must not touch `src/services/ws/realtime.ts` reconnect/event logic in parallel; T09 owns the HTTP/axios surface.
- **T16** consumes `realtime.ts` for lesson sessions; any change to `RealtimeHandlers` signatures must remain backward-compatible so T16 does not need to rewrite its callers.

## Verification test plan
- Test file: `tests/verification/T10-ws-resilience-event-forwarding.test.ts`
- What it proves: The WebSocket transports forward original error/close event data, apply jittered exponential backoff with a maximum attempt cap, pause reconnect while offline, resume when online, and report raw close codes to telemetry.
- How to run it: `npx jest tests/verification/T10-ws-resilience-event-forwarding.test.ts`
- Expected state before fix: FAIL
- Expected state after fix: PASS

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Changing `onClose` signature breaks existing callers (T16 lesson session machine). | Add `wasClean` as an optional third argument; existing two-argument callbacks continue to work. |
| NetInfo subscription leaks if `close()` is not called. | Unsubscribe in `close()` and also add a `beforeunload`-style fallback if feasible. |
| Jitter + max attempts could hide permanent backend failures. | Surface a terminal error through `onError` so callers can navigate to `NetworkErrorScreen` or `AppErrorScreen`. |
| Offline detection is delayed on iOS/Android. | Use `NetInfo.fetch()` at startup and treat `isInternetReachable === false` the same as offline. |
| Telemetry includes PII. | Only log `code`, `reason`, and `wasClean`; never log the `access_token` or session content. |

## Coordination notes
No cross-role coordination required. Align with T08 owner on the resolved `WS_URL` shape and with T16 owner if `RealtimeHandlers` signature changes.

## Implementation hints
- Read `src/services/ws/realtime.ts` lines 71-112 and `src/services/ws/xiaozhi-device.ts` lines 102-103 first.
- `tests/setup.ts` already mocks `@react-native-community/netinfo`, `@sentry/react-native`, and `posthog-react-native`; use those mocks in the verification test.
- The existing `expo-secure-store` mock is sufficient for `getAccessToken` to work if tokens are pre-seeded, or mock `getAccessToken` directly.
- Keep the global `WebSocket` mock class simple: expose `simulateOpen`, `simulateError`, `simulateClose`, and a static list of instances so tests can assert reconnect behavior.
- For jitter, assert variance across several reconnects rather than exact values; deterministic delays should fail the assertion.
