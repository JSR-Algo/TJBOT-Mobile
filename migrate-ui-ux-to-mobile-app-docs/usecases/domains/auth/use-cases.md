# Use Cases — `auth`

> **Owning lane:** Lane A. **UC count:** 10. Phase 0.5 dry-run by Lane Z (full domain authored as the dry-run gate sample).
>
> Each H2 below corresponds to one UC ID from `reference/use-case-index.json`. Cross-domain edges: see `reference/cross-domain-edges.json`. Backend mapping: see `backend-mapping.md`. Edge cases: see `edge-cases.md`.

---

## UC-A01 — View Splash / Welcome

- **Goal:** Guest sees the brand splash and product welcome before any task starts.
- **Trigger:** App cold-start with `useAuthStore.status === 'anonymous'`.
- **Preconditions:** No active session token; first-run state OR explicit logout.
- **Main Flow:**
  1. App renders splash (`onb_splash`).
  2. Auto-advance after a short delay to `onb_welcome` (per `onboarding.usecase.puml` `<<auto-advance>>` edge).
  3. Guest taps "Get started" → onboarding intro (handled by UC-O01).
- **Postconditions:** Guest is on the onboarding intro tutorial screen; auth status unchanged.

## UC-A02 — Sign Up with Email/Password

- **Goal:** Guest creates a new parent account.
- **Trigger:** Tap "Create account" CTA on `LoginPage` with mode toggle set to `signup`.
- **Preconditions:** Guest is on `onb_login`; mode toggle is `signup`.
- **Main Flow:**
  1. Guest enters email + password into the form (`LoginScreen.jsx:50-51`).
  2. Guest taps "Create account" (`LoginScreen.jsx:56`).
  3. Client transitions navigation to `onb_child` (Set Up Child Profile, UC-A08).
  4. (Backend stub: `auth.api.js → /* TBD */`. The prototype does not yet call any signup endpoint — `BACKEND_NOT_DESIGNED`.)
- **Postconditions:** Navigation lands on `onb_child`; auth store status remains `anonymous` until backend wiring lands.

## UC-A03 — Log In with Email/Password

- **Goal:** Returning Guest authenticates with stored credentials.
- **Trigger:** Tap "Log in" CTA on `LoginPage` with mode toggle set to `login`.
- **Preconditions:** Guest has an existing account; on `onb_login`; mode toggle is `login`.
- **Main Flow:**
  1. Guest enters email + password.
  2. Guest taps "Log in" (`LoginScreen.jsx:56`).
  3. Client routes to `onb_login_error` (failure-path demo) OR `onb_child` (success-path demo) per the prototype's deterministic stub navigation.
  4. (Real backend: `auth.api.js → login()` would be called; on success, store `loginSuccess({user, token, child})` runs; on failure, `loginFailure()`.)
- **Postconditions:** On success, `useAuthStore.status === 'authenticated'`; on failure, status is `anonymous` and the user lands on `onb_login_error`.
- **Alt Flow:**
  1. (success path) → cross-domain handoff to kid-hub `UC-H01` (see cross-domain-edges.json: UC-A03→UC-H01).
- **Error Flow:**
  1. (failure path) → UC-A07 Recover from Login Error.

## UC-A04 — Continue with Google

- **Goal:** Guest authenticates via Google OAuth instead of email/password.
- **Trigger:** Tap "Continue with Google" button (`LoginScreen.jsx:30-37`).
- **Preconditions:** Guest is on `onb_login`; Google client SDK available (NOT CONFIRMED in source — button stub only).
- **Main Flow:**
  1. Guest taps Google button.
  2. Client delegates to Google OAuth (see cross-domain-edges.json: UC-A04→ACTOR:Google).
  3. On Google success, navigation routes to `onb_child` (`LoginScreen.jsx:30`).
- **Postconditions:** As UC-A03 success path.

## UC-A05 — Continue with Apple

- **Goal:** Guest authenticates via Apple Sign-In.
- **Trigger:** Tap "Continue with Apple" button (`LoginScreen.jsx:38-45`).
- **Preconditions:** Guest is on `onb_login`; iOS device with Apple ID configured (button is rendered cross-platform but Apple flow is iOS-native).
- **Main Flow:**
  1. Guest taps Apple button.
  2. Client delegates to Apple Sign-In (see cross-domain-edges.json: UC-A05→ACTOR:Apple).
  3. On Apple success, navigation routes to `onb_child`.
