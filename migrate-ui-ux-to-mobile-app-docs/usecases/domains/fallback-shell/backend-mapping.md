# Backend Mapping — `fallback-shell`

> Every cell is `BACKEND_NOT_DESIGNED` (D3 sentinel). No `fallback.api.js` or `fallback.store.js` exists; no `decisions/NNNN-backend-fallback.md` ADR exists yet. Domain ADR Pointer is `—` per HR-6 state-based rule.
>
> Fallback-shell screens are intentionally backend-light: the failure conditions they surface come from network / mic / voice transports owned by other domains (lesson-session UC-L02/L04/L05 for voice, OS-level audio permission for UC-F03). This domain primarily renders + routes.

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-F01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-F02 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-F03 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-F04 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-F05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-F06 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-F07 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-F08 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- Cells stay sentinel because there is no `fallback.api.js` (the surfaces are pure-render error walls), and no domain ADR exists.
- These screens consume failure signals from cross-domain transports rather than calling their own endpoints:
  - UC-F01 (Network Error): network-transport health detection lives outside this domain.
  - UC-F02 / UC-F03 (Mic Missing / Audio Recovery): OS-level mic permission is detected at the lesson-session layer; UC-F03 is OS-instructional only.
  - UC-F04 (Voice Failed) / UC-F06 (Reconnecting Overlay): voice-service health (KD10 — provider NOT CONFIRMED) is owned by lesson-session.
  - UC-F07 (Safety Redirect): safety-filter trigger is owned by lesson-session safety logic; this UC is the "soft pause" surface.
  - UC-F08 (Generic App Error): top-level `ErrorBoundary` is the trigger; no app-level error reporting endpoint is in source.
- If a `decisions/NNNN-backend-fallback.md` ADR ever lands, the most likely promotion is an Events column entry for UC-F08 emitting `app.error.reported` to a telemetry sink.
