# T17 run11 duration fixture correction

Run10's refreshed history row claimed420active seconds between16:20and16:25.
The independent review correctly rejected that row as producer-reachable proof.
ParentLearningProgressService recent-session SQL subtracts nonnegative inactive
duration from elapsed time, clamps to zero and floors seconds. Seven active
minutes cannot fit in five elapsed minutes.

The refreshed row now ends at2026-09-14T16:27:00Z; durationSec remains420and the
visible7min assertion is unchanged. A shared refreshedHistory fixture feeds both
the UI test and a new invariant test. The initial status/history row also gets
the invariant. Each row must have a nonnegative integer active duration bounded
by its own elapsed interval; a null start permits only zero duration. The test
does not derive timestamps from duration and does not replace backend SQL.

| Proof | Expected result |
| --- | --- |
| Invariant with the sealed bad row | FAIL:420exceeds300elapsed seconds |
| Invariant after timestamp-only correction | PASS:420within420seconds |
| Actual dashboard focus | PASS:status and history refresh;7minstill displayed |
| Initial status/history row | PASS:300within300seconds |
| Product source/configuration | Unchanged fromrun10 |

Run11 retains the red input, raw Jest receipts, green input and exact delta.
Related review covers the run10suites and neighboring parent/progress history
fixtures. No second bad override exists in the two run10suites. Two older
presentation-only tests use near-identical now timestamps with300seconds;
those mock the dashboard hook and remain synthetic render evidence, not
producer-reachable timing evidence. They are recorded for independent triage,
preserved unchanged and not covered by run11's fixture-invariant claim.

This correction narrows run10's overbroad fixture-provenance claims additively;
run10source/evidence remains sealed and unchanged. It is a test-data defect,
not a product bug. The native closing-interval semantics, RNTL13, actual
Navigation/TanStack behavior and prior terminal-readback correction remain intact.

All required final-source checks run in the owned run11copy with frozen
dependencies and unchanged100%coverage configuration, denominator and thresholds.
FullT17/live26/HTTP/WS/DB/restart/native/Detox/physical/teacher/media/rights,
canonical parity authority, validator reporting, candidate integration and release
gates remain BLOCKED/PARTIAL. No backend execution or policy change is included.
