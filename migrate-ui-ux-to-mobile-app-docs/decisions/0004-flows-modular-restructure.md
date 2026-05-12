# 0004 Flows Modular Restructure

Date: 2026-05-11

## Status

Accepted

## Context

The `tbot-design` Vite prototype had a single 1264-line `docs/flows/user-flow.md` capturing every screen, group, and edge by hand. The artefact was already 2 days stale on creation; the live `nav-graph-data.json` (and the actual `go()` calls in `src/features/**`) had drifted from the snapshot. With 12 src domains, 121 screens, 263 edges, and 4 parallel agent lanes about to run Phase 1, a single hand-curated source of truth would not survive the merge load. We needed:

- a single canonical store for screens + transitions,
- per-domain artefacts that can be reviewed independently,
- a generator that converts the store into per-domain `.mmd` + a global overview deterministically,
- a validator that catches drift,
- an agent ownership model that prevents merge conflicts on shared files.

Backend wiring was out of scope: every `src/services/api/*.api.js` throws `not implemented`, and `docs/erd/`, `docs/api/` are TBD. Backend mapping is deferred until a real backend lands.

**Scope statement:** This restructure is local to `tbot-design/`. It does NOT mirror into TBOT-root `packages/shared-data/src/content/tasks.json` — the cross-repo task lifecycle there governs product/system work, not local design-doc tooling (see plan §10.7 P4).

## Decision

Five locked decisions (plan §0):

| # | Decision | Choice |
|---|---|---|
| D1 | Source-of-truth direction | Generated from `nav-graph-data.json` |
| D2 | Backend mapping per flow | Skipped (revisit when backend lands) |
| D3 | Restructure scope | Docs + generator + validator + targeted `src/` refactor (`states.js`, `index.js`, `domain.meta.json`) only — no `*Page.jsx` body edits except T10 close-out exception (§10.3 step 16) |
| D4 | Agent ownership | 4 lanes by user-journey (A onboarding+auth · B home+lesson-session+course · C progress+parent+purchase · D device+robot-mgmt+fallback+course-library) + Lane Z (infra + integration) |
| D5 | Domain axis | 12 `src/features/<domain>/` is canonical; 15 nav-graph `g` values become mermaid `subgraph` labels INSIDE the owning domain's `.mmd` |

**No-gate amendment (2026-05-11):** Trunk safety relies on PROCESS DISCIPLINE rather than a husky pre-commit hook. The git toplevel is `tbot-mobile/` (parent of `tbot-design/`); installing husky there for one sub-tree's gating crossed the standalone-scope boundary. Lanes A–D agree to NOT stage `nav-graph-data.json` or any generated `docs/flows/*` artefact; Lane Z's Phase 1.5 re-extract is the rebase-time deterministic re-write. The validator's `lane-write` check still runs but is warn-only (writes to stderr, exits 0).

**AC13 marker amendment (2026-05-11):** Generated/hand-curated mermaid files use `%% comment` syntax as their first-line marker, NOT `<!-- HTML comment -->`. mmdc rejects HTML comments before the diagram declaration with `UnknownDiagramError`. Markdown files (.md) keep HTML comments. New constants in `scripts/flows/lib/repo.mjs`: `MERMAID_GENERATED_HEADER_*` + `MERMAID_HAND_CURATED_HEADER`.

## Alternatives Considered

(plan §0 "Rejected alternatives" table)

