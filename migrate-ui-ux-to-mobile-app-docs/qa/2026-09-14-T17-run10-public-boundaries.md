# T17 run10 public refresh and selection boundaries

Tests-only candidate based on accepted run09. Product and contract bytes remain
unchanged. This document describes the selected proof; native receipts in run10
record the final results and source identity.

| Requirement | Public native assertion |
| --- | --- |
| Library explicit retry | Busy/disabled action prevents a second press; recovery opens the returned course ID |
| Retry failure | Friendly offline/service copy and a newly enabled explicit retry |
| Library focus invalidation | Old retry success and rejection cannot replace refreshed catalog |
| Focus lifecycle | Duplicate focus does not fetch; blur and return does fetch |
| Dashboard retry | Actual TodayProgressScreen refetches status and history; pending history keeps loading |
| Dashboard focus | Both projections refresh, updating visible course and duration totals |
| Household midnight | Identical status payload retains cache identity but today resets; lifetime totals remain |
| Missing child | No reads until child selection; then normal initial fetch |
| Child switch | Late A status/history cannot replace B; subsequent focus fetches B |
| Native closing interval | Queued old-child snapshot/update and 4401/4403 close notifications are fenced during B credential wait |
| A to B to A | First A closing callbacks cannot affect newly selected A or its revision |

Screen tests run actual React Navigation useFocusEffect through NavigationContext,
real TanStack Query and public screen components. HTTP API functions and realtime
acquisition are test seams; catalog/status fixtures pass the actual normalizers.
Backend catalog/parent-progress source is pinned separately in run10. No backend
query, auth lease, publication, transport connection or physical device is executed.

Transport tests use actual openParentProgressRealtime/createReconnectingSocket and
an explicit RealtimeSocket adapter. RN 0.83.4 WebSocket.close enters CLOSING and
keeps native message subscriptions until websocketClosed; the adapter permits
queued messages only before that native close notification, then removes handlers.
It does not invoke private parent-progress callbacks or emit messages after CLOSED.
Gateway snapshot revisions match status revisions; updates carry full null-active
projections. The HTTP-to-WS URL case is local development configuration evidence.

The midnight hypothesis is not a reproduced product defect: the actual history
hook constructs a fresh item list, so the dashboard recomputes after focus even
when TanStack Query structurally shares the unchanged status. No product fix or
causal failing regression is claimed.

Do not force library blank-ID/default/locked branches: current normalizer removes
blank IDs, sets owned=true/locked=false and always returns an array. Default load
arguments are always supplied by public callers. Invalid Date/revision guards are
not evidence of a canonical producer path. Other remaining coverage locations
are inventoried in run10; they are not all declared unreachable.

Unchanged 100% coverage thresholds and the 19 historical canonical parity skips
remain requirements. Full T17/all26/live HTTP/WS/DB/restart, native/Detox, physical
mobile/robot, teacher, media provenance/rights, integrated candidate and release
acceptance remain BLOCKED. These tests do not qualify a shared candidate or .75.
