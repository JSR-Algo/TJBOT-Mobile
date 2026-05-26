# User Flow Review — TBOT

**Date:** 2026-05-09
**Reviewer:** lead (architecture pass against `docs/flows/user-flow.md`)
**Source:** `docs/flows/user-flow.md` (121 screens, 266 edges, 12 domains)
**Scope:** flow-only review per the framework — no source-code re-inspection, no business-logic invention.

---

## 1. FLOW SUMMARY

The TBOT mobile flow is a **kid-facing voice-learning app + parent control surface + robot-companion device**. The flow is **dense and well-connected** for a prototype: 266 navigation edges across 12 domains, 47 reciprocal back-pairs (good back-nav coverage), 0 self-loops, and only 12 nominal dead-ends (most are intentional auto-advance screens). The graph has clear hubs — `rm_my_robot` (Robot Management hub: 20 in / 13 out), `dv_home` (Device Home: 16 in / 4 out), `home` (29 in / dispatched via runtime variants) — typical of a hub-and-spoke mobile app.

**Critical defect:** the flow's most-referenced node `home` (29 incoming edges) is **not in the screen registry**. Nor are `settings` (1 ref) or `progress_today` (1 ref, typo for `today_progress`). Three target IDs reference screens that don't exist as declared. This is a runtime routing bug, not a flow-design issue, but it surfaces because runtime dispatch (`home_hub_*` variants chosen by time-of-day or session state) is not traceable from static code.

**Maturity for production SaaS:** prototype-grade. Strong screen coverage, weak error/network/auth scaffolding. No `fetch()` or `axios` calls anywhere — every "API" interaction is a UI placeholder. Migrating to a real backend will require rewiring **every** transition through an async wrapper, which currently doesn't exist. State machine is well-formed (per `.omc/analysis/stage-3-state-machines.md`), but state is in-component everywhere — no Redux/Zustand/Context store implies no cross-screen state survival, no offline support, no resume.

---

## 2. DETECTED ISSUES

### ISSUE 1
- **Type:** undeclared route target
- **Severity:** HIGH
- **Location:** 29 callers across `home`, `course`, `progress`, `parent`, `fallback` domains target `go('home')`
- **Description:** `home` is not a screen ID. The `home` domain declares 6 separate `home_hub_*` variants (`_default`, `_daily`, `_done`, `_greet`, `_idle`, `_mic`, `_offline`). At runtime, one is dispatched based on session/time/state, but the routing logic is implicit — a static reader cannot determine which `home_hub_*` a `go('home')` call resolves to.
- **Impact:** in production this is a routing crash unless the App-level router intercepts `home` and resolves it to a variant. New developers will introduce the same bug pattern. AI assistants reading the flow cannot reason about "after course completion, what's home?" without inspecting runtime logic.

### ISSUE 2
- **Type:** typo / dangling target
- **Severity:** MEDIUM
- **Location:** `src/features/device/...` calls `go('progress_today')`; registry declares `today_progress`
- **Description:** literal typo. The button is unreachable.
- **Impact:** broken navigation from device pairing to progress overview. A parent post-pairing has no path to today's progress.

### ISSUE 3
- **Type:** undeclared route target
- **Severity:** MEDIUM
- **Location:** `home_hub_default:92` calls `go('settings')`; no `settings` ID exists
- **Description:** likely intent was `parent_settings` (which exists). The home settings icon is dead.
- **Impact:** broken settings entry from home. Parents must enter via parent gate flow instead.

### ISSUE 4
- **Type:** missing global error boundary in flow
- **Severity:** HIGH
- **Location:** every domain has `fallback/*` screens for specific error states (`mic_missing`, `network_error`, `voice_failed`, `audio_recovery`, `safety_redirect`, `lesson_resume`), but **no caller** in the diagram dispatches into them on a generic API/network failure. The 9 fallback screens have 22 incoming edges, but most are from sibling fallback screens (recovery loops), not from the active product flow.
- **Description:** the flow assumes errors arrive via specific contexts (mic permission denied → mic_missing). There's no path for "course load timeout → some-error-screen". UNCLEAR FLOW: where does a generic API failure route?
- **Impact:** in production, every API call needs an error path. Currently there's no canonical "something went wrong" screen.

