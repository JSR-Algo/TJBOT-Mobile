# Backend Mapping — `progress`

> Every cell is either a real export from `src/services/api/progress.api.js`, a real action from a store, an entity sketch from `docs/erd/README.md`, or the literal sentinel `BACKEND_NOT_DESIGNED`. Cited file paths must exist on disk (verified by `check-backend-sentinel.mjs`).

**Domain ADR Pointer rule:** `—` when every cell in the row is sentinel. Otherwise must cite `decisions/NNNN-backend-progress.md`.

---

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-P01 | getTodayProgress | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-P02 | getWordsPracticed | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-P03 | getLessonSummary | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-P04 | getReviewQueue | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-P05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- `progress.api.js` exports `getTodayProgress`, `getWordsPracticed`, `getLessonSummary`, `getReviewQueue` — all throw `not implemented`; no `progress.store.js` found on disk.
- UC-P05 (Celebration) is a view-only screen; no API call required.
- Events column stays sentinel until an event bus is designed.
- Domain ADR Pointer is `—` for all rows because the API exports all throw sentinel errors (no backend contract yet). When backend lands, create `decisions/NNNN-backend-progress.md` and update pointers.
