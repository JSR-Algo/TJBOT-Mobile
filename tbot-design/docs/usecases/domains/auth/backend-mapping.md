# Backend Mapping — `auth`

> Phase 0.5 dry-run sample. Every cell is either a real export from `src/services/api/auth.api.js`, a real action from `src/store/auth.store.js`, an entity sketch from `docs/erd/README.md`, or the literal sentinel `BACKEND_NOT_DESIGNED`. Cited file paths must exist on disk (verified by `check-backend-sentinel.mjs`).

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-A01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-A02 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-A03 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-A04 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-A05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-A06 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-A07 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-A08 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-A09 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-A10 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- All cells are sentinel because the prototype's `auth.api.js` exports throw `not implemented` (verified) and there is no `decisions/NNNN-backend-auth.md` ADR yet.
- Cross-references for review (these would be the cells if backend lands):
  - UC-A03: would cite `auth.api.js → login` (Endpoint), `auth.store.js → loginSuccess` (Service), `User` (Entity, per `docs/erd/README.md`).
  - UC-A08: would cite `auth.api.js → saveChildProfile` (Endpoint), `auth.store.js → setChild` (Service), `Child` (Entity).
  - UC-A09: would cite `auth.store.js → refreshSuccess` (Service); refresh endpoint TBD.
  - UC-A10: would cite `auth.api.js → logout` (Endpoint), `auth.store.js → logout` (Service).
- KD1/KD2/KD3 (UC-A06/A09/A10 `<<UNDEFINED>>`) keep these cells sentinel until the `BACKLOG-UC-A06`/`UC-A09`/`UC-A10` decisions land.

> **Rationale for full sentinel state:** the dry-run intent is to prove the structure works under the worst case (every cell is sentinel, every Domain ADR Pointer is `—`). When Lane A promotes any cell off sentinel during Phase 1, they must create `decisions/NNNN-backend-auth.md` and update the corresponding row's ADR pointer in the same PR (state-based check enforces).