- **Postconditions:** As UC-A03 success path.

## UC-A06 — Reset Password

- **Goal:** Guest is offered a path back to the login screen after a failed sign-in attempt; in the prototype this is button-only with no API call.
- **Trigger:** Tap "Reset password" on `LoginErrorPage` (`LoginErrorScreen.jsx:39`).
- **Preconditions:** Guest is on `onb_login_error`.
- **Main Flow:**
  1. Guest taps "Reset password".
  2. Client navigates back to `onb_login`. **No reset email is sent** (KD1, KD13).
- **Postconditions:** Guest is on `onb_login`. No password reset has occurred.
- **Error Flow:**
  1. Button is a no-op affordance pending `BACKLOG-UC-A06` decision; see `reference/backlog.md`.

## UC-A07 — Recover from Login Error

- **Goal:** Guest sees what failed during login and can correct + retry.
- **Trigger:** Login attempt failed; client navigated to `onb_login_error`.
- **Preconditions:** Previous UC-A03 attempt failed.
- **Main Flow:**
  1. Guest sees error banner "Email or password is incorrect" (`LoginErrorScreen.jsx:33`).
  2. Guest may edit pre-filled email/password fields.
  3. Guest taps "Try again" (`LoginErrorScreen.jsx:38`) → re-attempts login (in prototype, navigates straight to `onb_child`).
- **Postconditions:** As UC-A03 success path on retry success.
- **Alt Flow:**
  1. Guest taps "Reset password" → UC-A06.

## UC-A08 — Set Up Child Profile

- **Goal:** Authenticated Guest configures their child's avatar (buddy) and starting English level.
- **Trigger:** Successful sign-up/log-in lands on `onb_child` (`ChildProfilePage`).
- **Preconditions:** Auth store has `user` set OR navigation arrived from `onb_login` stub.
- **Main Flow:**
  1. Guest picks a buddy avatar from the 8-option grid (`ChildProfileScreen.jsx:39-46`).
  2. Guest picks a starting level: Just starting / Knows some words / Speaks a bit (`ChildProfileScreen.jsx:55-77`).
  3. Guest taps "Save and meet Robot" (`ChildProfileScreen.jsx:84`).
  4. Client transitions to `onb_first_lesson`.
- **Postconditions:** Auth store `child` populated via `setChild()` (in real wiring); navigation lands on `onb_first_lesson`.

## UC-A09 — Token Refresh

- **Goal:** Maintain an authenticated session by refreshing an expiring token without forcing re-login.
- **Trigger:** **NOT CONFIRMED IN SOURCE** (KD2). Auth store has `beginRefresh` / `refreshSuccess` / `refreshFailure` actions but no UI/timer/`401` interceptor that calls them.
- **Preconditions:** `useAuthStore.status === 'authenticated'`; token is approaching expiry.
- **Main Flow:**
  1. (Hypothetical) Trigger fires `beginRefresh()` — store transitions `authenticated` → `expiring`.
  2. (Hypothetical) Refresh API call returns new token; `refreshSuccess({token})` runs — back to `authenticated`.
- **Postconditions:** New token in store; status back to `authenticated`.
- **Error Flow:**
  1. Refresh API fails → `refreshFailure()` → status becomes `expired` → next protected call must re-auth (see `useAuthStore.needsReauth()`).

## UC-A10 — Logout

- **Goal:** Authenticated user terminates their session and returns to the login screen.
- **Trigger:** **NOT CONFIRMED IN SOURCE** (KD3). Store has `logout()` action; no button observed in any screen.
- **Preconditions:** `useAuthStore.status === 'authenticated'` or `'expiring'`.
- **Main Flow:**
  1. (Hypothetical) User taps Logout (location TBD — likely Parent Settings).
  2. `logout()` action clears `user`, `token`, `child`; sets status to `anonymous`.
  3. Client navigates to `onb_login`.
- **Postconditions:** Auth store cleared; navigation on `onb_login`.
- **Alt Flow:**
  1. Server-initiated revocation: `revoke()` action sets status to `revoked` (different from user-initiated logout); next protected call surfaces `needsReauth()` and forces re-login.
