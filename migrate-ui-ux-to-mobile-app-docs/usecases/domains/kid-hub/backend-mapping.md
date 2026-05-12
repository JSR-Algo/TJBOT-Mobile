# Backend Mapping — `kid-hub`

> Every cell is either a real export from `src/services/api/home.api.js`, a real action from a `src/store/*.store.js`, an entity sketch from `docs/erd/README.md`, or the literal sentinel `BACKEND_NOT_DESIGNED`. Cited file paths must exist on disk (verified by `check-backend-sentinel.mjs`).

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-H01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-H02 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-H03 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-H04 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-H05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-H06 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-H07 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-H08 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- All cells sentinel because `src/services/api/home.api.js` exports (`getHomeHub`, `getDailyState`) throw `not implemented` and there is no `decisions/NNNN-backend-kid-hub.md` ADR yet.
- Cross-references for review (cells if backend lands):
  - UC-H01: would cite `home.api.js → getHomeHub` (Endpoint), `Child` (Entity).
  - UC-H03: would cite `home.api.js → getDailyState` (Endpoint) for the daily-available signal.
  - UC-H02 (greet animation), UC-H07 (kid settings) stay sentinel — pure UI-state surfaces with no remote call.
- Per dry-run rationale: Lane B promotes any cell off sentinel only by also creating `decisions/NNNN-backend-kid-hub.md` and updating the row's ADR pointer in the same PR (state-based check enforces).
