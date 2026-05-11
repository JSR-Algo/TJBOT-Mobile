<!-- HAND-CURATED. -->
# Lane Ownership — User-Flow Restructure

**Source:** `.omc/plans/flows-modular-restructure.md` §7 (Decision D4: 4-lane split by user journey + Lane Z infra).

**Process model:** five lanes. Lanes A–D run in parallel after Lane Z's Phase 0 lands. Each lane owns disjoint `src/features/<d>/` directories AND disjoint `docs/flows/domains/<d>/flow.md` narrative files. The shared write surface (`nav-graph-data.json` + every generated `docs/flows/*` artefact) is integrated by Lane Z in Phase 1.5 — this is the **single-integrator pattern** (process discipline; no automated gate).

---

## Lane ownership matrix

| Lane | Domains owned | `src/features/` paths (lane-exclusive write) | `docs/flows/domains/` paths (lane-exclusive write — `flow.md` only) | `domain.meta.json` files |
|---|---|---|---|---|
| Lane A — onboarding + auth | onboarding, auth | `src/features/onboarding/`, `src/features/auth/` | `docs/flows/domains/onboarding/flow.md`, `docs/flows/domains/auth/flow.md` | 2 |
| Lane B — learn loop | home, lesson-session, course | `src/features/home/`, `src/features/lesson-session/`, `src/features/course/` | `docs/flows/domains/home/flow.md`, `docs/flows/domains/lesson-session/flow.md`, `docs/flows/domains/course/flow.md` | 3 |
| Lane C — parent + commerce | progress, parent, purchase | `src/features/progress/`, `src/features/parent/`, `src/features/purchase/` | `docs/flows/domains/progress/flow.md`, `docs/flows/domains/parent/flow.md`, `docs/flows/domains/purchase/flow.md` | 3 |
| Lane D — robot + edges | device, robot-mgmt, fallback, course-library | `src/features/device/`, `src/features/robot-mgmt/`, `src/features/fallback/`, `src/features/course-library/` | `docs/flows/domains/device/flow.md`, `docs/flows/domains/robot-mgmt/flow.md`, `docs/flows/domains/fallback/flow.md`, `docs/flows/domains/course-library/flow.md` | 4 |
| Lane Z — infra + integration | (cross-cutting) | `scripts/flows/**`, `App.jsx`, `nav-graph-data.json` (sole writer) | `docs/flows/AGENTS.md`, `docs/flows/README.md`, `docs/flows/global.flow.md`, `docs/flows/shared/navigation.flow.mmd`, `docs/flows/edge-cases/*.flow.mmd`, every GENERATED file under `docs/flows/` | — |

`grep -c "^| Lane [A-DZ] " docs/flows/AGENTS.md` MUST return 5.

---

## Conflict prevention rules

**The single-writer convention for `nav-graph-data.json` is enforced by PROCESS DISCIPLINE, not by an automated gate.** No husky pre-commit hook is wired (decided 2026-05-11). Every lane is responsible for following the rules below; Lane Z's Phase 1.5 re-extract is the trunk-safety mechanism that catches drift.

1. **`nav-graph-data.json` is single-writer.** Lanes A–D MUST NOT commit changes to `nav-graph-data.json` directly. They MAY run `npm run flows:fast` locally for verification, but **stage only** their owned `src/features/<d>/**` files and their owned `docs/flows/domains/<d>/flow.md` files. If `nav-graph-data.json` is staged on a lane-A/B/C/D branch, the PR review MUST request unstaging.
2. **Lane Z is the integrator.** After Lanes A–D land their `src/` changes on trunk, Lane Z runs `npm run flows:all` on the merged trunk and commits the resulting `nav-graph-data.json` + regenerated `docs/flows/` artefacts in a single integration commit (Phase 1.5).
3. **Generated artefacts are Lane-Z-write-only.** `docs/flows/domains/*/flow.mmd`, `docs/flows/domains/*/go-calls.json`, `docs/flows/global.flow.mmd`, `docs/flows/shared/cross-domain.flow.mmd`, `docs/flows/user-flow.md`, `docs/flows/user-flow.html`. Lanes A–D run `npm run flows:fast` locally to preview their domain's regenerated mmd, but DO NOT commit.
4. **Hand-curated files are lane-owned.** `docs/flows/domains/<d>/flow.md` is exclusive to the lane owning `<d>`. `docs/flows/shared/navigation.flow.mmd`, `docs/flows/edge-cases/*.flow.mmd`, and `docs/flows/global.flow.md` are Lane Z exclusive.
5. **`src/features/<d>/states.js`, `index.js`, and `domain.meta.json`** are exclusive to the lane owning `<d>`.
6. **`src/App.jsx`** (router) is Lane Z exclusive.

---

## Mandatory manual workflow (every PR that touches `src/features/**` or `nav-graph-data.json`)

1. From `tbot-design/`: `npm run flows:fast`
2. Review the diff. If your branch is a lane-A/B/C/D branch:
   - **Allowed:** `src/features/<your-domain>/**`, `docs/flows/domains/<your-domain>/flow.md`
   - **Forbidden:** `nav-graph-data.json`, anything under `docs/flows/domains/*/{flow.mmd,go-calls.json}`, `global.flow.mmd`, `shared/cross-domain.flow.mmd`, `user-flow.md`. **Unstage them before commit.**
3. If your branch is `lane-z-*` or trunk-integration, the full delta is yours to commit.
4. Before push: re-run `npm run flows:fast` once more. Validator MUST exit 0.
5. (Optional, expensive) `npm run flows:render` to refresh `user-flow.html` (chromium ~170MB; not required per-PR — Lane Z runs it during Phase 1.5).

If two lanes both modified the same `nav-graph-data.json` indirectly (via overlapping state-id renames), Lane Z's Phase 1.5 re-extract is the rebase mechanism: re-run `npm run flows:all` on merged trunk and commit the deterministic result.

---

## Undeclared targets to resolve

**Status: 0 undeclared targets remaining (resolved 2026-05-11 in T10).**

History: extractor found exactly 1 undeclared target ID (`home`, 30 call sites across 23 files) at Phase 0 bootstrap. T10 resolved by redirecting all `go('home')` → `go('home_hub_idle')` (the canonical home state in `src/features/home/states.js`). This Page-body edit is the single sanctioned exception per plan §10.3 step 16 + AC15. Resolution commit: see git log for the T10 close-out commit.

If a new undeclared target appears in a future run of `npm run flows:extract`, the extractor will:
1. synthesize a placeholder state record (`f: "(undeclared)"`, `g: "Undeclared"`, default `kind: "happy"`),
2. include it in `nav-graph-data.json` so the validator continues to pass,
3. group it under `Undeclared` in `nav-graph-data.json.groups` for visibility.

The fix path is the same as T10's: either (a) register a real state in `src/features/<d>/states.js` + wire the Page in `index.js`, or (b) redirect the call site in `*Page.jsx` to an existing state.

> **Plan reconciliation:** original plan §10.3 step 16 referenced "the 3 currently-undeclared target IDs" from the stale `user-flow-review.md`. Live extractor scan found exactly **1** (`home`). Plan AC14 amended count-agnostic by team-lead.
