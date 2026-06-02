# Actor — Guest (Unauthenticated User)

**Type:** Internal, primary.

**Source evidence:** `src/features/onboarding/*Page.jsx` and `src/features/auth/LoginPage.jsx` — the pre-login surface. Auth store state `anonymous` (`src/store/auth.store.js`).

**Auth boundary:** no session token. `useAuthStore.status === 'anonymous'`.

**Generalization:** base actor; `AuthUser --|> Guest` (overview puml).

## Domains touched

- `onboarding` (splash → welcome → intro tutorial → trust → mic permission → first lesson)
- `auth` (sign up, log in, OAuth delegations, child profile setup)

## UCs initiated

UC-A01..A08 (auth domain pre-login UCs), UC-O01..O04 (full onboarding domain).

## Notes

- Token-refresh (UC-A09) and Logout (UC-A10) require an authenticated session and therefore are NOT Guest-initiated — they belong to `Authenticated User`.
