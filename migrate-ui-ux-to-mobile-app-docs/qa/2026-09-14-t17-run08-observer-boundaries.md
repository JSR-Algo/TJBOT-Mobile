# T17 run08 observer boundaries

Scope: isolated sys-16 client candidate based on accepted run07. No protocol,
authentication, route, reward, retention or backend change.

The parent-progress client now records the selected child before awaiting the
access token. An old pending open closes when it resolves after a child switch;
it cannot replace the newer connection or subscribe/announce healthy if already
open. Selection identity distinguishes A -> B -> A. Same-child observers retain
their existing independent connection behavior. Stale callbacks and reconnects
are fenced by the same selection identity.

The native parser suite exercises malformed JSON and supplied update fields,
stale snapshots, envelope/status revision mismatch, nullable and partial steps,
decimal revision carries including values above Number precision, and unsupported
URL protocol. Rejected frames leave revision available for the next valid frame.
Canonical backend gateway/broker/status types are pinned in run08 evidence.
Partial deltas are existing consumer compatibility behavior; gateway updates
currently contain complete active projections.

RunningScreen and CompanionScreen tests exercise duplicate checkpoint suppression,
selection changes with a queued old write, observer rejection before/after unmount,
session removal including a pending open, unsupported current state followed by
valid data, and retry after storage rejection. Existing terminal identity and
checkpoint clearing regressions remain. The monitor source needs no change.

Verification receipts live in T17/runs/run-08-20260914-observer-boundaries/checks.
Four new race regressions fail against accepted run07 and pass with the isolated
fix. Required final checks use one native worker and the unchanged run07 coverage
collection and 100% thresholds. Refer to the sealed report for final populations.

Native injectable socket/API/storage tests are client evidence. Nineteen canonical
parity skips, missing authority, flow branch diagnostics and screen-prop validator
limitations remain. Full T17/all-26 service, HTTP/WS/DB/restart, native/Detox,
physical mobile/robot, teacher, media/rights and release gates remain open.
