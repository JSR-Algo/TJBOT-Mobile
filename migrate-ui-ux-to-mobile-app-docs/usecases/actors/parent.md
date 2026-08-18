# Actor — Parent

**Type:** Internal, primary.

**Source evidence:** parent-only settings use the dedicated Parent Gate, while `src/features/course-library/UnlockConfirmModal.tsx` is a PIN-free assignment confirmation for an authenticated parent. Owns parent-only screens under `src/features/parent/`, `src/features/course-library/`, `src/features/device/`, `src/features/robot-mgmt/`, `src/features/purchase/`.

**Auth boundary:** Parent Settings security is governed by the Parent Gate and backend parent session model. UC-CL04 does not establish or refresh that boundary; it confirms course enrollment and assignment only.

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

See `domains/<d>/use-cases.md` for the full list. Any UC behind `parent-gate` or the `UnlockConfirmModal` has Parent as the actor.

## Notes

- The Parent actor is the **only** initiator of destructive operations: `UC-RM10 Factory Reset`, payment commits, course unlocks.
- COPPA-relevant flows (account deletion, data export) are NOT CONFIRMED IN SOURCE.
