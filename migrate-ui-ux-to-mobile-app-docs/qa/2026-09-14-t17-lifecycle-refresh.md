# T17 M03/M04 isolated lifecycle verification

Run04 extends the exact reviewed run03 M01/M02 candidate and preserves all original
selected dirty work. `useScreenActivity` invalidates prior reads on focus,
foreground, route, child, account and household transitions. Ready pauses reads
while inactive, discards cached eligibility, and monitors matching RUNNING with
verified identity. Replacement/unknown/terminal current reads never infer success
or clear the selected checkpoint. Settling stays bounded at 18 reads.

CourseDetail refreshes title/count and lessons in one fenced round; a lesson error
retains only fresh catalog metadata. Send refreshes the public catalog, preserves
valid choices and explicitly requests reselection when an exact version/profile
or course disappears. New default sends use public B; submitted/running A remains
A. Preflight, write, resume and conflict callbacks reject stale contexts, selection
changes and unmount; same-frame taps remain single-flight. Refresh never repeats
an automatic resume write.

Native RNTL13 regressions preserve causal reds for mounted A/B refresh, initial
RUNNING, exact picks, stale preflight/write/navigation and profile conflicts.
The final command index, counts, coverage, runtime and source/dependency pins live
in T17/runs/run-04-20260914-mobile-lifecycle-refresh. The source is not admitted or
integrated. Run03 QA remains historical evidence for its own source state.

Only loopback mock-server/mobile client integration is authorized. The test helper
accepts E2E_MOCK_BIND_HOST; run04 explicitly sets 127.0.0.1. No external backend,
shared DB/Redis, private bearer fixtures, native device builds or physical journey
is used. Inert lifecycle tests and mock HTTP do not prove actual app foreground,
real authorization, database or robot behavior. Global coverage thresholds stay
100%; canonical-contract parity's missing TJBot-infra prerequisite remains a gap.
Full T17 all26/service/browser/physical/teacher/media and release gates stay BLOCKED.
