# T17 run05 course entry identity and lifetime

Authorized existing behavior correction in isolated mobile run05, unintegrated.

Unlock fences device lookup, enrollment continuations and UI handoff on activity,
account, household, active child, course, Back and unmount. Its in-flight ref still
prevents overlapping taps. An enrollment already dispatched may succeed remotely;
this work does not cancel transport, infer terminal success or automatically replay it.
Incomplete or mismatched enrollment receipts require explicit selection/Robot review.

Unlock -> CourseAdded -> RobotReady now carries selected child, endpoint-scoped
device, assignment ID and positive version, profile and manifest checksum. Added
reads current assignment and preload on active focus/foreground and explicit retry;
only exact active assignment identity supplies its lesson title and handoff. READY
copy additionally needs matching READY preload; RUNNING copy excludes contradictory
terminal preload. Unknown or replaced identity offers retry and explicit selection,
never another automatic assignment. Removed unconditional play/tomorrow scheduling copy.

NeedsSync's typed route can receive the same complete selection. Its current source
callers are registration/state metadata only, with no production navigate producer.
It resolves a missing device for the selected child, then reconciles current+preload;
preload alone cannot establish child/version/checksum. Neither callback nor Back/home
navigation clears recovery checkpoints. Missing metadata does not adopt a current seat.
The purchase FirstCourse caller still supplies no assignment and opens explicit selection.

Send's resumeContext is included in the activity generation so A-B-A cannot revive
an old automatic-resume or manual preflight. There is no src resumeContext producer:
these are typed-route regressions, not evidence of an observed production incident.

The enrollment/current/preload response parsers retain missing/non-string profile as
unknown (empty string), rather than fabricating espTft; explicit profiles are unchanged.
READY/RUNNING consumers reject unknown profiles and contradictory preload error/terminal
status. No backend schema, auth, quotas, retention, pairing or activation changes.

Verification receipts, causal red logs, final counts and prerequisites live in the
sibling run05 evidence directory. All26/service/device/teacher/release remains BLOCKED.
Run04 self-review incorrectly claimed effect-cleanup guards in Unlock and NeedsSync;
neither had them. This is an additive correction; sealed run04 remains untouched.