- **P3.B promotion (2026-05-12):** UI trigger to be added in `parent_settings`. Sequence `docs/sequences/01-identity/logout.sequence.mmd` authored. KD3 closes once button lands in P4.3 wiring.

## UC-A11 — Revoke Active Session

- **Goal:** Parent views a list of active sessions across devices (web, paired mobile, other phones) and revokes a specific one without logging out the current device.
- **Trigger:** Tap "Active sessions" row in `parent_settings`.
- **Preconditions:** Authenticated parent JWT; at least one row in `parent_sessions` for `user_id`.
- **Main Flow:**
  1. ParentApp GETs `/v1/identity/sessions` → returns the row set per `parent_sessions_active_by_user_idx`.
  2. List renders one row per session with `device_label`, `last_seen_at`, `current` flag.
  3. Parent taps a row → confirm sheet "Sign out this device?" → DELETE `/v1/identity/sessions/{jti}`.
  4. Server soft-revokes (sets `revoked_at`); next protected call from that device returns 401; that device's client triggers forced-logout (UC-A10 Alt Flow).
- **Postconditions:** Target `parent_sessions.revoked_at` set; current session unaffected unless self-revoking.
- **Alt Flow:**
  1. Self-revoke: parent taps the row marked `current` → confirm "Sign out this device now?" → DELETE own jti → immediate forced-logout, navigate to `onb_login`.
- **Error Flow:**
  1. `session_not_found` (already revoked by another device) → 404; client refreshes list.
  2. `not_authorized` (token mismatch) → 401; force re-PIN per ADR-0005 D6.
- **Related:** Sequence `docs/sequences/01-identity/session-revoke.sequence.mmd`.

## UC-A12 — Delete Account

- **Goal:** Parent initiates permanent account deletion (right-to-erasure under GDPR + COPPA); enters a 30-day grace period before the data-deletion pipeline executes.
- **Trigger:** Tap "Delete my account" deep inside `parent_settings`; requires fresh parent JWT < 60s per ADR-0005 D6.
- **Preconditions:** Authenticated parent; no pending Stripe invoice (must cancel subscription first — UC-SUB02).
- **Main Flow:**
  1. ParentApp POSTs `/v1/identity/account/delete-request` with `{user_id, X-Request-Id}`.
  2. Server creates `deletion_jobs` row state=`grace_period`, sets `deletes_at = now() + interval '30 days'`, enqueues an SQS reminder.
  3. SES sends a confirmation email with cancellation link.
  4. Parent app shows "Account scheduled for deletion on YYYY-MM-DD" banner; provides Cancel button.
  5. On `deletes_at`, AccountDeletionService picks up SQS message → triggers full pipeline (sequence `docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd`).
- **Postconditions:** `deletion_jobs` row created (grace period); user can still cancel until `deletes_at`. After pipeline: all PII purged, `coppa_consents.revoked_at` set, child profiles soft-deleted, audit log preserved.
- **Alt Flow:**
  1. Cancel during grace: ParentApp POSTs `/v1/identity/account/delete-request/{job_id}/cancel` → `deletion_jobs.state='cancelled'`; user returns to normal.
- **Error Flow:**
  1. `pending_subscription_cancel_required` 409 → toast "Cancel your subscription first"; parent app navigates to UC-SUB02.
  2. `deletion_already_in_progress` 409 with existing `job_id` → idempotent, show existing job state.
- **Related:** Sequence `docs/sequences/01-identity/account-delete.sequence.mmd` → `docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd`.

## UC-A13 — Export Account Data

- **Goal:** Parent requests a portable archive of all account data (GDPR data portability right).
- **Trigger:** Tap "Export my data" in `parent_settings`; requires fresh parent JWT < 60s.
- **Preconditions:** Authenticated parent.
- **Main Flow:**
  1. ParentApp POSTs `/v1/identity/account/export-request` with `{user_id, format: 'json' | 'csv'}`.
  2. AccountDeletionService (same worker handles exports) enqueues a job; assembles a multi-file archive (`profile.json`, `children.json`, `lessons.json`, `consents.json`, `billing.json`, `audit_logs.json`).
  3. SES emails a signed-URL download link (24h expiry).
- **Postconditions:** Archive available for 24h; one export per 30-day rolling window.
- **Error Flow:**
  1. Rate-limit (more than 1 per 30d) → 429 with `Retry-After` header showing days remaining.
