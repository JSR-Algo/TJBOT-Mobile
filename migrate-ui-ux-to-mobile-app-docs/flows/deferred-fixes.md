# Deferred Fixes — User Flow Review

**Date:** 2026-05-09
**Source review:** `docs/flows/user-flow-review.md`
**Status:** what was applied this round vs what was deferred (and why).

This is a **prototype** with no test infrastructure. The "fix all" pass applied additive, low-risk changes only. Anything requiring multi-page rewrites or backend coupling was deferred to keep the running UI stable.

---

## Applied this round

| # | Fix | Severity | Files touched | Net risk |
|---|---|---|---|---|
| 1 | Typo `progress_today → today_progress` | MED | `src/features/device/DeviceHomePage.jsx:33` | None (1 char) |
| 2 | Typo `settings → parent_settings` | MED | `src/features/home/HomeHubPage.jsx:92` | None |
| 3 | Route alias resolver for `home` | HIGH | `src/App.jsx` (PrototypeView `go`) | None — adds aliasing + warn-and-fallback |
| 4 | Real Zustand stores (5) | HIGH | `src/store/{cart,course,device,lesson,purchase}.store.js` | None — no consumer yet |
| 5 | Auth state machine | HIGH | `src/store/auth.store.js` | None — no consumer yet |
| 6 | `ErrorBoundary` + `AppErrorPage` | HIGH | `src/shared/components/ErrorBoundary.jsx` (new), `src/features/fallback/AppErrorPage.jsx` (new), `src/features/fallback/{index.js,states.js}`, `src/main.jsx` | Catches uncaught render errors; doesn't change happy path |
| 7 | Idempotency utility | MED | `src/services/http/idempotency.js` (new) | None — no consumer yet |
| 8 | `autoAdvance` schema in `states.js` | LOW | `src/features/onboarding/states.js` (4 entries) | None — metadata only |

**Verification:** `npx vite build` ✔ (518 kB, +3 kB) · `npm run i18n:check` ✔ (13/13) · `git status src/` clean (refactor branch — all src/ already untracked).

---

## Deferred — and why

### D1. Sign-out path from settings → `onb_login`

**Severity in review:** part of ISSUE 5 (leaky auth)
**Why deferred:** requires editing `src/features/parent/ParentSettingsPage.jsx` to add a logout button + `useAuthStore.logout()` call + a `go('onb_login')` transition. The settings page is large (~80 lines of inline UI) and adding a "Sign out" item correctly placed needs UI design judgment, not just a code edit.
**Cost:** 1-2 hour design + 30 min code
**Recommended owner:** product designer + frontend dev

### D2. Modal/sheet vs screen archetype tagging