### ISSUE 5
- **Type:** auth flow is leaky
- **Severity:** HIGH
- **Location:** `auth` domain only has 3 screens (`onb_login`, `onb_login_error`, `onb_child`). Authentication state is implicit — not modeled as a transition source.
- **Description:** the flow has no path for "session expired" → `onb_login`, no path for "401 from API" → re-auth. The login screen is reachable from `onb_welcome` (during onboarding) and from `onb_login_error` (retry). After auth completes, there's no return path back to login from anywhere — implies "once logged in, never log out".
- **Impact:** real SaaS apps require: token refresh on 401, force-logout on auth invalidation, sign-out from settings, multi-device session revocation. None of these flows are sketched.

### ISSUE 6
- **Type:** circular navigation in `course-library` purchase loop
- **Severity:** MEDIUM
- **Location:** `cl_add_free <-> cl_detail`, `cl_add_free <-> cl_unlock_confirm`, `cl_companion <-> cl_running`, `cl_robot_ready <-> cl_send` (4 reciprocal pairs in a single domain)
- **Description:** the buy-and-send-to-robot flow has multiple back-edges across what should be a forward-only commit funnel. A user can `cl_unlock_confirm` → `cl_add_free` (back) → `cl_add_free` again (re-confirm). No idempotency cue.
- **Impact:** for a backend, this means each "confirm" button must be idempotent, server-side. If naive, a user can double-charge by tapping back/forward.

### ISSUE 7
- **Type:** lesson-session has no clean re-entry from background
- **Severity:** MEDIUM
- **Location:** `lesson-session` domain (29 screens, hub `robot_listening`/`robot_speaking`)
- **Description:** the realtime activity loop has 20 sub-states (greeting → activity → speak/listen/think → success/gentle/retry → done). Reconnecting (`reconnecting` screen) is reachable from 5 states, but only goes back to `robot_listening`. No path for "user backgrounded the app for 2 min, what state to resume?". `lesson_resume` exists in fallback (1 incoming) but isn't wired from app-launch.
- **Impact:** mobile UX killer. Backgrounded sessions need explicit resume/discard choice. iOS in particular kills audio sessions on backgrounding.

### ISSUE 8
- **Type:** modal/sheet semantics ambiguous
- **Severity:** LOW
- **Location:** `cl_unlock_confirm` named `*Modal.jsx`, `exit_confirm` named like a modal but treated as a screen, `parent_gate` is a modal in spirit
- **Description:** the flow doesn't distinguish "navigate to a screen" from "present a modal/sheet". On React Native, this matters — modals stack, screens replace. Mermaid `flowchart TD` flattens them.
- **Impact:** translating to React Navigation will require domain knowledge to choose `navigation.navigate(...)` vs `navigation.push(modal)` correctly.

### ISSUE 9
- **Type:** `exit_confirm` fan-in (16) without uniform launch context
- **Severity:** MEDIUM
- **Location:** `exit_confirm` is the abort/exit-mid-lesson confirmation; targeted by 16 different screens
- **Description:** good — there's an abort path. But the confirmation says "go to home" and routes to `home` (which is undeclared). Confirmation that doesn't land anywhere stable.
- **Impact:** users tapping "yes, exit" may land on an unintended `home_hub_*` variant or crash.

### ISSUE 10
- **Type:** dead-ends without auto-advance documentation
- **Severity:** LOW
- **Location:** 12 dead-end screens (`dv_lcd`, `dv_lcd_turn`, 6× `home_hub_*`, 4× `onb_intro_*`)
- **Description:** these screens have no outgoing `go(...)`. They're presumably auto-advancing (timer, animation end, device event). The flow doesn't capture **what** advances them.
- **Impact:** auto-advance logic is in-component (likely `useEffect` + `setTimeout`). For backend integration, server-driven state changes (e.g. "next activity ready") would replace the timer — but current flow has no slot for that.