- **Related:** Sequence TBD (P5 follow-up — share worker pool with UC-A12 account-delete pipeline).

## UC-A14 — Reset Parent PIN

- **Goal:** Parent who forgot their PIN regains access via an email magic-link, even during a 15-min `GATE_LOCKED_OUT` window. Per ADR-0008.
- **Trigger:** Tap "Forgot PIN?" link on `ParentGateScreen` OR `ParentLockedOutScreen`.
- **Preconditions:** Authenticated user with a verified `users.email` on file. Active `parent_pins` row exists for the user (the reset replaces it).
- **Main Flow:**
  1. ParentApp POSTs `/v1/parent/pin/recovery/request` with `{user_id, email_hint, X-Request-Id}`.
  2. Server: (a) verifies email matches `users.email`; (b) creates `pin_recovery_tokens` row with 32-byte random `token`, sha256 hash stored, `expires_at = now() + 15 min`, `used_at = null`; (c) SES emails `tbot://parent/pin-reset?token=…` (D2). Rate-limited 1/hour per `(user_id, ip_prefix /24)`.
  3. Server returns 202 envelope: "If that email is on file, we sent a link" — anti-enumeration (D10).
  4. Parent taps email link → `ParentPinResetScreen` opens via deep-link handler (UC-MOBILE01, bypasses parent_gate per ADR-0008 D8).
  5. ParentApp POSTs `/v1/parent/pin/recovery/validate` → 200 if valid + unused + unexpired.
  6. Parent enters new 4-digit PIN + confirms.
  7. ParentApp POSTs `/v1/parent/pin/recovery/complete` with `{token, new_pin}` → server bcrypt-hashes new PIN, writes `parent_pins.bcrypt_hash`, marks `pin_recovery_tokens.used_at`, clears any active `parent_lockouts` row, **revokes all active `parent_sessions` for the user**.
- **Postconditions:** New PIN stored. Lockout cleared. All prior parent_sessions invalidated; user must re-PIN on every device. Audit log row written (D7).
- **Alt Flow:**
  1. Email not on file → server still returns 202; no row written (anti-enumeration).
  2. 4th request in same hour → throttle 429; client surfaces "Contact support" CTA after 3 throttled rejections.
- **Error Flow:**
  1. Token expired (>15min) → server 410; client shows "Link expired — request a new one".
  2. Token already used → server 410; client shows "This link was already used".
  3. In-flight `POST /v1/parent/auth` with OLD PIN against a reset account → 401 (D9 race).
- **Related:** ADR-0008. Sequence `01-identity/pin-recovery.sequence.mmd`. ERD `pin_recovery_tokens.dbml`.

## UC-A15 — Add Child Profile

- **Goal:** Add a sibling to an existing household. Per ADR-0011 D2 + D10 — slim per-child onboarding (skips parent identity, payment) but REQUIRES fresh COPPA consent per child.
- **Trigger:** Tap "Add a child" in active-child selector OR in `ParentChildrenScreen`.
- **Preconditions:** Authenticated parent (primary OR secondary); household has < 10 children (hard cap); fresh parent JWT recommended (not required).
- **Main Flow:**
  1. ParentApp navigates to `AddChildScreen` (new).
  2. Parent enters child's display name, age band, language target, buddy.
  3. Parent runs the per-child COPPA consent flow (UC-O05) — creates a new `coppa_consents` row tied to this child.
  4. ParentApp POSTs `/v1/identity/children` with `{household_id, display_name, age_band, language_target, buddy_id, coppa_consent_id, X-Request-Id}`.
  5. Server creates `children` row with `status='active'`; FK to consent.
  6. Client adds child to local roster; offers "Switch to <name>" (UC-A16).
- **Postconditions:** Sibling profile active; selector reflects N+1 children.
- **Alt Flow:**
  1. Soft-cap (5+ children) → warning copy "Most families have 1-4 kids"; flow proceeds.
- **Error Flow:**
  1. Hard-cap (10+ children) → 409 `hard_cap_reached`; CTA disabled.
  2. Nickname collision in same household → 409; surface inline error on name field.
  3. Parent declines COPPA → return to `ParentChildrenScreen` without persisting.