**Severity:** ISSUE 8 (LOW)
**Why deferred:** requires tagging every screen in 12 `states.js` files with `archetype: 'screen'|'modal'|'sheet'|'overlay'`. ~150 entries to classify. Without React Navigation in this prototype (it's view-toggled by App.jsx), the metadata has no consumer yet.
**Cost:** 1 day audit + classification + tagging
**When to revisit:** when migrating to React Native + React Navigation

### D3. Realtime / lesson-session resume from background

**Severity:** ISSUE 7 (MED)
**Why deferred:** requires (a) WebSocket transport layer, (b) AppState listener (mobile), (c) resume-or-restart UI choice screen, (d) backend session-resume protocol. Currently 0 fetch / 0 ws calls in the codebase — there's nothing to "resume". This is product-level design, not refactor.
**Cost:** 1 sprint
**When to revisit:** alongside backend wiring

### D4. Subscription / tier guards on flow edges

**Severity:** ISSUE on SCALABILITY (HIGH)
**Why deferred:** requires (a) defining tier model server-side, (b) tier checker store, (c) `<TierGate tier="pro">` wrapper component, (d) decorating every gated edge. Currently no billing surface beyond UI screens (`cl_add_free`, `cl_locked`).
**Cost:** 1 sprint after billing backend lands
**When to revisit:** after `purchase.api.js` is wired

### D5. Parent-gate audit hook

**Severity:** ISSUE 11 (MED)
**Why deferred:** requires backend audit-log endpoint. Frontend-only fix would log to local store, which doesn't satisfy COPPA review.
**Cost:** small frontend fetch + non-trivial backend
**When to revisit:** alongside compliance review

### D6. Push notification deep link

**Severity:** missing flow #8 (HIGH for production)
**Why deferred:** requires Expo / native push wiring, Firebase / APNS config, route restorer that maps notification payload → screen ID. Out of prototype scope.
**Cost:** 2-3 days
**When to revisit:** post-React-Native migration

### D7. Force-update / version gate

**Severity:** missing flow #3 (LOW for prototype, HIGH for production)
**Why deferred:** requires server-side min-version registry + frontend version-check on app launch. No deployment surface yet.
**Cost:** 1 day
**When to revisit:** before app-store submission

### D8. Switch child profile

**Severity:** missing flow #5 (MED)
**Why deferred:** requires multi-child data model (currently `auth.store.js` has single `child`), child-switcher UI, and decisions about what "switching" means (logout + login? or in-place state swap?).
**Cost:** 1-2 days
**When to revisit:** when product confirms multi-child households are a target user

### D9. Onboarding skip / resume

**Severity:** UX risk #2 (MED)
**Why deferred:** product decision — should returning users actually skip onboarding? If yes, what determines "returning"? `localStorage.tbot_onboarded`? Server account state? Both? Not a code question.
**Cost:** small (after decision)
**When to revisit:** with returning-user analytics

### D10. Code-split bundle (>500kB warning)

**Severity:** LOW (advisory)
**Why deferred:** premature for prototype. 518 kB / 125 kB gzipped is fine for design-canvas use. Real splitting needs route-level lazy imports (`React.lazy(() => import('@/features/.../X'))`), which conflicts with the current view-toggle App.jsx pattern.
**Cost:** half day + verify dev/build still works
**When to revisit:** when moving to production hosting

### D11. Subscription expired / `cl_locked` entry path

**Severity:** missing flow #6 (MED)
**Why deferred:** `cl_locked` exists with 4 outgoing edges, but no caller currently routes INTO it from a billing-failure event (no billing event source exists). The reverse — entering `cl_locked` after a backend "tier dropped" push — needs the push infra from D6.
**Cost:** small after D6 lands
**When to revisit:** with billing backend

### D12. Robot offline degraded mode

**Severity:** missing flow #7 (MED)
**Why deferred:** `dv_pair_offline` exists (1 incoming) but represents PAIRING-time offline. Run-time offline (paired robot disconnects mid-day) needs a different state. Requires `device.store.js` `status` to drive a header banner across non-device screens. Multi-page change.
**Cost:** 1 day
**When to revisit:** with real device telemetry

---

## ADR — why we deferred

**Decision:** apply all additive low-risk fixes; defer all multi-page rewrites and backend-coupled changes.

**Drivers:**

1. **No test infrastructure** — every UI rewrite is a regression risk with no automated guardrail
2. **Read-only constraint** — user explicitly asked to preserve running UI/UX
3. **Backend doesn't exist yet** — half the recommendations need API surface that hasn't been built
4. **Prototype scope** — this is design exploration, not production code; production-grade fixes belong in the production refactor

**Alternatives considered:**

- **Full apply, defer nothing** — rejected: 30+ files of UI churn without tests = high regression risk
- **Document-only, apply nothing** — rejected: leaves known typos + crashes in shipped state
- **Hybrid (chosen)** — applied additive fixes that can't break the happy path; deferred surgical rewrites

**Consequences:**

- Plus: prototype demo path remains stable (`npx vite build` + manual smoke clean); future rewrite has clearer foundation (Zustand stores ready, auth machine modeled, idempotency util available)
- Minus: 12 deferred items remain TODOs; without ownership assigned, they will rot

**Follow-ups:**

- Each deferred item needs an owner in `docs/flows/deferred-fixes.md` (this doc) before the next sprint planning
- Run another `/omc-plan` review after backend wiring lands — many deferred items will become actionable then

---

## How to consume the new utilities

**`useAuthStore`** — `import { useAuthStore } from '@/store/auth.store'` then `useAuthStore.getState().logout()` for sign-out, `useAuthStore((s) => s.status)` to subscribe.

**`useCartStore`, `useCourseStore`, etc.** — same Zustand pattern; replace the stub `state: {...}` reads in pages when migrating from in-component state.

**`ErrorBoundary`** — already wraps `<App/>` in `main.jsx`. Any uncaught render error renders `<AppErrorPage error={...} reset={...}/>`. To trigger manually, throw inside any feature page during render.

**`useRequestId`** — `import { useRequestId } from '@/services/http/idempotency'` then `const reqId = useRequestId();` at the top of any commit-funnel screen (Checkout, UnlockConfirm, SendToRobot). Pass `reqId` as `Idempotency-Key` header when the API client lands.

**`autoAdvance` metadata** — currently informational. When a router/state-machine consumes `STATES`, it can read `state.autoAdvance` and set up the timer automatically instead of each screen managing its own.
