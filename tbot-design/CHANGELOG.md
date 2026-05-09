# CHANGELOG — Cleanup pass (mobile-only, flow-only)

Executed `docs/master-prompts/CLEANUP-mobile-only.md`. Single pruning pass, no redesign.

## Files deleted

**LCD / firmware doc surfaces — out of mobile scope**
- `lcd-face.jsx`, `lcd-face-v2.jsx`, `lcd-lesson.jsx`, `lcd-system.jsx`, `lcd-v2.jsx`

**Design-system & route-doc pages — not on user flow**
- `design-system.jsx` (swatch / type-spec page)
- `paths.jsx` (route documentation page)

**Variant decks — superseded by runtime i18n + tokens**
- `vn-features.jsx` (dual-theme exploration; gender + locale now driven by `tokens.css` + `i18n.js`)

**Stale duplicates / planning docs**
- `design-tokens.css` (duplicate of `tokens.css`; never imported by `index.html`)
- `i18n-audit.md` (audit superseded by code in `locales/` + `scripts/i18n/`)
- `docs/i18n/STEP-1-PR.md`, `STEP-2-P0-PR.md`, `STEP-2-P1-PR.md`, `STEP-2-P2-PR.md` (all committed; PR notes no longer load-bearing)

**Uploads — source material, none referenced from any surviving file**
- `uploads/G2 Onboarding Flow.html`, `uploads/TBOT Robot English.html`
- `uploads/screens-1-onboarding-home.jsx`, `screens-2-lesson-course.jsx`, `screens-3-progress-parent.jsx`, `screens-4-errors-system.jsx`, `screens-g2-onboarding.jsx`
- `uploads/design-canvas.jsx`, `design-tokens.css`, `ios-frame.jsx`, `robot.jsx`, `tb-components.jsx`, `tweaks-panel.jsx` (dupes of root files)
- `scraps/` (empty / scratch)

## Files updated

**`index.html`**
- Removed `<script>` tags for: lcd-face, lcd-system, lcd-lesson, lcd-face-v2, lcd-v2, vn-features, design-system, paths.
- Removed view-selector buttons: Paths, Design System, LCD Faces, LCD Lesson, LCD v2 ★, VN ★.
- Tweaks panel pruned: dropped `intensity`, `textSize` (no surviving consumer).
- View modes now: `canvas` · `proto` only.

## Files kept (24 → 19 jsx + supports)

| Group | File | Status |
|---|---|---|
| Shell | `index.html`, `tokens.css`, `i18n.js` | KEEP |
| Frame | `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx` | KEEP |
| Shared | `robot.jsx`, `tb-components.jsx` | KEEP |
| Onboarding | `onboarding.jsx` | KEEP |
| Home | `home.jsx` | KEEP |
| Lesson Player | `screens.jsx` | KEEP |
| Course | `course.jsx` | KEEP |
| Progress | `progress.jsx` | KEEP |
| Parent | `parent.jsx` | KEEP |
| Fallback | `fallback.jsx` | KEEP |
| Device | `device.jsx` | KEEP |
| Course Library | `course-library.jsx` | KEEP |
| Purchase | `purchase.jsx` | KEEP |
| Robot Mgmt | `robot-mgmt.jsx` | KEEP |
| i18n | `locales/{en,vi}.json`, `scripts/i18n/*` | KEEP |
| Master prompt | `docs/master-prompts/CLEANUP-mobile-only.md` | KEEP |

## Deferred — known issues, not touched in this pass

Per master-prompt rule "only delete, do not redesign":

- **Per-screen registry trim.** Each surviving `*_STATES` / `*_SCREEN_MAP` still contains every variant currently defined (e.g. all 12 pairing frames, all 12 purchase frames, etc.). The canonical-flow KEEP list narrows these further. Deferred to a separate pass — touching surviving registries risks breaking `go()` targets across files.
- **Hardcoded `'#FF6F61'` fallbacks** in `device.jsx`, `course-library.jsx`, `purchase.jsx`, `robot-mgmt.jsx` (~55 occurrences). Should resolve to `var(--coral)` so gender theme applies. Tracked separately as "PR 1 — Theme axis fix."
- **i18n catalog growth.** `locales/{en,vi}.json` at 220/220 keys; full coverage requires Step 2 P3–P5. Tracked in master-prompts.
- **`i18n.js` still loads inline `DICT`** rather than `locales/*.json`. Tracked in Step 1 PR notes (now deleted; carried here): wire-up deferred to Step 4 verification pass.

## Smoke check

- `index.html` first-load: no console errors, both views (`canvas`, `proto`) render.
- `i18n.js` legend (top-right) still functional: lang VI / VI+EN / EN, gender Girl / Boy.
- All `<script>` srcs in `index.html` resolve to existing files.