- **Related:** ADR-0011. Sequence `01-identity/child-add.sequence.mmd`. UC-O05 reused per-child.

## UC-A16 — Switch Active Child

- **Goal:** Change which child is "playing" — drives lesson personalization + cost-cap scoping. Per ADR-0011 D3.
- **Trigger:** Tap active-child chip on `HomeHubScreen` OR row in `ParentChildrenScreen`.
- **Preconditions:** Household has ≥ 2 active children.
- **Main Flow:**
  1. Selector sheet opens listing all active children + "Add a child" CTA.
  2. Parent taps target child.
  3. Client updates `auth.store.activeChildId` + persists to AsyncStorage.
  4. ParentApp POSTs `/v1/profile/active-child` with `{active_child_id}` (lightweight, ~200ms).
  5. Sheet dismisses; `HomeHubScreen` reflects new active child.
- **Postconditions:** Server-side `active_child_id` updated; future `realtime_sessions` rows bind to new `child_id`; cost-cap counter scoped to new child.
- **Alt Flow:**
  1. Switch initiated mid-lesson → blocked with "Finish or cancel the current lesson first" toast.
- **Error Flow:**
  1. Network failure on POST → switch persists locally; server-sync deferred to next foreground.
- **Related:** ADR-0011 D3 + D7. Sequence `01-identity/child-switch.sequence.mmd`.

## UC-A17 — Suspend Child Profile

- **Goal:** Hide a child from selector + kid surface without deleting their data. Reversible. Any household parent can perform.
- **Trigger:** Tap "Suspend" in `ParentChildrenScreen` → row detail.
- **Preconditions:** Authenticated parent (primary OR secondary); child's current `status='active'`.
- **Main Flow:**
  1. Confirm sheet "Pause <name>? You can re-enable later."
  2. ParentApp PATCHes `/v1/identity/children/{id}` with `{status: 'archived'}`.
  3. Server sets `children.status='archived'`, `archived_at=now()`; data intact.
  4. Child disappears from selector + kid surface; appears in `ParentChildrenScreen → Paused` section.
- **Postconditions:** Child archived; can be re-activated via PATCH back to `status='active'`.
- **Alt Flow:**
  1. Re-activate later: PATCH back to active; lesson history + entitlements untouched.
- **Error Flow:**
  1. Child has active lesson → server 409 `lesson_in_progress`; prompt to end lesson first.
- **Related:** ADR-0011 D6. Sequence `01-identity/child-delete.sequence.mmd` (shared with UC-A18).

## UC-A18 — Delete Child Profile

- **Goal:** Permanently remove a child + their lesson history + COPPA-bound data. **Primary-parent only per ADR-0010 D5.** Triggers 30-day retention pipeline.
- **Trigger:** Tap "Delete permanently" in `ParentChildrenScreen` → row detail.
- **Preconditions:** Authenticated parent with `role='owner'` (ADR-0010); child's current `status` ∈ `{active, archived}`.
- **Main Flow:**
  1. Heavy confirm sheet — explicit "Type the child's name to confirm" gate.
  2. Fresh parent JWT < 60s required (re-PIN or biometric if stale).
  3. ParentApp PATCHes `/v1/identity/children/{id}` with `{status: 'scheduled_for_deletion'}`.
  4. Server: `children.status='scheduled_for_deletion'`, `deleted_at=now()+30d`, enqueue SQS for AccountDeletionService.
  5. SES confirmation email; child app immediately stops appearing in selector.
  6. After 30 days: AccountDeletionService cascades soft-delete to `realtime_sessions`, `progress_*`, `coppa_consents` for that child only.
- **Postconditions:** Child deletion scheduled. After 30d retention: PII purged; primary parent can cancel during grace via PATCH back to `status='active'`.
- **Alt Flow:**
  1. Cancel during grace: PATCH back to active before `deleted_at`; data fully restored.
- **Error Flow:**
  1. Secondary parent attempts → 403 with `requires_role=primary` envelope; UI explainer.
  2. Last active child + last household member → server warns "This will leave the household childless" (informational, allows continue).
  3. Stripe subscription active → continues normally (subs are household-scoped, not child-scoped per ADR-0011 D8).
- **Related:** ADR-0011 D6. ADR-0010 D5. Sequence `01-identity/child-delete.sequence.mmd`. sys-14 retention pipeline.
