# tbot-design · User Flows

**Status:** restructured 2026-05-11 per `.omc/plans/flows-modular-restructure.md`.

This directory holds the canonical, per-domain user-flow documentation for the
`tbot-design` Vite prototype. The legacy single 1264-line `user-flow.md` has been
archived as `user-flow.md.archive-2026-05-09`; the live `user-flow.md` is now an
INDEX (≤200 lines) regenerated from `nav-graph-data.json`.

---

## Source of truth

`tbot-design/nav-graph-data.json` is the **single canonical store** for every
state, transition, and group in the prototype. Each state record carries:

| field | meaning |
|---|---|
| `f`     | source file (relative to `tbot-design/`) where the state's Page lives |
| `title` | human-readable label used as the mermaid node text |
| `g`     | nav-graph group label, used as the mermaid `subgraph` label |
| `kind`  | `"happy"` (default) or `"edge"` — drives validator + node colour |

`kind: "edge"` states MUST also be listed in their owning domain's
`src/features/<d>/domain.meta.json` `edge_cases` map, mapped to one or more
template names from the closed set `{error, retry, cancel, timeout, validation,
unauthorized}`. The four documented happy-path exemptions are
`pr_confirm`, `cl_unlock_confirm`, `onb_intro_retry`, `dv_pair_first_lesson` —
these MUST stay `kind: "happy"` (or omit) and have empty `edge_cases[]`.

---

## Generator pipeline

```
src/features/**/*.jsx ──► extract ──► nav-graph-data.json ──► generate ──► docs/flows/{global,shared,domains}/*.mmd
                                            │                                  │
                                            └────────► validate ◄──────────────┘
                                                            │
                                                            └─► render ──► docs/flows/user-flow.html
```

Scripts (all node-only, no runtime deps; mermaid-cli is devDep used only by
`flows:render`):

| Step | Script | Effect |
|---|---|---|
| extract  | `scripts/flows/extract-go-calls.mjs`     | walk `src/features/**` for `go('literal')` calls; rebuild `edges` deterministically; preserve `title` + `kind` |
| generate | `scripts/flows/generate-domain-flows.mjs`| emit `docs/flows/{domains/<d>/{flow.generated.mmd,calls.generated.json}, shared/cross-domain.flow.mmd, global.generated.mmd, user-flow.md}` |
| validate | `scripts/flows/validate-go-calls.mjs`    | schema check + edge target resolves + src-coverage + generated-sha + cross-domain exclusivity + edge-meta + happy-path exemptions + lane-write protocol |
| render   | `scripts/flows/render-html.mjs`          | mmd → SVG → combined `docs/flows/user-flow.html` (chromium, slow) |

npm scripts (run from `tbot-design/`):

| script | runs |
|---|---|
| `npm run flows:extract`  | `extract`  |
| `npm run flows:generate` | `generate` |
| `npm run flows:validate` | `validate` |
| `npm run flows:render`   | `render`   |
| `npm run flows:fast`     | `extract` → `generate` → `validate` (no chromium) |
| `npm run flows:all`      | `flows:fast` → `render` |

`flows:generate` accepts `--check` to assert no diff without writing (useful for
CI / manual review).

---

## Per-domain dir layout

```
docs/flows/domains/<domain>/
├─ flow.generated.mmd     GENERATED (overwritten by flows:generate)
├─ calls.generated.json   GENERATED (overwritten by flows:generate)
└─ README.md              HAND-CURATED — owned by the lane that owns <domain>;
                          generator NEVER reads or writes this file.
```

The `.generated.*` suffix makes generated artefacts visually distinct from hand-curated files (renamed 2026-05-11 from `flow.mmd`/`go-calls.json`/`flow.md` to eliminate the `flow.mmd` vs `flow.md` 1-char-distance confusion that mis-led tab-completion).

Generated `.mmd` files start with `%% GENERATED FROM nav-graph-data.json sha=<hex>. Do not edit by hand.` (mermaid line comment so mmdc parses cleanly).
Generated `.md`/`.json`/`.html` files start with `<!-- GENERATED FROM nav-graph-data.json sha=<hex>. Do not edit by hand. -->` (HTML comment).
Hand-curated `.mmd` files start with `%% HAND-CURATED.`.
Hand-curated `.md` files start with `<!-- HAND-CURATED. -->`.

---

## Single-integrator pattern (process discipline, no auto gate)

By user decision (2026-05-11), there is **no husky pre-commit hook**. The flow
restructure relies on PROCESS DISCIPLINE:

1. **Lanes A–D MUST NOT stage `nav-graph-data.json` or any generated file
   under `docs/flows/`.** They run `npm run flows:fast` locally to preview, but
   commit only `src/features/<their-domain>/**` and
   `docs/flows/domains/<their-domain>/README.md`.
