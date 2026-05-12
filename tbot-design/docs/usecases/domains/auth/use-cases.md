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
