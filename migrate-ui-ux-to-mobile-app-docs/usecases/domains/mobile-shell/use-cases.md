# Use Cases — `mobile-shell`

> **Owning lane:** Lane D. **UC count:** 1. Added 2026-05-12 (P5) — cross-cutting domain for push deep-link, app-cold-start routing, OS bridge surfaces. Initial scope: UC-MOBILE01. Body moved from `fallback-shell/use-cases.md` (P3.F interim placement).
>
> Each H2 below corresponds to one UC ID from `reference/use-case-index.json`. Cross-domain edges: see `reference/cross-domain-edges.json`. Backend mapping: see `backend-mapping.md`. Edge cases: see `edge-cases.md`.

---

## UC-MOBILE01 — Handle Push Notification Deep Link

- **Goal:** App receives an FCM push notification with a `deep_link` payload, validates the target against the nav-graph, applies routing-policy rules (parent gate, lesson resume, purchase re-entry), and navigates the user to the right surface — or falls back gracefully.
- **Trigger:** OS delivers a push notification with payload `{deep_link: "tjbot://<route>?<params>"}` to ParentApp (foreground or cold start).
- **Preconditions:** ParentApp installed; OS push permission granted (or notification delivered via in-app channel). User is either signed-in or anonymous.
- **Main Flow:**
  1. OS hands off the payload to ParentApp via standard `Linking` / `onNotificationOpenedApp` callback.
  2. Client validates the deep_link target string against the nav-graph (per `docs/flows/shared/navigation.flow.mmd` deep-link contract).
  3. Client applies routing policy:
     - Unknown route ID → `app_error` (404).
     - `parent_*` → check `parent.store.session.idle_until > now()`. Valid → direct. Stale → route through `parent_gate` (UC-PR01) with `intendedTarget`.
     - `pr_*` → never mid-funnel; navigate to `pr_intro`.
     - `lesson_*` mid-activity → never mid-activity; navigate to `lesson_resume` (UC-F05).
     - Signed-out-friendly target (`onb_*`, `home_hub_idle`) and user anonymous → direct.
     - Auth-required target and user anonymous → `onb_login` with `nextRoute`.
     - Otherwise → `go(target)` directly.
  4. Optional server validation: `GET /v1/mobile/deep-link/validate?path=<route>` if the encoding includes signed tokens (promo codes etc.); 200 with normalized payload or 410 if expired.
- **Postconditions:** User lands on the intended screen OR a deterministic fallback (`app_error`, `onb_login`, `home_hub_idle`).
- **Alt Flow:**
  1. Cold start — deep_link captured during launch; routing applied after `App.tsx` boot resolves the splash transition.
  2. Foreground — handler navigates immediately without splash.
- **Error Flow:**
  1. `invalid_deep_link_target` → fall back to `home_hub_idle`.
  2. `parent_gate_required_redirect` → `parent_gate` with `intendedTarget`.
  3. `lesson_in_progress_redirect` → `lesson_resume`.
  4. `account_signed_out_redirect_to_login` → `onb_login` with `nextRoute`.
  5. Network failure on optional server validation → fall back to client-only routing.
- **Related:** Sequence `docs/sequences/16-mobile/push-deep-link.sequence.mmd`. Navigation contract `docs/flows/shared/navigation.flow.mmd`.