2. **Lane Z is the sole writer of `nav-graph-data.json` and every generated
   artefact.** After lanes A–D land on trunk, Lane Z runs `npm run flows:all`
   on the merged trunk and commits the deterministic result in a single
   integration commit (Phase 1.5).
3. **PR review MUST reject** any lane-A/B/C/D PR that stages forbidden files.
   The validator's `lane-write` check catches this when run on a lane branch
   (it inspects the current branch name + git stage).

See `docs/flows/AGENTS.md` for the full lane ownership matrix and conflict-
prevention rules.

---

## Mandatory manual workflow

Before every push that touches `src/features/**` or `nav-graph-data.json`:

```bash
cd tbot-design
npm run flows:fast        # extract + generate + validate; ~1s; exits non-zero on failure
git status                # confirm only your owned files are staged
```

If you are on a lane branch, re-check your stage:
- allowed: `src/features/<your-domain>/**`, `docs/flows/domains/<your-domain>/README.md`
- forbidden: `nav-graph-data.json`, `docs/flows/domains/*/{flow.generated.mmd,calls.generated.json}`, `global.generated.mmd`, `shared/cross-domain.flow.mmd`, `user-flow.md`, `user-flow.html`

---

## Rebuilding the rendered HTML

```bash
cd tbot-design
npm run flows:render      # ~30-60s on first run (chromium); writes docs/flows/user-flow.html
```

`flows:render` is intentionally absent from the day-to-day `flows:fast` loop
because chromium is ~170MB and ~30-60s. Lane Z refreshes `user-flow.html`
during Phase 1.5 integration.

---

## Where things live

- `nav-graph-data.json` — canonical store (`tbot-design/nav-graph-data.json`)
- `scripts/flows/*` — extractor, validator, generator, renderer, schemas
- `scripts/flows/schema/{nav-graph,domain-meta}.schema.json` — JSON Schemas
- `scripts/flows/lib/{repo,json-validate}.mjs` — shared helpers
- `docs/flows/global.generated.mmd` — GENERATED domain-level overview
- `docs/flows/global.md` — HAND-CURATED narrative wrapping `global.generated.mmd`
- `docs/flows/user-flow.md` — GENERATED INDEX linking to per-domain docs
- `docs/flows/user-flow.md.archive-2026-05-09` — frozen pre-restructure snapshot
- `docs/flows/shared/cross-domain.flow.mmd` — GENERATED cross-domain edges
- `docs/flows/shared/navigation.flow.mmd` — HAND-CURATED global nav rules
- `docs/flows/edge-cases/*.flow.mmd` — 6 HAND-CURATED reusable templates
- `docs/flows/domains/<d>/{flow.mmd,go-calls.json,flow.md}` — per-domain
- `src/features/<d>/{states.js,index.js,domain.meta.json}` — domain code

---

## Domain-prefix registry

| Prefix | Domain | Owner Lane |
|---|---|---|
| `onb_*`        | onboarding     | A |
| (`onb_login*`, `onb_child` historically share `onb_*` prefix) | auth | A |
| `home_hub_*`   | home           | B |
| (`lesson_*`, `connecting`, `greeting`, `activity_*`, `success`, `gentle`, `retry`, `silence`, `offtopic`, `bargein`, `audio_error`, `safety`, `exit_confirm`, `reconnecting`) | lesson-session | B |
| `course`/`level`/`unit`/`lesson_detail`/`daily_mission`/`review_entry` | course | B |
| `lesson_summary`/`celebration`/`review_needed` | progress | C |
| `parent_*`     | parent         | C |
| `pr_*`         | purchase       | C |
| `dv_*`/`pair_*`/`lcd_*` | device | D |
| `rm_*`         | robot-mgmt     | D |
| `cl_*`         | course-library | D |
| `network_error`/`audio_recovery`/`mic_missing`/`lesson_resume`/`kid_settings`/`help_faq`/`app_error`/`home_hub_offline` | fallback | D |

New domains MUST claim a prefix here before adding states.

---

## Live viewer (devtool)

```bash
npm run dev
```

Open the dev server, click the **Nav Map** pill at the top of the canvas. The
graph view (today: root `nav-map.jsx`; eventually `src/devtools/NavMap.jsx`
per Track 10) reads `nav-graph-data.json` at runtime — no rebuild needed.

The **Interactive** pill exposes a jump-to side panel listing every screen.

---

## See also

- `docs/flows/AGENTS.md` — lane ownership matrix + conflict-prevention rules
- `docs/architecture/README.md` — domain map + state file pointers (separate doc tree)
- `nav-graph-data.json` — live graph
- `.omc/plans/flows-modular-restructure.md` — driving plan
