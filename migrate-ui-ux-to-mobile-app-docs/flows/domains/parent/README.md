<!-- HAND-CURATED. -->
# Parent Domain Flow

**Owner lane:** C  
**Entry:** `parent_gate` (from home domain via `go('parent_gate')`)  
**Exits:** → `rm_my_robot` (robot-mgmt); → `cl_library` (course-library); → `home_hub_idle` (home)

## Purpose

Gated parent dashboard. PIN authentication protects child safety and account settings from accidental kid access. Covers usage summaries, history, safety/privacy controls, and a path to robot management.

## Journey narrative

The parent taps the parent icon on the home hub. Home fires `go('parent_gate')`. The PIN entry screen appears (`parent_gate` — classified `edge` because PIN failure triggers an unauthorized recovery path). On success, the flow advances to `parent_summary`.

From `parent_summary`, parents can:
- View today's practice (`parent_today`)
- Browse the 30-day history (`parent_history`)
- Review safety & privacy settings (`parent_safety`)
- Access account/notification settings (`parent_settings`)

All detail screens back to `parent_summary`. `parent_settings` also exposes a direct link to `parent_safety`. From `parent_summary`, a "Home" CTA exits to `home_hub_idle`.

Robot management and course-library are cross-domain exits accessible from `parent_summary` / `parent_settings` (handled in `shared/cross-domain.flow.mmd`).

## States

| ID | Kind | Title | Role |
|----|------|-------|------|
| `parent_gate` | edge | Parent Gate | PIN entry; failure → unauthorized template |
| `parent_summary` | happy | Parent Summary | Dashboard hub |
| `parent_today` | happy | Practiced Today | Today's session breakdown |
| `parent_history` | happy | Past 30 Days | 30-day learning history |
| `parent_safety` | happy | Safety & Privacy | Safety & privacy settings |
| `parent_settings` | happy | Parent Settings | Account / notification settings |

## Edge-case mapping

`parent_gate` maps to `edge-cases/unauthorized.flow.mmd`:  
- PIN fail → show error toast → retry (up to N attempts)  
- Cancel → `home_hub_idle`  
- Success → `parent_summary`

## Entry / exit edges

| Direction | Edge | Trigger |
|-----------|------|---------|
| Inbound | home → `parent_gate` | parent icon tap |
| Outbound | `parent_gate` → `home_hub_idle` | cancel / max PIN failures |
| Outbound | `parent_summary` → `home_hub_idle` | "Home" CTA |
| Outbound | `parent_summary` → `rm_my_robot` | robot-mgmt link (cross-domain) |
| Outbound | `parent_summary` → `cl_library` | course-library link (cross-domain) |
