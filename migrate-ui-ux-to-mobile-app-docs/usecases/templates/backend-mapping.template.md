# Backend Mapping — `<domain>`

> Template for per-domain `backend-mapping.md`. Every cell is either a real `*.api.js` export, a real store action, a `docs/erd/README.md` entity-sketch entry, or the literal sentinel `BACKEND_NOT_DESIGNED`. Cited file paths must exist on disk.

**Domain ADR Pointer rule:** `—` when **every** cell in the row is sentinel. Otherwise must cite `decisions/NNNN-backend-<domain>.md` (which the lane creates in the same PR).

---

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-LL-NN | `<api.export>` \| `BACKEND_NOT_DESIGNED` | `<store.action>` \| `BACKEND_NOT_DESIGNED` | `<Entity>` (erd) \| `BACKEND_NOT_DESIGNED` | `BACKEND_NOT_DESIGNED` | `—` \| `decisions/NNNN-backend-<d>.md` |

(repeat for every UC owned by this domain)

---

## Notes

- `Endpoint` cites a file like `src/services/api/<domain>.api.js` and an export name; the export must exist (verified by `check-backend-sentinel.mjs`).
- `Service` cites `src/store/<domain>.store.js` plus an action; verified the same way.
- `DB Entity` references the "Expected entities" table in `docs/erd/README.md`.
- `Events` stays sentinel until an event bus is designed.
- The `Domain ADR Pointer` is **state-based** — the file existence is checked, not a git diff (HR-6).
