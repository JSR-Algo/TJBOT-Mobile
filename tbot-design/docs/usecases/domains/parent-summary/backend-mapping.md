# Backend Mapping — `parent-summary`

> Every cell is either a real export from `src/services/api/parent.api.js`, a real store action, an entity sketch from `docs/erd/README.md`, or the literal sentinel `BACKEND_NOT_DESIGNED`. Cited file paths must exist on disk (verified by `check-backend-sentinel.mjs`).

**Domain ADR Pointer rule:** `—` when every cell in the row is sentinel. Otherwise must cite `decisions/NNNN-backend-parent-summary.md`.

---

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-PR02 | getParentSummary | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-PR03 | getParentToday | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-PR04 | getParentHistory | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-PR05 | getSafetyConfig | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-PR06 | getSettings | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-PR07 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- `parent.api.js` exports `getParentSummary`, `getParentToday`, `getParentHistory`, `getSafetyConfig`, `updateSafetyConfig`, `getSettings`, `updateSettings` — all throw `not implemented`. No `parent.store.js` found on disk.
- UC-PR05 also calls `updateSafetyConfig` on mutation path; primary fetch export cited in table.
- UC-PR07 (Help & FAQ) is static content; no API endpoint required.
- Events column stays sentinel until an event bus is designed.
- Domain ADR Pointer is `—` for all rows; when backend lands, create `decisions/NNNN-backend-parent-summary.md`.
