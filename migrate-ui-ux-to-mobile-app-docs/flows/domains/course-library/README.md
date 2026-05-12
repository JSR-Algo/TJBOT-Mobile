<!-- HAND-CURATED. -->
# Course Library Domain Flow

**Owner lane:** D  
**States:** 12 (11 happy, 1 edge)

## Happy path — Browse and launch

`cl_library` is the entry point — a scrollable grid of available courses. The user taps a course card to reach `cl_detail`, where they can read the course description and decide to purchase or unlock.

### Purchase / unlock sub-flow

`cl_buy` → `cl_unlock_confirm`

`cl_unlock_confirm` is classified **happy** (exemption: this is a parent-gated confirmation modal, not an error branch — it is the intentional, expected step in the unlock funnel, always reached before the purchase completes).

On confirmation: `cl_unlock_confirm` → `cl_added` (course added to the robot's queue).

### Delivery sub-flow

`cl_added` → `cl_send` → `cl_robot_ready` → `cl_running`

- `cl_send` transfers the lesson package to the robot over the local connection.
- `cl_robot_ready` confirms the robot has received and staged the lesson.
- `cl_running` is the companion view shown while the lesson plays on the robot.

### Post-lesson

`cl_running` → `cl_companion` → `cl_complete`

- `cl_companion` shows real-time lesson progress (vocabulary hits, engagement score).
- `cl_complete` displays the post-lesson summary and sync confirmation.

### Out-of-sync recovery

`cl_needs_sync` — robot has lesson data that has not been uploaded to the cloud. User prompted to connect to sync before viewing results.

## Edge state

| State | Templates | Trigger |
|---|---|---|
| `cl_locked` | unauthorized | Course requires purchase but the account has no active subscription or the parent has not unlocked it. Child sees a lock icon; parent must authenticate to proceed. |

## Notes

- `cl_unlock_confirm` has **no** entry in `edge_cases` — it is a normal confirmation step, not an error recovery path.
- `cl_needs_sync` is informational and resolves automatically when the robot reconnects; no user action required beyond ensuring connectivity.
