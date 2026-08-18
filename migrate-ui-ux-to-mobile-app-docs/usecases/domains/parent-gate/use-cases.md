# Use Cases — `parent-gate`

> **Owning lane:** Lane C. **UC count:** 1.
>
> This document records the current mobile implementation. Each H2 corresponds to one UC ID from `reference/use-case-index.json`.

---

## UC-PR01 — Authenticate Parent

- **Goal:** Validate a parent PIN when the app explicitly opens `ParentGateScreen`, then continue to the requested parent destination.
- **Trigger:** Navigation explicitly targets `ParentGateScreen`. The current in-app trigger is the safety redirect's "Get a grown-up" action, which requests `ParentSummaryScreen`; callers may also provide one of the supported `next` routes.
- **Preconditions:** The user can reach the authenticated app and the `/parent/auth` service is available. The screen does not inspect an existing parent session before showing the PIN form.
- **Main Flow:**
  1. `ParentGateScreen` renders a numeric, secure-text PIN field and a "Confirm" action.
  2. The parent enters up to six digits and confirms.
  3. The app calls `authenticateParent({ pin })`, which posts `{ pin }` to `/parent/auth`.
  4. When the response has `authenticated: true`, the screen calls the in-memory `ParentSessionContext.markGated()` helper.
  5. The screen replaces itself with the requested `next` route. Supported targets are Parent Summary, Settings, Safety, History, Today, and Account Privacy; an absent or unsupported target falls back to Parent Summary.
- **Postconditions:** The requested parent screen is displayed and the local parent-session timestamps are refreshed. The response is not stored as a parent-session JWT, and current parent screens do not enforce these timestamps because `useParentGateGuard` is intentionally a no-op.
- **Alternate Flow:**
  1. The parent selects "Back to play" and navigates to the Home Hub without authenticating.
  2. Home Hub opens Parent Summary and Parent Settings directly; those routes do not automatically invoke this use case.
- **Error Flow:**
  1. A resolved response with `authenticated: false` keeps the user on the gate and shows "Parent PIN was not accepted. Try again."
  2. A `423` error replaces the gate with `ParentLockedOutScreen`.
  3. A `429` error disables submission for `retryAfterSeconds` (30 seconds by default), shows the cooldown duration, and re-enables the form when the timer expires.
  4. Other rejected requests keep the user on the gate and show "Wrong PIN. Try again."
- **Scope Notes:**
  - This is an explicit compatibility route, not an automatic boundary around every parent surface or sensitive write.
  - Course-library assignment is the separate PIN-free UC-CL04 `UC_CL_CONFIRM_ADD` flow and does not invoke this use case.
- **Implementation Evidence:**
  - `src/features/parent/screens/ParentGateScreen.tsx`
  - `src/features/parent/hooks/useParentGateGuard.ts`
  - `src/features/parent/context/ParentSessionContext.tsx`
  - `src/features/home/screens/HomeHubScreen.tsx`
  - `src/features/fallback/screens/SafetyRedirectScreen.tsx`
  - `src/services/api/parent.api.ts`
