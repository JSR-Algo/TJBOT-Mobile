# Backend Mapping — `course-library`

> Every cell is `BACKEND_NOT_DESIGNED` (D3 sentinel). The prototype's `course-library.api.js` exports throw `not implemented`; no `decisions/NNNN-backend-course-library.md` ADR exists yet. Domain ADR Pointer is `—` per HR-6 state-based rule.
>
> UC-CL04 is the PIN-free course assignment confirmation, aliased as `UC_CL_CONFIRM_ADD`; it has no parent-gate dependency.

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-CL01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-CL02 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-CL03 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-CL04 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-CL05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-CL06 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-CL07 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-CL08 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-CL09 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-CL10 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-CL11 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-CL12 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- Cells stay sentinel because (a) `course-library.api.js` exports throw `not implemented` (`listLibrary`, `getCourseDetail`, `purchaseCourse`, `unlockCourse`, `sendCourseToRobot`, `getRobotSyncStatus`), and (b) no domain ADR exists.
- Once a `decisions/NNNN-backend-course-library.md` ADR is created, candidate cell promotions:
  - UC-CL01 (Browse): `course-library.api.js → listLibrary` (Endpoint), references `Course` (Entity).
  - UC-CL02 (Detail): `course-library.api.js → getCourseDetail` (Endpoint).
  - UC-CL03 (Buy): `course-library.api.js → purchaseCourse` (Endpoint); cross-references purchase domain UC-BU07/08/09 for the actual payment provider call.
  - UC-CL04 (Confirm Add to Robot): `course-library.api.ts → enrollCourse` (Endpoint) for enrollment and assignment creation.
  - UC-CL06 (Send Lesson): `course-library.api.js → sendCourseToRobot` (Endpoint); emits `robot.lesson.queued` event.
  - UC-CL11 (Resync): `course-library.api.js → getRobotSyncStatus` (Endpoint).

## T17 assignment reconciliation (2026-09-14)

The prototype sentinel table above is historical; the existing lesson assignment
consumer uses `course-library.api.ts`. Running and Companion reconcile an absent
active assignment with `getAssignmentReadback`, a GET to
`/v1/devices/:deviceUUID/assignment/current?includeTerminal=true` through the shared
HTTP client. The existing default `getCurrentAssignment` remains active-only.
The shared OpenAPI documents this opt-in query; no endpoint or wire schema is added.

The canonical envelope is `{ data: { assignment } }`. A terminal contains only
`assignmentId`, positive integer `assignmentVersion`, and `state` (COMPLETED,
FAILED, or CANCELLED). Only the selected ID/version can establish that outcome.
Absence, replacement, malformed response, and read errors retain the checkpoint
and reach existing retry UI after 18 unresolved reads at 2500 ms intervals.
A newer record can hide the selected terminal; that remains unresolved.

Ready requires matching route/current child and assignment identity, current and
preload READY, matching preload assignment/profile, and a current checksum matching
any route checksum. A missing legacy version can be learned from matching active
identity. Missing ID/child cannot authorize handoff. Verified assignmentVersion
travels through Ready -> Running -> Companion and LessonResume -> Running.
Existing observer wire semantics and checkpoint schema remain unchanged.

See [scoped QA evidence](../../../qa/2026-09-14-t17-assignment-reconciliation.md).

## T17 mounted lifecycle refresh (run04)

CourseDetail and SendToRobot re-read `getCourses` and `getCourseLessons` on active
focus/foreground. CourseDetail retains newly fetched metadata when lessons fail,
with explicit error/retry instead of the previous list. Send preserves a valid
exact lesson/version/profile choice; missing courses or pinned versions require
reselection. An unpinned new send uses the current eligible public version.

Ready refreshes `getPreloadStatus` and `getCurrentAssignment` and pauses polling
while inactive. Matching RUNNING uses the same selected child/ID/version, preload
profile and current checksum guards as handoff, then opens RunningScreen.
No activation call, terminal inference or checkpoint clear is introduced.
Send and CourseDetail fence preflight, create/enroll, cancellation and conflict
readback callbacks. Conflict recovery also matches the public lesson profile.
No new API or retained preparation contract is consumed.

See [lifecycle QA scope](../../../qa/2026-09-14-t17-lifecycle-refresh.md).
