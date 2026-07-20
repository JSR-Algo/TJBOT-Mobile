# Hot UC — `UC-H01 View Home Hub`

> Hot dossier per Phase 1.5 backfill. Owning lane: B. Promoted via §6.2 Criterion 2 (target of ≥3 cross-domain edges per `reference/cross-domain-edges.json`).

## Identity

- **ID:** UC-H01
- **Title:** View Home Hub
- **Domain:** `kid-hub`
- **Owning Lane:** B
- **Hot criteria met:** **Criterion 2** (15 incoming cross-domain edges — the highest-fan-in target in the entire model)

## Status

- **Index status:** `defined`
- **Backend status:** `BACKEND_NOT_DESIGNED` (`home.api.js → getHomeHub` is a stub; would feed the variant + state chip)

## Detailed flow

1. Mount: `HomeHubPage` reads the variant tweak (`HomeHubScreen.jsx:13` — one of `idle | greeting | daily_available | completed_today | mic_needed | offline`).
2. Render: `Rotjtjbot` avatar + state chip + state-driven primary CTA (`HomeHubScreen.jsx:18-66`).
3. Render: secondary trio Course / Review / Progress (`HomeHubScreen.jsx:163-165`).
4. Render: TopBar with parent-area entry (UC-H08 trigger) + settings entry.
5. Idle/static unless tapped — UC-H02 (greeting) is a no-op affordance; UC-H03..H08 are all CTAs that hand off elsewhere.

State machine pointer: `src/features/home/states.js`.

## Why hot — incoming edges (15)

This is **the** return-home target. Almost every domain that opens a sub-flow eventually edges back to UC-H01:

- From auth: UC-A03 (login success), UC-A08 (child profile saved)
- From course-browse: UC-C01, UC-C07, UC-C08
- From lesson-session: UC-L16 (lesson done), UC-L17 (exit confirm), UC-L19 (audio error), UC-L20 (safety break)
- From fallback-shell: UC-F01, UC-F02, UC-F04, UC-F05, UC-F07, UC-F08

Every one of these edges expects `useAuthStore.status === 'authenticated'` AND a child profile. **Failure mode:** if a back-home edge fires from a state where auth has been revoked, UC-H01 must redirect to `onb_login` instead of rendering. This is not currently wired in the prototype — flagged for backend lane when auth wiring lands.

## Cross-domain edges (read-only mirror — see `reference/cross-domain-edges.json` for canonical)

- Outgoing: UC-H01 has no outgoing cross-domain edges (it's a return target, not a launcher). Outgoing handoffs are owned by sibling UCs UC-H03..H08.
- Incoming: 15 (see "Why hot" above).

## Open questions

- **Auth-revocation guard:** what happens if a back-home edge fires from `useAuthStore.needsReauth() === true`? Currently UC-H01 renders the kid surface; should redirect.
- **Variant arbitration:** the prototype reads variant from a tweak. Real wiring needs server-side variant computation (`home.api.js → getHomeHub`) plus a deterministic precedence rule.
- **`mic_needed` re-entry:** if Child arrives via UC-F02 (mic missing → fallback) and then back-home, should the variant be `mic_needed` or `idle`? Currently no rule.

## Carry-forward

- No backlog entry created (UC-H01 is `defined` and behaviorally complete in the prototype). Auth-revocation guard depends on `BACKLOG-UC-A09` (token refresh) landing first.
