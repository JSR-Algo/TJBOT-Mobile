# Redesign Proposals Hub

A side-by-side audit of every primary TJBot Mobile surface.  Mirrors the
shape of the Tradeverse 2.0 proposals hub at `http://127.0.0.1:8432/proposals/`,
adapted for the Mobile lane per `DESIGN.md` and the redesign-2026 wave ladder.

## Files

- `index.html`   — the hub. Open in any browser; no build step.
- `proposal.css` — token-only stylesheet, two-lane separation enforced.
- `data.js`      — surface catalog (route + per-surface WHAT IS WRONG + PROPOSED + proposed mock + capture status).
- `captures/`    — PNGs produced by `tools/capture-mobile-surfaces.mjs`.

## Open it

```
cd original-app/TJBOT-Mobile/docs/design-references/redesign-proposals-hub
python3 -m http.server 8080
# then visit http://127.0.0.1:8080/
```

Or just open `index.html` in a browser; relative paths work.

## Capture script

```
node tools/capture-mobile-surfaces.mjs              # default: all surfaces, 60s settle
node tools/capture-mobile-surfaces.mjs --dry-run    # print plan only
node tools/capture-mobile-surfaces.mjs --surfaces home-hub,lesson-player
```

It writes `captures/<surface-id>.png` and `captures/capture-summary.json`.
The hub reads the captures on next reload.

## Current state (2026-06-29)

- 14 surfaces mapped from `src/navigation/routes.ts` (out of 134+ route names; this is the high-curvature subset).
- 6 already show real PNGs from the wave-0 build (`../../../../redesign-sim-{01..08}.png`).
- 8 awaiting live capture. Each carries an honest `captureBlocker` reason.
- 0 surfaces have had `src/` edited for this hub.

## Why this lives under `original-app/TJBOT-Mobile/docs/design-references/`

The redesign-2026 wave plan (`docs/design-references/redesign-2026/REDESIGN-PLAN.md`)
is the authority for the ladder. The hub is the **operational artifact** the
ladder points at: every wave's "preview via iOS Simulator" step (REDESIGN-PLAN §L83)
should drop its captures into `captures/` and update `data.js` `captured: true`
for the surfaces in scope. The agent doing the wave work does not need to
re-author the HTML.

## Constraints honored

- `AGENTS.md §2` · `DESIGN.md §4, §7, §8` · `BEHAVIOR.md §4, §5, §8`
- Two-lane separation enforced: a card may declare exactly one lane.
- No emoji · No Tailwind · No raw hex outside the token palette.
- Source-size: index.html ~250 lines, proposal.css ~360 lines, data.js ~570 lines — each under the 700-line gate.
- No edits inside `src/`.
