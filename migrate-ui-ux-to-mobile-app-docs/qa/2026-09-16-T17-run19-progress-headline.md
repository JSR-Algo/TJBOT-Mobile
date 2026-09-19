# T17 Run19: progress headline readiness

TodayProgress shows `Learning progress` while the selected child's complete
projection is unknown. It shows `No practice yet` only when both status and
history have successful data and the existing dashboard aggregate has no
activity. Valid same-child cache remains usable during offline/refetch failures;
child query keys isolate projections. This changes no query policy, dashboard
fallback/body, retry, global offline banner, authentication or reward behavior.

The additive hook field `hasCompleteProjection` reports presence of successful
status and history data, including retained cached data. An empty status response
alone and `isLoading === false` do not establish initial history success.

| Boundary | Required proof |
| --- | --- |
| Uncached offline entry | Actual QueryProvider/NetInfo pauses both reads; neutral title, usable Back, zero API calls. |
| Reconnect | Real singleton resumes each child query once, loading remains neutral, normalized2/4 and5min recover. |
| Initial loading/status error | No false empty headline; unchanged loading/error/retry body and default retries. |
| Split initial completion | Empty status waits for deferred nonempty history. |
| Initial history retry paused/error | No complete-empty claim without successful history. |
| Successful empty/populated | Established headline and dashboard remain. |
| Same-child cached empty/populated | Offline and failed refetch preserve successful data and headline. |
| Public household child selection | Prior-child cached totals disappear; offline new-child data remains unknown until its own successful reads. |
| Lifecycle | Unmount, cancel/clear queries, NetInfo/navigation cleanup, no late fetch, online/timer restoration. |

Test: `tests/features/progress/progress-headline-readiness.test.tsx` uses production
QueryProvider, HouseholdProvider, installed query adapters and real normalizers.
Auth, API/storage/realtime transport and unrelated reward-replay boundaries are
host test seams. It does not prove actual ParentSettings navigation, real services,
native/device connectivity, reward behavior or release readiness.

Causal proof: first NetInfo-enum setup failure retained; next attempt reproduced
five title failures plus two missing React-render waits. Corrected waits produced
seven exact title assertion failures and four passing controls before any product
edit. Typecheck then rejected the unknown-event reachability shape; final fixtures
use valid none/other NetInfo events. With the two product files temporarily restored
to exact Run18 bytes, the final typed fixture again produces seven causal failures
and four passing controls. Identical eleven test cases pass after restoring the
two-file correction. All attempts and their source bytes remain in owned evidence. Existing
successful-dashboard mocks gain readiness metadata; no old assertion changes.

Exact final commands, summaries, source maps, changed coverage maps/denominators,
and limitations are sealed under the Run19 root. All100%coverage/full physical,
service and production requirements remain binding; full T17/T21/S20/S21 are
BLOCKED and .74 remains NO_GO pending independent review and missing evidence.

## Authorized same-cause ParentHistory extension

The coordinator's additional ParentHistory supplement authorizes the same absent
history-data cause in `ParentHistoryScreen`. Its real compatibility parent hook
remains unmodified and unmocked. The existing loading presentation now also covers
unknown data without error, including initial offline pending/paused. Existing
error priority, successful empty rows, cache policy, report navigation and
pagination remain unchanged.

Actual QueryProvider/HouseholdProvider/NetInfo regression records one false
`No completed lessons yet` failure and sixteen passing controls on the unchanged
ParentHistory screen. The identical seventeen-case suite passes after the
one-condition screen correction. Offline entry starts zero history/status reads;
reconnect fetches the exact selected child once and exposes its actual session
report route. Ordinary loading, successful empty, error/Retry, and cached
empty/populated offline/refetch-error controls retain established behavior.

The narrower source had already completed23 checks and one41-file coverage run
(3366 tests/244 suites, coverage thresholds FAIL) when this authorization arrived.
That exact source/evidence is retained. A subsequent complete final check set and
one final coverage invocation are necessary for the newly authorized source.
The unchanged41-file coverage selection does not include ParentHistoryScreen;
its correction is exercised by focused/full host tests, not falsely reported as
part of that coverage gate. No full/native/service/release gate is closed.
