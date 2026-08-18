# Actor — Parent

**Type:** Internal, primary.

**Source evidence:** the authenticated mobile app is currently a parent-operated surface. Home opens parent summary/settings directly, and `useParentGateGuard` is an intentional no-op, so parent screens do not automatically redirect through a PIN gate. `ParentGateScreen` remains an explicit compatibility route that calls `authenticateParent`, records a successful check in the in-memory `ParentSessionContext`, and opens its requested next route. `src/features/course-library/UnlockConfirmModal.tsx` is a separate PIN-free course-assignment confirmation.

**Auth boundary:** normal app authentication is the enforced entry boundary. A Parent PIN is checked only when navigation explicitly opens `ParentGateScreen`; the no-op screen guard does not enforce that check before Parent Settings or other parent surfaces. UC-CL04 neither requests a Parent PIN nor establishes a parent-gate session; it confirms course enrollment and assignment only.

**Generalization:** `Parent --|> Authenticated User` (overview puml).

## Domains touched

- `parent-gate` (the gate itself)
- `parent-summary` (parent dashboards on child activity)
- `course-library` (commerce + send-to-robot)
- `purchase` (hardware + subscription funnel)
- `device-pairing` (one-time provisioning)
- `device-mgmt` (post-pair operations — KD5)
- `robot-mgmt` (post-pair diagnostics)
- `fallback-shell` (audio-recovery surface — `UC-F03`)

## UCs initiated

See `domains/<d>/use-cases.md` for the full list. `ParentGateScreen` and `UnlockConfirmModal` are distinct Parent-initiated flows: the former is an explicit PIN compatibility route, while the latter is a PIN-free assignment action.

## Notes

- The Parent actor is the **only** initiator of destructive operations: `UC-RM10 Factory Reset`, payment commits, and course assignment changes.
- COPPA-relevant flows (account deletion, data export) are NOT CONFIRMED IN SOURCE.