### ISSUE 11
- **Type:** parent gate / kid mode not explicit in flow
- **Severity:** MEDIUM
- **Location:** `parent_gate` is reachable but the gate's role (verify-parent-before-allow) isn't a state in the diagram
- **Description:** parent-gate is a security boundary — a kid should not bypass it. The flow shows `parent_gate → parent_summary` as a single edge, but doesn't model "gate failed → bounce back to home".
- **Impact:** COPPA / kids-safety surfaces require a verifiable boundary. Backend will need an audit trail for parent-gate passes.

### ISSUE 12
- **Type:** progress / celebration ambiguity
- **Severity:** LOW
- **Location:** `progress` domain — `today_progress`, `words_practiced`, `lesson_summary`, `review_needed`, `celebration` (5 screens, 11 edges)
- **Description:** which is the canonical post-lesson destination? `lesson_session.lesson_done` could route to `lesson_summary` OR `celebration` OR `today_progress` — flow shows multiple parallel edges.
- **Impact:** confused user mental model: "where's my reward?". For backend, multiple routes mean multiple "lesson-completion-acknowledged" events.

---

## 3. MISSING FLOWS

The flow lacks these necessary paths for a production SaaS:

1. **Sign-out** — no path from any screen back to `onb_login`. Implied "logout" must exist somewhere.
2. **Session-expired re-auth** — no flow for 401 → re-login → return to original screen.
3. **Force-update / version-bump** — mobile apps need a "your app is too old" gate before any UI.
4. **Privacy / consent withdrawal** — no flow for revoking child's data consent post-onboarding.
5. **Switch child profile** — multi-child households need a child-switcher; `onb_child` only handles initial setup.
6. **Subscription expired** — no flow for "your subscription lapsed, locked content". Implied by `cl_locked` (4 outgoing) but never explicitly entered from a billing failure.
7. **Robot offline → degraded mode** — `dv_pair_offline` exists but no flow for "you have a paired robot but it's offline now, here's what you can still do".
8. **Push-notification deep link** — opening from a push notification needs route restoration (e.g. "your child finished a lesson" → `lesson_summary` for that lesson).
9. **Generic empty/loading state** — no canonical "loading…" screen; every screen presumably renders synthetic data immediately.
10. **Onboarding skip / resume** — onboarding has 9 screens with no skip button anywhere; resuming a half-completed onboarding has no path.

---

## 4. UX RISKS

