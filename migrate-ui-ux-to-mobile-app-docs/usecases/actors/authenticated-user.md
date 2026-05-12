# Actor — Authenticated User

**Type:** Internal, generalization base for Child and Parent.

**Source evidence:** `useAuthStore.status === 'authenticated'` or `'expiring'` (`src/store/auth.store.js`). Selector helper `isAuthenticated()`.

**Auth boundary:** holds a valid session token (or one in flight via `beginRefresh`).

**Generalization:** `Child --|> AuthUser`, `Parent --|> AuthUser`, `AuthUser --|> Guest`.

## Domains touched

- `auth` (session-bearing UCs only: UC-A09 Token Refresh, UC-A10 Logout)

## UCs initiated directly (not via Child or Parent specialization)

- UC-A09 — Token Refresh (system-initiated; UI trigger NOT CONFIRMED, KD2)
- UC-A10 — Logout (system action exists; UI trigger NOT CONFIRMED, KD3)

## Notes

- Most app activity is initiated by the Child or Parent specialization, not the bare AuthUser. This actor exists to host UCs that apply equally to both specializations and require an authenticated session.
