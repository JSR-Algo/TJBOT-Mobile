# T17 Run20: 41-file coverage closure

The mandated 41-file course/lesson/progress coverage selection now reports 100%
statements, branches, functions and lines under the unchanged thresholds,
denominator selection and Jest configuration. No istanbul/c8 ignore comments,
exclusions, threshold or configuration changes were added; no test was deleted
or weakened.

Twenty new host tests exercise public behavior only: same-frame double taps on
Add/Resume/Try again, a hand-off tap in the same frame as backgrounding, route
entries without params or without an assignment version, enrollment and conflict
receipts that omit a lesson title or checksum (through the real normalizers),
published lessons without an id, whole-course mode with a retired route course,
an unbound robot routed to the active child, the Done word count, the Summary
reward celebration, an invalid dashboard clock, ISO diagnostics expiry, and a
malformed persisted realtime revision.

Seven product files lose only provably unreachable code, each justified in the
Run20 report: redundant current-action re-checks with no asynchronous boundary,
guards dominated by the same predicate that enables the public control,
fallbacks for values the real normalizers or the household context never
produce, an always-supplied retry label, and reconnect callbacks that a closed
reconnecting socket never invokes. The Send screen now derives one validated
send plan from the same selection state that enables its CTA; the Resume action
receives its child from the render that shows it. Wire payloads, copy, route
params and query policy are unchanged.

| Boundary | Required proof |
| --- | --- |
| Double taps | One preflight/enrollment/hand-off/verification per same-frame pair. |
| Background race | Same-frame hand-off ignored; hand-off after return succeeds. |
| Partial receipts | Route params carry `undefined`/`null`, never an empty title. |
| Legacy routes | Terminal current record without a known version keeps polling. |
| Missing child | Resumable course whose child disappears falls back to the connection prompt. |

Host tests do not prove service, native, physical-device, media/rights, all-26
journey or release readiness; full T17/T21/S20/S21 remain BLOCKED and .74 NO_GO.
