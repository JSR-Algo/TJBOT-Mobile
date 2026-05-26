# Backend Mapping — `onboarding`

> Phase 1A. Every cell is the literal sentinel `BACKEND_NOT_DESIGNED` — the onboarding domain has no `src/services/api/onboarding.api.js` stub and no `src/store/onboarding.store.js`. Sentinel state is enforced by `check-backend-sentinel.mjs`. Domain ADR Pointer is `—` for all rows (state-based rule: `—` required when every cell in the row is sentinel).

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-O01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-O02 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-O03 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-O04 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-O05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- All cells are sentinel because the onboarding domain has no API file or store actions in the prototype.
- UC-O03 mic permission grant is an OS-level side effect (`OS_PERMISSION_GRANTED`) with no backend involvement. Until an event bus is designed, Events stays sentinel.
- UC-O04 cross-domain handoff (`go('lesson_ready')`) is a client-side navigation call with no backend call at the onboarding layer; lesson-session backend mapping owns that side.
- When backend lands: UC-O03 would cite a permission-status endpoint (TBD) and UC-O04 would cite a session-init endpoint (owned by lesson-session domain, not here).
