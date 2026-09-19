# S16 Run15 public behavior proof

Owned unintegrated test additions preserve accepted Run14 product/configuration.
A1: 14 public recovery/back cases. A2: 1 exhausted polling/retry identity case.
A3: 3 stale rejection/partial fan-out cases. A4: 3 QueryClient/normalizer cases.
A5: 6 canonical parser/receipt cases. A6: 1 absent-expiry logger case.
No disabled callbacks/private refs, service/device operations or policy changes.

Fit fixture fields follow backend src/lessons/public/public-catalog.service.ts
projection (lessonId, lessonVersion, profile, manifestReady, difficultyBand,
estimatedDurationSec, topicTags, personalization). No ranking algorithm claim.

Duplicate omissions: course-public-refresh-boundaries tests already replace old
library retry success/rejection on focus and ignore old dashboard child results.
course-journey-boundaries already ignores enrollment rejection after route change,
old resume success/failure and rejected create after child selection. Existing
RobotReady unmount/poll cleanup cases remain; the new case covers 18 rejected
attempts, stopped polling, explicit retry and exact Running identity.

First new-test failures were fixture/assertion errors: missing required profile
in Added and an invented courseId in the single-lesson Ready navigation assertion.
Their tested sources and output remain in owned causal-sources/checks. The empty
household fixture now uses the documented array response. Product stays unchanged.

Final proof and exact commands/counts live in the enclosing Run15 report and
receipt. Historical 100% thresholds and 41-file collection remain unchanged.
Integration native setup opens localhost; the explicit Run15 no-listener boundary
leaves it BLOCKED. Full T17/live26/native/physical/release remain BLOCKED, .74 NO_GO.
