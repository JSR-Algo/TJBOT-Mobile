# T17 M01/M02 isolated source verification

This candidate is an independent snapshot of original mobile HEAD
`7b8be5051e047c2570d942d6e72876376146418d`, including all ten selected dirty entries.
The source baseline is run02/.74; no .75 or temporary backend candidate is adopted.
Evidence is under T17/runs/run-03-20260914-mobile-assignment-reconciliation.
The portable patch is relative to that dirty source snapshot, not HEAD alone.

M01: active disappearance does not mean completion. Only matching ID/version
terminal readback or the current session's recognized observer terminal establishes
an outcome. COMPLETED shows success; FAILED/CANCELLED show unsuccessful copy.
Unknown status retains checkpoints and reaches bounded retry. Observer and request
callbacks are fenced on selection change, unmount, and confirmed terminal.
Checkpoint writes and terminal clear remain serialized.

M02: Ready matches route, active assignment and preload identity before rendering
handoff, rechecks on press, and forwards verified child/ID/version/session. It never
uses a route checksum to authorize absent current state or adopts replacement B.

Native Jest/RNTL 13 evidence includes a preserved three-test causal red and green,
minimal producer parser/request-shape tests, terminal and uncertainty tables for
both screens, stale callback/observer tests, checkpoint rejection/ordering tests,
and navigation callers. Inert API mocks do not prove HTTP/auth/DB/robot behavior.
Final focused execution: 12 suites, 344 passed, 0 failed, 0 skipped. Strict
typecheck and lint both exit 0. The coverage run passes the same 344 tests but
exits 1 against unchanged global 100% thresholds: statements 47.24%, branches
38.36%, lines 49.6%, functions 41.49%. Original collection patterns are retained
and the changed files are added explicitly. The pure identity module covers all
10 statements, 5 functions and 49 branches; monitor coverage is 127/135 statements,
20/21 functions and 74/82 branches. This is a focused test selection, not full
repository coverage proof. Exact commands, source/dependency hashes and gate
limits are in the run's report, checks, preservation, and verification artifacts.

Full T17 remains BLOCKED. M03 mounted readiness lifecycle and M04 publication
refresh remain open. Full npm test includes a localhost-listener test and is not
executed under this run's no-service scope. Integration setup, actual HTTP/WS,
DB/Redis, auth journeys, media registration, firmware builds/flash and physical
A/B lesson execution are not authorized evidence. Repository coverage thresholds
remain at 100%; any shortfall is reported, never bypassed. No release/admission
or original repository integration is performed.
