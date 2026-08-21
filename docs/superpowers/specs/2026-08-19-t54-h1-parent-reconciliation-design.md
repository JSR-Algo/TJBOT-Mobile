# T5.4 H1 Parent Reconciliation Design

## Context

T5.4 pass 14 completed the physical lesson and persisted the terminal state, but Parent Today stayed on `READY` for 40 consecutive observations, captured no step screenshots, and returned to Profile after completion. Backend persistence, the retained renderer verifier, and the production probe were healthy. The remediation therefore stays within the mobile sys-16 boundary and does not change backend or firmware contracts.

The strict physical acceptance remains authoritative. The mobile application must display real persisted progress; it must not synthesize progress events, infer timestamps, require manual refresh, or alter the physical capture criteria.

## Selected Approach

Use three complementary safeguards at the Parent learning-status query boundary:

1. Apply monotonic projection arbitration so an HTTP response with an older `projectionRevision` cannot replace newer realtime query data.
2. Keep realtime as the primary path, while running a bounded low-frequency foreground reconciliation request whenever Parent Today has an active assignment. This covers a socket that remains connected but delivers no usable step frames.
3. Preserve the Parent Today protected-stack route across terminal and household/query updates. Regression coverage must prove these state changes do not remount the navigator at its Profile default route.

These safeguards solve distinct observed failure modes. Arbitration alone cannot recover a silent healthy socket; polling alone can still regress the cache; data correctness alone does not prove route stability.

## Alternatives Rejected

### Revision arbitration only

This is the smallest data-layer change, but it cannot make progress visible when the socket is nominally healthy and silent. It would leave the pass 14 observation pattern possible.

### Foreground reconciliation only

Periodic HTTP reconciliation can recover missing frames, but a delayed older response can still overwrite newer realtime state. This does not establish monotonic presentation.

### Backend or firmware changes

Current evidence shows persisted terminal state, a healthy production probe, and complete backend projections. No evidence justifies crossing the sys-16 ownership boundary.

## Data Flow

Realtime frames and HTTP responses continue to use the existing Parent learning-status query key and existing projection shape. Before committing incoming data, the query boundary compares `projectionRevision` values:

- A newer revision replaces the cached value.
- An equal revision may refresh equivalent server fields without regressing progress.
- An older revision is ignored while the newer cached projection remains visible.
- Missing or malformed revision information follows the existing fail-closed behavior; the client does not fabricate ordering or progress.

While Parent Today is foreground and its current projection describes an active assignment, a low-frequency timer requests the existing HTTP projection even when the realtime socket is connected. The timer stops when the screen loses focus, the assignment becomes terminal, the component unmounts, or the query is no longer eligible. This is reconciliation, not a manual refresh and not a second source of truth.

## Navigation Stability

Parent Today remains the current protected-stack route while assignment progress, terminal state, or household context refreshes. No terminal-state handler should navigate to Profile. Tests will exercise the relevant provider/root rerenders and assert that the active protected route remains Parent Today.

If the regression shows the route loss originates from navigator identity or key changes, the implementation will stabilize that identity at the narrowest existing boundary. It will not add imperative navigation to compensate for remounting.

## Error Handling

- Reconciliation uses the existing query error semantics and observability path.
- A failed reconciliation does not clear a valid cached projection.
- Only older projection revisions are rejected; unrelated errors remain fail-closed.
- Timers and subscriptions are cleaned up on blur/unmount to avoid background polling.
- No progress percentage, step event, timestamp, or completion state is synthesized.

## Test-First Verification

Implementation begins with failing regression tests for:

1. Realtime revision `N` followed by HTTP revision `N-1` keeps revision `N` visible.
2. A healthy but silent socket still receives bounded foreground reconciliation while an assignment is active, and reconciliation stops when inactive or unfocused.
3. Terminal projection and household/query rerenders do not reset Parent Today to Profile.

After RED-GREEN cycles, run focused Parent/query/realtime/navigation tests, full unit and integration tests, TypeScript, lint, applicable repository validators, and the Android release build. No release APK is installed until those gates are green.

## Physical Closeout

Install the verified release APK and run exactly one fresh strict assignment after Parent Today has remained continuously foreground for more than 15 minutes. Any other focused app restarts the dwell timer. The physical run keeps all original T5.4 requirements, including automatic `s1.png`-`s9.png` and XML captures, exact `captures.tsv` percentages, canonical step timestamps and raw observed latencies, audio/layers/MCP evidence, terminal persistence and assignment read-back, return to `CONVERSATION` with the normal face, renderer verifier `101/101`, and production probe exit `0`.

If any acceptance item fails, preserve evidence, route a finding, and leave T5.4 `IN_PROGRESS`. This session does not merge or clean worktrees.
