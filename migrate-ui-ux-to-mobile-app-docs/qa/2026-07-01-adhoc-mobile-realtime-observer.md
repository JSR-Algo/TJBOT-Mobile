# Mobile Realtime Observer Transport QA - 2026-07-01

## Verdict

Partial, local-only. The parent observer transport is no longer a throwing stub, and the local current-assignment/mobile route carry can now preserve an optional observer `sessionId` when one is supplied. Production observer auto-attach is still not proven because the live backend/session handoff has not yet shown an authoritative realtime `sessionId` flowing through the deployed environment to `wss://realtime/v1/observer/{session_id}`.

## Scope Closed Locally

- `src/services/ws/realtime.ts` and the Jest-resolved `src/services/ws/realtime.js` implement `openRealtime(sessionId, options)`.
- Empty session ids and missing bearer tokens reject before opening a socket.
- Observer URLs derive from the configured API origin and reject unsupported schemes.
- Socket factory receives bearer auth.
- JSON frames are parsed and delivered to `onFrame`.
- Invalid JSON is reported as `REALTIME_FRAME_INVALID_JSON`.
- Consumer `onFrame` exceptions are surfaced as their original errors, not mislabeled as JSON corruption.
- Abnormal reconnects re-read the access token.
- Reconnect attempts are bounded and do not reset on short-lived `open -> close` loops.
- Reconnect exhaustion emits `REALTIME_RECONNECT_EXHAUSTED`.
- Reconnect socket-construction failures emit `REALTIME_SOCKET_CREATE_FAILED`.
- Transient reconnect socket-construction failures do not stop the reconnect loop
  while reconnect attempts remain.
- `onClose` observer callback failures are reported without preventing the
  scheduled reconnect attempt.
- `onError` observer callback failures do not escape the socket event handler
  and crash the realtime transport.
- Manual close clears timers and does not reconnect.

## Verification

- RED: `npx jest --selectProjects unit --runTestsByPath tests/services/ws-realtime.test.ts --runInBand` failed on the previous implementation for callback-error relabeling, stale token reuse, unbounded open-close reconnect loops, unhandled reconnect constructor failures, and unsupported URL schemes.
- RED: `npm test -- --runTestsByPath tests/services/ws-realtime.test.ts` failed while `onClose` and `onError` observer callback exceptions escaped the socket handlers; the `onClose` failure also prevented reconnect scheduling.
- RED: `npm test -- --runTestsByPath tests/services/ws-realtime.test.ts --runInBand` failed while a transient reconnect socket-construction failure stopped the reconnect loop instead of consuming the remaining retry budget.
- GREEN: `npm test -- --runTestsByPath tests/services/ws-realtime.test.ts --runInBand` -> 1 suite / 13 tests passed.
- `npx tsc --noEmit` passed.
- `npx eslint src/services/ws/realtime.ts src/services/ws/realtime.js tests/services/ws-realtime.test.ts --max-warnings=0` passed.
- `npm run lint` passed.
- `npm test -- --runInBand --silent --json --outputFile=/tmp/tbot-mobile-jest-realtime-reconnect-hardening.json` passed: 192 suites total, 191 passed, 1 skipped; 2051 tests total, 2032 passed, 19 skipped, 0 failed.
- `git diff --check -- src/services/ws/realtime.ts src/services/ws/realtime.js tests/services/ws-realtime.test.ts migrate-ui-ux-to-mobile-app-docs/qa/2026-07-01-adhoc-mobile-realtime-observer.md` passed.

## Remaining Gaps

- `RunningScreen` and `CompanionScreen` may carry an optional observer `sessionId` from current-assignment/mobile route state, but production auto-attach remains gated on backend/session handoff proof from the live environment.
- Do not synthesize or substitute lesson `assignmentId` for `openRealtime`; ADR-0006 still requires the phone to attach to the read-only observer lane by authoritative realtime session id.
- Native/Detox or hardware lifecycle proof is still required for app background/reconnect behavior.
- CP-7 hardware proof remains open and this local transport work does not reduce the 13-row production-readiness ledger.
