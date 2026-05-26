<!-- HAND-CURATED. -->
# Global User Flow — Narrative

This is the hand-curated narrative wrapper for `global.flow.mmd` (the generated
domain-level overview). Update this file when the high-level user journey
changes shape; the mermaid file regenerates from `nav-graph-data.json`.

## Three top-level journeys

1. **First-run onboarding** — `onb_splash` → onboarding intro/trust/voice-perm
   → auth (login/signup/child profile) → device pairing → home hub.
2. **Returning-user lesson loop** — `home_hub_idle` → course browse OR daily
   mission → lesson-session (start → activity → feedback → done) → progress
   summary → home.
3. **Parent / commerce** — `home_hub_idle` → parent_gate (PIN) → parent area
   (summary, today, history, settings, safety, robot-mgmt) AND/OR
   course-library → purchase (when buying a new course / robot bundle).

## Cross-cutting

- **Fallback** intercepts at any point: network drop, mic missing, audio failure
  → recovery path back to caller.
- **Parent gate** intercepts every entry to a `parent_*` state — `shared/navigation.flow.mmd`
  documents the redirect contract.
- **Deep links** validate the target against `nav-graph-data.json`; unknown IDs
  → `app_error`. Mid-activity lesson states never accept deep links — the
  contract redirects to `lesson_resume`.

## How this file relates to the rest of `docs/flows/`

- `global.flow.mmd` — auto-generated mermaid showing collapsed cross-domain hops.
- `domains/<d>/flow.mmd` — auto-generated per-domain detail.
- `domains/<d>/flow.md` — per-domain narrative (lane-owned hand-curated).
- `shared/cross-domain.flow.mmd` — auto-generated full cross-domain edge graph.
- `shared/navigation.flow.mmd` — hand-curated global nav rules (back button,
  parent gate, deep links).
- `edge-cases/*.flow.mmd` — six reusable templates for failure / cancel /
  retry / timeout / validation / unauthorized.
