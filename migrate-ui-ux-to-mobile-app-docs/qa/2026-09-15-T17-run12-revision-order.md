# T17 run12: delayed smaller-width snapshot

One native adapter test exercises the unchanged parent-progress transport on one
selected child and one OPEN socket: accept update "10", reject delayed snapshot
"9" without any callback, reject duplicate update "10" to prove no revision
rollback, then accept update "11". Cleanup closes the socket only after delivery.
The actual normalizers and reconnecting transport remain unmocked.

The pinned backend gateway selects the child before awaiting sendSnapshot and
getStatus. Snapshot delivery is outside broker deliveryTails. Its snapshot envelope
uses the status revision; updates carry activeLearning, including null. The test
uses these producer-shaped frames with decimal-string revisions. This is proof
of client handling of a producer-permitted ordering, not actual gateway/database
interleaving, server authentication or physical transport proof.

Evidence: owned run12 checks, coverage-scope.json, coverage-location-delta.json,
contract-pins.json, report.md and final-receipt.json outside the mobile copy.
The final 21-command plan retains the previous coverage scope and 100% thresholds.
Full T17/all26/live/restart/native/physical/media/rights/release remain BLOCKED;
19 canonical parity skips and validator PARTIALs remain disclosed. Run11's
duration correction and all existing product/configuration bytes are preserved.