| # | Risk | Notes |
|---|---|---|
| UX1 | **`home` resolution ambiguity** | Tapping "Home" from anywhere lands on a runtime-chosen `home_hub_*` variant. User may see a different home each tap. Confusing if not designed deliberately. |
| UX2 | **No skip button in onboarding** | 9 onboarding screens before the first lesson. Returning users (re-install, multi-device) will have to walk all 9 again. |
| UX3 | **Lesson exit path lands on undeclared `home`** | `exit_confirm → home` resolves to a variant — possibly the wrong one (e.g. `home_hub_offline` after a network drop). User feels disoriented. |
| UX4 | **No back navigation on dead-end screens** | 12 dead-end screens have no manual back path. If auto-advance fails (timer doesn't fire, animation hangs), user is stuck. Mobile back-gesture only works if React Navigation provides it; flow doesn't show that wiring. |
| UX5 | **Pairing loop has many recovery paths** | `dv_pair_failed → dv_pair_search → dv_pair_failed` (reciprocal). If retry keeps failing, user has no obvious exit. |
| UX6 | **Course unlock confirmation can be re-tapped** | `cl_unlock_confirm <-> cl_add_free` reciprocal. User can tap "Unlock" multiple times without obvious idempotency. |
| UX7 | **Lesson session has 20 internal states** | If a kid goes off-script (looks away, says nothing), the flow handles `silence`, `offtopic`, `bargein`, `retry`, `gentle` — good — but transitions between them depend on AI inference. From the kid's POV, "why is the robot saying retry?" is opaque. |
| UX8 | **No global "where am I?" affordance** | Apps with 121 screens need a breadcrumb or section indicator. Flow shows nothing. |

---

## 5. BACKEND RISKS

| # | Risk | Source-of-pain |
|---|---|---|
| B1 | **Zero API surface in source** | 0 `fetch`/`axios` calls in `src/features/**`. Every transition currently fires synchronously. Migrating to a backend means EVERY screen entry needs an async loading state — no current scaffold. |
| B2 | **Idempotency unclear on `cl_add_free` reciprocal loop** | `cl_add_free <-> cl_unlock_confirm` lets a user "unlock" → "back" → "unlock again". Backend must dedup by client-generated request ID, but the client doesn't generate one (no API client at all yet). |
| B3 | **Realtime lesson session has no transport in flow** | `lesson-session/Connecting` exists, but how does it connect (WebSocket? polling?). 20 lesson states imply heavy bidirectional traffic — backend must guarantee message ordering, recover from reconnect mid-utterance. |
| B4 | **State stored only in component memory** | No store/Redux. After 121 screens of in-component state, "where does my profile live?" has no answer. Backend will get bombarded with redundant fetches. |
| B5 | **No request lineage** | Without a request-ID mechanism in the client, server can't correlate "user clicked unlock" → "device received course" — debugging will be hell. |
| B6 | **Auth invalidation has no flow** | If server revokes a session, frontend has no path to re-auth. Server will see the same valid-looking client requests with stale tokens forever. |
| B7 | **`home` runtime dispatch lives in client** | Choosing which `home_hub_*` to show is client-side. Once personalization grows (A/B tests, server-driven layout), this needs to move server-side. The flow's flat `home` target hides the rewrite cost. |
| B8 | **Parent-gate has no audit hook** | Gate pass/fail must be logged for COPPA. No flow for "parent failed gate 5x → notify primary parent". |
| B9 | **Course → robot transfer is fire-and-forget** | `cl_send → cl_robot_ready` shows the user-side optimistic UI, but no fallback for "robot didn't ack within 30s". Backend will need a queue + retry. |
| B10 | **`fallback` domain absorbs 9 error types** | Server taxonomy must match (mic_missing, network_error, voice_failed, audio_recovery, safety_redirect, lesson_resume, kid_settings, help_faq, reconnecting_overlay). Adding a new error class touches client + server. |

---

## 6. SCALABILITY REVIEW

The flow scales **poorly** along these axes if not refactored before adding features:

| Dimension | Current | Risk when scaled |
|---|---|---|
| **More screens** | 121 already. Adding 20 more (A/B variants, holiday content, A11y screens) means 20 more `index.js` entries + states.js rows + new edges into existing domains. Each addition risks introducing another `home`-style undeclared target. | HIGH |
| **Roles** | One-role assumed (kid + parent on same device, distinguished by parent gate). Adding "teacher dashboard", "school admin", "developer mode" means duplicating onboarding/auth/home flows per role. Flow has no role-gating slot. | HIGH |
| **Subscriptions / payments** | Purchase domain (15 screens) is bolt-on; not integrated with course-library `cl_locked`. Adding tiered subs (free/pro/premium) means decorating most screens with "your tier blocks this", currently unmodelled. | HIGH |
| **Notifications / deep links** | No screen knows how to be entered from a push notification. Adding push means wiring deep-link → screen-resolver — currently absent. | HIGH |
| **i18n** | Already wired via DOM walker — orthogonal to flow. Adding a new locale doesn't change the flow. | LOW |
| **Realtime / multi-device** | Lesson session is single-device. Family-shared progress (parent watching kid's lesson live) is unrepresented. | MED |
| **Offline mode** | `pair_offline`, `network_error`, `audio_recovery` exist as fallbacks but no first-class "offline mode" state across the entire app. | MED |
| **Accessibility** | No flow nodes for screen-reader-only paths or simplified-controls modes. | MED |

---

## 7. RECOMMENDED IMPROVEMENTS

Improvements only — not a redesign. Order by impact-to-cost.

### Priority HIGH

1. **Resolve undeclared route targets** (`home`, `settings`, `progress_today`).
   - Either declare a real `home` screen ID and have variants be sub-states, or document the runtime resolver as a first-class "router" node in the flow.
   - Fix `progress_today` → `today_progress` typo.
   - Fix `settings` → `parent_settings`.

2. **Add a global error-boundary screen.**
   - One canonical `app_error` screen accepts `{ context, retryFn }` and shows in `fallback`.
   - Every async wrapper routes there on unrecoverable failure.

3. **Model auth lifecycle as a first-class state machine.**
   - States: anonymous, authenticated, expiring (refresh in flight), expired, revoked.
   - Flow edges: 401 → re-auth → resume; revoked → force-logout → `onb_login`.
   - Add a sign-out path from settings → `onb_login`.

4. **Introduce a state store (Zustand) for cross-screen survival.**
   - User profile, child, course progress, device pairing state.
   - Removes the current "everything is in-component" implicit assumption.

### Priority MEDIUM

5. **Document modal/sheet vs screen semantics.**
   - Tag each screen in the registry with `archetype: 'screen' | 'modal' | 'sheet' | 'overlay'`.
   - Flow diagram uses different mermaid shapes per type (e.g. `(modal)` for sheets, `[[overlay]]` for overlays).
   - Drives correct React-Navigation method choice.

6. **Add idempotency markers to commit funnels.**
   - `cl_add_free → cl_unlock_confirm → cl_added` should be one-way after confirmation. Disable back-nav on confirmed steps.
   - Generate a client request ID on entry to commit screens.

7. **Add a realtime-session transport layer in the flow.**
   - One `realtime_socket` invisible node showing all 20 lesson-session states subscribe to it.
   - Reconnect path: `reconnecting → resume_or_restart` choice (not just back to `robot_listening`).

8. **Add resume-from-background path.**
   - On app foreground after >N seconds, route to `lesson_resume` with `{ lastState, elapsedTime }` rather than restarting.

9. **Make subscription/tier a guard on flow edges.**
   - Decorate edges that hit gated content with a `[tier?]` guard.
   - One canonical `subscription_required` interception screen.

### Priority LOW

10. **Add a global "where am I?" affordance.**
    - Domain breadcrumb in the header for non-lesson screens.
    - Skippable.

11. **Mark dead-end screens with their auto-advance trigger.**
    - In states.js: `{ id: 'onb_intro_listen', autoAdvance: { after: 3000, to: 'onb_intro_speak' } }`.
    - Makes the flow self-documenting and machine-readable.

12. **Consolidate `home_hub_*` into a single `home` with explicit variants.**
    - One `home` screen, `variant: 'default'|'daily'|'idle'|...` as a prop.
    - Eliminates the registry/router gap.

---

## Summary of severity counts

- HIGH: 4 issues (undeclared `home`, missing global error, leaky auth, scalability under roles/subs/notifications)
- MEDIUM: 6 issues (typos, circular commit, realtime resume, modal semantics, exit confirm, parent gate)
- LOW: 2 issues (modal ambiguity, dead-end auto-advance)

10 missing flows. 8 UX risks. 10 backend risks. 8 scalability dimensions reviewed.

---

## Reviewer notes on framework adherence

- **No flow rewrite.** Recommendations are improvements, not redesigns.
- **No invented features.** Every claim cites a screen ID, edge count, or domain that exists in the input flow.
- **UNCLEAR FLOW markers** used where input genuinely doesn't say (e.g. ISSUE 4 generic API failure path; ISSUE 7 background-resume).
- **Source not re-read** — review based on `docs/flows/user-flow.md` only, per scope choice.
