# T17 run09 public mobile journey boundaries

This isolated continuation adds native tests only; mobile product behavior and
all accepted run08 fixes remain unchanged. The new suite uses actual CourseDetail,
Send, RobotReady, Running and Companion screens with injectable API/storage seams.

CourseDetail coverage now includes unavailable enrollment status, stale read
rejection, resume device failure and explicit recovery, late resume success/error,
unavailable conflict readback, cancellation that leaves an active enrollment,
unavailable cancellation readback, a stale native confirmation, and late failure
after unmount. Cancellation does not clear a running lesson checkpoint: the
canonical backend changes enrollment status without cancelling its assignment.

Send coverage includes supported preparation failure, unreadable conflict
recovery, late success/failure/readback after mode or child selection changes,
read-only preflight retry, automatic resume with offline/foreign-child devices,
and a stale automatic enrollment result after course selection changes. A recovered
assignment follows actual Send -> Ready -> Running and writes its exact recovery
identity once. API fixture shapes use the real enrollment/assignment normalizers.

Both Running and Companion reject canonical terminal readback when a legacy route lacks
a verified assignment version; a later matching active read learns the version,
after which a terminal readback can clear the checkpoint and show completion.
The pinned backend getCurrentAssignment query excludes terminal states. Therefore
the monitor's terminal-current version guard is unreachable through that producer;
tests exercise getAssignmentReadback instead of inventing a terminal active record.

Disabled Send controls make the internal no-child/no-course/not-ready/no-lesson
early-return guards unreachable through a normal press. A validated lesson profile
cannot subsequently become invalid inside the same async closure. CourseDetail's
primaryAction already selects resume for an active enrollment; the equivalent
fallback inside handleAddToRobot cannot be reached by that public selection.
Tests do not directly invoke these private callbacks or mutate shared fixture
objects during an await to force those branches.

All prior tests and assertions remain. No source exclusion, threshold, or skip
rule changes. The first draft had unsupported error mocks and a wrong course CTA
label; those fixture failures are retained separately, not called product reds.
Final test populations, coverage location deltas and scope are in the run09 report.
Native proof does not establish live HTTP/WS/DB, auth, physical storage, native/Detox,
all26 robot lessons, teacher review, media/rights, integrated candidate or release
acceptance. The19canonical skips and prior validator limitations remain.
