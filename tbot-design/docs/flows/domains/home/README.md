<!-- HAND-CURATED. -->

# Home Domain — Flow Narrative

**Entry:** `home_hub_idle` (from device pairing success, lesson complete, or app boot returning user)

**Exit targets:**
- `lesson_ready` → lesson-session domain
- `course` → course domain
- `cl_library` → course-library domain
- `parent_gate` → parent domain
- `network_error` → fallback domain

## Journey

The home hub is the kid's primary landing pad. On first arrival the robot greets (`home_hub_greet`) before settling to idle. The hub reflects daily state: `home_hub_daily` (lesson available), `home_hub_done` (lesson complete today). Two edge conditions can interrupt: `home_hub_mic` (microphone permission missing — blocks lesson launch until resolved) and `home_hub_offline` (robot unreachable — retries automatically, exits to fallback on repeated failure).

All navigation outward is via explicit `go()` calls from `HomeHubPage.jsx`; there are no implicit transitions.

## Edge cases used

| State | Template(s) | Notes |
|---|---|---|
| `home_hub_mic` | error | User prompted to grant mic permission; CTA dismisses or opens settings |
| `home_hub_offline` | retry, error | Polls robot connection; retry bounded; exits to `network_error` on exhaustion |

## Screenshots

TBD — design prototype screens at `src/features/home/`.
