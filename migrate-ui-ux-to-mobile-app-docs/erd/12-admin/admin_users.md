---
entity: admin_users
domain: 12-admin
service_owner: AdminAuthService
state_machine: '@inline'
api_endpoints:
  - POST /admin/auth/login
  - POST /admin/auth/logout
  - POST /admin/users
  - PATCH /admin/users/:id
retention: soft
sequences_referenced_in:
  - docs/sequences/12-admin/login-and-mfa.sequence.mmd
---

# admin_users

## Business purpose

TBot operator identity. Kept entirely separate from `users` (parent accounts) per plan Q-1 — admin auth requires MFA and is gated by the support tooling, not the public auth flow.

## Ownership rules

- Owner service: `AdminAuthService`
- Writers: `AdminAuthService` (provision new operators, disable on leave, enable MFA).
- Readers: every admin-facing endpoint via admin session middleware.

## Lifecycle

- Create: provisioning workflow by `super_admin` (out-of-band today; admin endpoint reserved).
- Update: MFA enroll, password rotation, role-assignment changes (in `admin_role_assignments`), status toggle.
- Delete: soft only (`status='disabled'`). Hard-delete forbidden — operator history must remain referenceable from `admin_commands`.
- State machine (inline): `active → disabled` (offboard), `disabled → active` (re-enable).

## Related APIs

- `POST /admin/auth/login` + MFA challenge (sys-12 §3).
- `POST /admin/users` / `PATCH /admin/users/:id` — provisioning surface.

## Related sequences

- `docs/sequences/12-admin/login-and-mfa.sequence.mmd` — login + MFA + session issuance.

## Validation rules

- Email is a corporate domain (allow-list enforced at app layer).
- `mfa_enabled=true` required for `super_admin` role (enforced via `admin_role_assignments` join).
- Password policy: ≥14 chars, distinct from any password reused within rolling 12-month window.

## Edge cases

- Disabled admin's `admin_sessions` must be revoked atomically with status change.
- Role moves are recorded in `admin_role_assignments` history (no in-place mutation of the role column — see `admin_role_assignments`).
