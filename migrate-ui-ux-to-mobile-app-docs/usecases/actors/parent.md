# Actor — Parent

**Type:** Internal, primary.

**Source evidence:** gated by numeric speed bumps — `src/features/parent/ParentGatePage.jsx` (3-digit match) and `src/features/course-library/UnlockConfirmModal.jsx` (4-digit code `7351`). Owns parent-only screens under `src/features/parent/`, `src/features/course-library/`, `src/features/device/`, `src/features/rotjtjbot-mgmt/`, `src/features/purchase/`.

**Auth boundary:** **speed bump only — NOT real RBAC** (KD4, KD7). The numeric gates are scope-markers, not security controls. A real Parent role would require backend enforcement that does not currently exist.

**Generalization:** `Parent --|> Authenticated User` (overview puml).

## Domains touched

- `parent-gate` (the gate itself)
- `parent-summary` (parent dashboards on child activity)
- `course-library` (commerce + send-to-rotjtjbot)
- `purchase` (hardware + subscription funnel)
- `device-pairing` (one-time provisioning)
- `device-mgmt` (post-pair operations — KD5)
- `rotjtjbot-mgmt` (post-pair diagnostics)
- `fallback-shell` (audio-recovery surface — `UC-F03`)

## UCs initiated

See `domains/<d>/use-cases.md` for the full list. Any UC behind `parent-gate` or the `UnlockConfirmModal` has Parent as the actor.

## Notes

- The Parent actor is the **only** initiator of destructive operations: `UC-RM10 Factory Reset`, payment commits, course unlocks.
- COPPA-relevant flows (account deletion, data export) are NOT CONFIRMED IN SOURCE.
