# Backend Mapping — `parent-gate`

> Every cell is either a real export from an `*.api.js` file, a real store action, an entity sketch from `docs/erd/README.md`, or the literal sentinel `BACKEND_NOT_DESIGNED`. Cited file paths must exist on disk (verified by `check-backend-sentinel.mjs`).

**Domain ADR Pointer rule:** `—` when every cell in the row is sentinel. Otherwise must cite `decisions/NNNN-backend-parent-gate.md`.

---

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-PR01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- Parent-gate is a client-side speed-bump only (KD4). The 3-digit random number match occurs entirely in `ParentGatePage` — no API call, no store mutation, no server round-trip. All cells are sentinel by design.
- If a server-side gate is ever added, create `decisions/NNNN-backend-parent-gate.md` and update the Domain ADR Pointer.
