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
