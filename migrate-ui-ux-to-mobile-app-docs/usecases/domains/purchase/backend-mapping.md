# Backend Mapping — `purchase`

> Every cell is either a real export from `src/services/api/purchase.api.js`, a real action from `src/store/purchase.store.js`, an entity sketch from `docs/erd/README.md`, or the literal sentinel `BACKEND_NOT_DESIGNED`. Cited file paths must exist on disk (verified by `check-backend-sentinel.mjs`).

**Domain ADR Pointer rule:** `—` when every cell in the row is sentinel. Otherwise must cite `decisions/NNNN-backend-purchase.md`.

---

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|
| UC-BU01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU02 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU03 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU04 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU06 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU07 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU08 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU09 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU10 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU11 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU12 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU13 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU14 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU15 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU16 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-BU17 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-SUB01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-SUB02 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-SUB03 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-SUB04 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-SUB05 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |
| UC-INV01 | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | BACKEND_NOT_DESIGNED | — |

---

## Notes

- **KD9:** UC-BU08 (Apple Pay) and UC-BU09 (Card pay) — payment provider identity NOT CONFIRMED IN SOURCE (legacy doc §4 row 6). All cells sentinel for these rows.
- `purchase.api.js` exports `createOrder`, `getOrder`, `processPayment`, `getShippingStatus`, `activateRobot` — all throw `not implemented`. These are the intended endpoint exports for UC-BU07, UC-BU10, UC-BU11, UC-BU13 but no backend contract exists yet.
- `purchase.store.js` exports only `usePurchaseStore` (Zustand store); individual actions (`startCheckout`, `confirmPayment`, `setShipping`, `reset`) are internal store methods, not top-level exports.
- DB Entity and Events columns are sentinel — no ERD entities or event bus designed for purchase domain yet.
- Domain ADR Pointer is `—` for all rows. When backend lands and payment provider is confirmed, create `decisions/NNNN-backend-purchase.md` and promote cells off sentinel.
