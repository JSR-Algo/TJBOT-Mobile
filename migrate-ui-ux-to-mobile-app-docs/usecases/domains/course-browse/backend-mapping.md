# Backend Mapping — `course-browse`

> Every cell is either a real export from `src/services/api/course.api.js`, a real action from `src/store/course.store.js`, an entity sketch from `docs/erd/README.md`, or the literal sentinel `BACKEND_NOT_DESIGNED`. Cited file paths must exist on disk (verified by `check-backend-sentinel.mjs`).

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-C01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-C02 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-C03 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-C04 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-C05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-C06 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-C07 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-C08 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- All cells sentinel because `src/services/api/course.api.js` exports (`getCourse`, `getLevel`, `getUnit`, `getLessonDetail`, `getLessonList`, `getReviewQueue`, `getDailyMission`) all throw `not implemented` and there is no `decisions/NNNN-backend-course-browse.md` ADR yet.
- Cross-references for review (cells if backend lands):
  - UC-C01: would cite `course.api.js → getCourse` (Endpoint), `course.store.js → setCourse` (Service), `Course` (Entity).
  - UC-C02: would cite `course.api.js → getLevel` (Endpoint), `course.store.js → setLevel` (Service), `Level` (Entity).
  - UC-C03: would cite `course.api.js → getUnit` (Endpoint), `course.store.js → setUnit` (Service), `Unit` (Entity).
  - UC-C04: would cite `course.api.js → getLessonList` (Endpoint), `Lesson` (Entity).
  - UC-C05: would cite `course.api.js → getLessonDetail` (Endpoint), `Lesson` (Entity).
  - UC-C07: would cite `course.api.js → getReviewQueue` (Endpoint).
  - UC-C08: would cite `course.api.js → getDailyMission` (Endpoint).
- KD11: course locks are CLIENT-SIDE only — server-side enforcement is NOT CONFIRMED, so even when endpoints land, the lock-gate is a UX contract, not a security boundary.
- Per dry-run rationale: Lane B promotes any cell off sentinel only by also creating `decisions/NNNN-backend-course-browse.md` and updating the row's ADR pointer in the same PR (state-based check enforces).
