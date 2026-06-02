# Backend Mapping — `mobile-shell`

> Every cell is either a real export from `src/services/api/*.api.ts`, a real action from a store, a `docs/erd/README.md` entity-sketch entry, or the literal sentinel `BACKEND_NOT_DESIGNED`. Cited file paths must exist on disk (verified by `check-backend-sentinel.mjs`).

**Domain ADR Pointer rule:** `—` when every cell in the row is sentinel. Otherwise must cite `decisions/NNNN-backend-mobile-shell.md`.

---

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-MOBILE01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- UC-MOBILE01 deep-link routing is primarily client-side. The optional server validation endpoint (`GET /v1/mobile/deep-link/validate?path=<route>`) is not yet wired; sequence `docs/sequences/16-mobile/push-deep-link.sequence.mmd` documents the intended contract.
- FCM delivery itself is owned by `sys-10-notifications` (sequence `10-notifications/sqs-worker-pipeline.sequence.mmd`); this domain is the consumer side.
- When backend lands: Endpoint will cite `mobile.api.ts → validateDeepLink`; Domain ADR Pointer must reference a new `decisions/NNNN-backend-mobile-shell.md`.
