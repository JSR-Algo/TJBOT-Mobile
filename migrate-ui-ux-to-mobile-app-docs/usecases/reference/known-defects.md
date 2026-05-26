# Known Defects & Carry-Forward — Use Case Model

> Source-of-truth for defects inherited from `docs/architecture/use-case-diagram.md` and surfaced during the use-case-model restructure. Mirrors §4 of the legacy doc verbatim (§ B below).
>
> Carry-forward actions live in `reference/backlog.md` with concrete owner + target sprint slots.

---

## A. Restructure-Surfaced Defects (KD1–KD14)

| # | Defect | Carry-forward |
|---|--------|---------------|
| **KD1** | UC-A06 (`Reset Password`) marked `<<UNDEFINED>>` in `auth.usecase.puml` — button only, target `onb_login`, no API call. | Concrete entry in `reference/backlog.md` (owner=Lane A, target=next sprint, action=decide retire-vs-implement). Index status: `button-only`. |
| **KD2** | UC-A09 (`Token Refresh`) — store actions exist but no UI/timer trigger observed. | Same as KD1; index status: `undefined`. |
| **KD3** | UC-A10 (`Logout`) — store action exists, no UI button found. | Same as KD1; index status: `undefined`. |
| **KD4** | Child vs Parent actor distinction is a numeric speed-bump, not RBAC. | Documented in `actors/parent.md` as "scope-marker, not security boundary." |
| **KD5** | DEVICE MANAGEMENT (UC-DM01–DM06) absent from puml axis. | **Resolved 2026-05-11 by Lane D Phase 1:** `docs/usecases/domains/device-mgmt/diagrams/device-mgmt.usecase.puml` created (per ADR-0005 D4 amendment §2: KD5 net-new puml lives in new corpus only — no archive copy under `docs/architecture/usecases/`). 6 `alias-overrides.json` entries promoted from `no-puml` → `manual: UC_DM_HOME / SESSION / FIND / FIRMWARE / LCD_LIB / LCD_TURN`. Current no-puml count = 1 (UC-C06 legacy-only). |
| **KD6** | UC-DM05/06 (LCD face library, lesson turn) ambiguity between device-mgmt vs robot-mgmt. | Keep in device-mgmt; cross-ref note in `robot-mgmt/use-cases.md`. |
| **KD7** | 11 actors include speed-bump-distinguished Child/Parent. | Keep both; document gating semantics in `actors/`. |
| **KD8** | Pairing radio (BLE vs Wi-Fi probe) NOT CONFIRMED IN SOURCE. | UC-DP04 backend cell → `BACKEND_NOT_DESIGNED`. |
| **KD9** | Payment provider identity (Stripe? Adyen?) NOT CONFIRMED. | UC-BU08/09 backend cells → `BACKEND_NOT_DESIGNED`. |
| **KD10** | Realtime voice provider NOT CONFIRMED (`openRealtime` is a stub). | UC-L02 backend cell → `BACKEND_NOT_DESIGNED`. |
| **KD11** | Course-lock client-side only (`l.state === 'locked'`); no server enforcement. | `course-library/edge-cases.md` `unauthorized` rationale: "client-side gate only — server enforcement deferred." |
| **KD12** | Two parallel UC ID schemas exist (`UC-LL-NN` vs `UC_<PREFIX>_<VERB>`). | Resolved by D2: legacy IDs canonical, puml IDs as `aliases: []`. |
| **KD13** | UC-A06 button-only — could be demoted to "affordance" rather than UC. | Decision NOW: **keep as UC** with `status: button-only`. Backlog entry proposes demotion to "affordance" (owner=Lane A, target=next sprint). Resolution recorded in ADR-0005 §Follow-up. |
| **KD14** | 14 unresolved assumptions in legacy §4 Assumptions Check table. | Mirrored verbatim in §B below. |

---

## B. Verbatim Mirror of Legacy `use-case-diagram.md` §4 — Assumptions Check

| Item | Status |
|---|---|
| `Child` vs `Parent` actor distinction | INFERRED from UI gating screens (`parent_gate`, `cl_unlock_confirm`). NO ROLE FIELD in code; gates are speed-bumps, not RBAC. |
| Auth API contracts (`login`, `logout`, etc.) | Stubs only in `src/services/api/auth.api.js` — request/response shapes NOT CONFIRMED IN SOURCE CODE. |
| Token refresh trigger | Auth store has actions but **no UI/timer trigger** observed → UC-A09 marked but actor link weak. |
| Logout UI affordance | `logout()` action exists in store but **no button** found in any screen → UC-A10 listed for completeness. |
| Pairing radio (BLE vs Wi-Fi probe) | UI shows "within 3 meters" + radio animation. Underlying transport NOT CONFIRMED IN SOURCE CODE. |
| Payment provider identity (Stripe? Adyen?) | NOT CONFIRMED IN SOURCE CODE — only `processPayment()` stub. |
| Realtime voice provider | NOT CONFIRMED IN SOURCE CODE — `openRealtime()` stub in `src/services/websocket/realtime.js`. |
| Course-lock enforcement | Client-side only (`l.state === 'locked'`). Server-side enforcement NOT CONFIRMED IN SOURCE CODE. |
| Idempotency-Key usage | Confirmed in `src/services/http/idempotency.js`; specific endpoints attached at NOT CONFIRMED IN SOURCE CODE. |
| Reset Password (UC-A06) | Button only — button target is `onb_login`, no API call. → UNKNOWN USE CASE (label only). |
| Parent gate as RBAC | NOT a real auth boundary — speed bump only. Treat as parent-mode toggle, not security control. |
| Push / notifications, analytics, CSAT | NOT CONFIRMED IN SOURCE CODE. |
| Multi-child accounts / family sharing | NOT CONFIRMED IN SOURCE CODE. |
| Account deletion / data export (COPPA-relevant) | NOT CONFIRMED IN SOURCE CODE. |

---

## C. Resolution Pointers

- **Backlog (concrete actions):** `reference/backlog.md`
- **ADR follow-up section:** `ADR-0005-usecase-model-structure.md` §Follow-up
- **Aliasing decisions:** `reference/alias-overrides.json`
