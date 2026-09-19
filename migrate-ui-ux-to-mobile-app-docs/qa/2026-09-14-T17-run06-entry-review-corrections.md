# T17 run06: entry review corrections

Scope: isolated sys-16 candidate derived from reviewed run05. Unintegrated;
coordinator review is required. Full T17 and physical/service/release gates stay open.

| Requirement | Behavior and native regression |
| --- | --- |
| Existing RUNNING rejoin | NeedsSync accepts exact current RUNNING with matching preload READY or RUNNING and no error, then preserves the selection through Added/Ready to Running. |
| Contradiction rejection | READY current still requires READY preload. RUNNING rejects terminal/preloading/unassigned/error states and mismatched assignment/profile/child/version/checksum. |
| Uncertain enrollment | Mounted registry identifies account, household, child, course and resolved device. Returning to the same request never replays an unresolved dispatch. |
| Different selection | Explicit Add remains available and re-resolves primary device. Course/child/account/household/device B can dispatch while A remains guarded, including A-B-A. |
| Late results | Lifecycle generations still fence navigation/errors. Per-generation pending locks prevent old callbacks releasing a newer duplicate lock; distinct B can proceed while A is pending. |
| Lost response | Network/unknown/server/timeout failures retain the uncertain guard. Definitive playability rejection and failed device lookup preserve explicit retry. |

The registry is mounted-screen memory, not persistence or backend idempotency.
No automatic enrollment, assignment, activation, start or recovery-checkpoint clear.
An explicit Add for a retained identity performs only device lookup and shows existing
verification/selection guidance. Existing auth, ownership, profile and exact-version
rules remain. No production NeedsSync route producer is introduced.

Tests use React19.2/RN0.83.4/RNTL13.3.3/Jest29.7, actual components and mocked APIs,
focus, account and household. They do not establish physical or real-service results.
Native focused/full/integration/coverage and repository checks are recorded in the
run06 evidence directory. Unchanged100% coverage,19 canonical-authority skips,
flow branch diagnostics, screen-prop checker limits and native/Detox prerequisites
must remain explicit limitations of the handoff.