1. **D1 alternative** — hand-curated per-domain `.mmd`. Rejected: drift-prone unless CI gate added; with the no-gate amendment the drift would be unbounded. Generator-only wins on simplicity for a 122-node graph.
2. **D1 alternative** — hybrid skeleton + overlay. Rejected: two-file-per-domain doubles surface area; merge-at-render-time adds a step.
3. **D4 alternative** — 3-lane split (infra/content/refactor). Rejected: would re-introduce hot-file contention on `nav-graph-data.json` because Lane Z already covers infra.
4. **D4 alternative** — 12-lane (one per domain). Rejected: maximum parallelism but high contention on shared `App.jsx`, `nav-graph-data.json`, generator. Coordination overhead > parallelism gain on this prototype.
5. **D4 alternative** — sequential single-agent. Rejected: safest but slowest; user explicitly chose 4-lane.
6. **D5 alternative** — per-group split (15 domains following nav-graph `g`). Rejected: misaligns flow ownership from src ownership; would force 5-way split inside `src/features/lesson-session/`.
7. **D5 alternative** — pure `g`-field grouping (ignore src structure). Rejected: severs flow→code traceability; agent lanes would not match `src/features/<d>/` ownership.
8. **No-gate alternative** — install husky at `tbot-mobile/` git toplevel + add a hook that `cd tbot-design && npm run flows:fast`. Rejected: crosses repo-scope boundary; tbot-mobile is the React Native app, tbot-design is a Vite design prototype subtree; one shouldn't gate on the other's tooling.
9. **No-gate alternative** — GitHub Actions workflow. Rejected for now: tbot-design has no existing CI; adding one for one tooling chain is heavier than the manual `npm run flows:fast` workflow currently warrants. Revisit when CI lands for other reasons.
10. **AC13 alternative** — keep HTML markers + run mmdc with `--strict false` or a preprocessing step that strips the first-line HTML comment. Rejected: opaque hack vs. one-character-prefix change; mermaid `%%` is the documented native comment syntax.

## Consequences

### Positive

- **Zero drift risk** — `nav-graph-data.json` is the single source; per-domain `.mmd` and `go-calls.json` regenerate deterministically. Idempotency proven by `npm run flows:fast` × 2 → identical sha.
- **Parallelism** — 4 lanes ran concurrently (T5 lane-A, T6 lane-B, T7 lane-C, T8 lane-D); disjoint `src/features/<d>/` + disjoint `docs/flows/domains/<d>/flow.md` ownership prevented merge conflicts in 4-worktree dry-run (T4).
- **Reviewability** — 12 domain dirs (~30-100 lines each `flow.mmd`) replace one 1264-line file.
- **Agent traceability** — `src/features/<d>/domain.meta.json` records `owner_lane` + `flow` path + `edge_cases` map; future agents can find ownership and edge-case templates without re-reading the plan.
- **Backward-compat via Lane Z integrator** — even when a lane violates single-writer (8b29223 lane-c bundled my Phase 0), Lane Z's Phase 1.5 re-extract recovers determinism.

### Tradeoffs

- **No automatic gate** — drift COULD reappear if a lane forgets to run `npm run flows:fast` before push. Mitigated by: (a) clear AGENTS.md workflow, (b) Lane Z Phase 1.5 re-extract, (c) future revisit if CI/husky lands at TBOT-mobile root for other reasons.
- **Page-body edit exception (T10)** — plan AC15 says "no edits land in `*Page.jsx`"; T10 close-out had to rewrite 30 `go('home')` → `go('home_hub_idle')` callsites across 23 files. Documented as the only sanctioned exception (plan §10.3 step 16); not a slippery slope precedent.
- **Generator + extractor maintenance burden** — six new modules (1278 LOC) to maintain. Mitigated by: scope-locked under 500 LOC each per file, pure ESM, node-only runtime deps (mermaid-cli is devDep used only by `flows:render`).
- **Marker syntax bifurcation** — `.mmd` uses `%%`, `.md` uses `<!-- -->`. Validator handles both. New code must remember which to emit. Constants in `lib/repo.mjs` make this a one-line lookup.

## Follow-Up

- **Backend mapping (D2 revisit)**: when a real backend lands, add `domains/<d>/backend.md` per domain dir, generated from a future `docs/api/openapi.yaml` + endpoint→`go()`-trigger registry. Existing `domains/<d>/go-calls.json` (generated artefact) gives the call sites where API hooks must wire.
- **Gate strategy revisit**: if husky/CI lands at `tbot-mobile/` root for other reasons (unit test gating, lint), evaluate whether `flows:fast` should also gate. Today's no-gate decision is contingent on no CI being available.
- **`.omc/plans/flows-modular-restructure.md` is the driving plan** — DO NOT delete; ADR points back at it. AC14 (originally cited "3 undeclared targets") was amended count-agnostic by team-lead during T2.
- **`tbot-design/AGENTS.md` (top-level harness file)** updated by T10 step 5 with a `## Flow ownership` pointer to `docs/flows/AGENTS.md`.
