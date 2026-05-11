<!-- HAND-CURATED. -->
# Lane Ownership — User-Flow Restructure

**Source:** `.omc/plans/flows-modular-restructure.md` §7 (Decision D4: 4-lane split by user journey + Lane Z infra).

**Process model:** five lanes. Lanes A–D run in parallel after Lane Z's Phase 0 lands. Each lane owns disjoint `src/features/<d>/` directories AND disjoint `docs/flows/domains/<d>/README.md` narrative files. The shared write surface (`nav-graph-data.json` + every generated `docs/flows/*` artefact) is integrated by Lane Z in Phase 1.5 — this is the **single-integrator pattern** (process discipline; no automated gate).

---

## Lane ownership matrix

| Lane | Domains owned | `src/features/` paths (lane-exclusive write) | `docs/flows/domains/` paths (lane-exclusive write — `flow.md` only) | `domain.meta.json` files |
|---|---|---|---|---|
| Lane A — onboarding + auth | onboarding, auth | `src/features/onboarding/`, `src/features/auth/` | `docs/flows/domains/onboarding/README.md`, `docs/flows/domains/auth/README.md` | 2 |
| Lane B — learn loop | home, lesson-session, course | `src/features/home/`, `src/features/lesson-session/`, `src/features/course/` | `docs/flows/domains/home/README.md`, `docs/flows/domains/lesson-session/README.md`, `docs/flows/domains/course/README.md` | 3 |
| Lane C — parent + commerce | progress, parent, purchase, course-library | `src/features/progress/`, `src/features/parent/`, `src/features/purchase/`, `src/features/course-library/` | `docs/flows/domains/progress/README.md`, `docs/flows/domains/parent/README.md`, `docs/flows/domains/purchase/README.md`, `docs/flows/domains/course-library/README.md` | 4 |
| Lane D — robot + edges | device, robot-mgmt, fallback | `src/features/device/`, `src/features/robot-mgmt/`, `src/features/fallback/` | `docs/flows/domains/device/README.md`, `docs/flows/domains/robot-mgmt/README.md`, `docs/flows/domains/fallback/README.md` | 3 |

> **Re-balanced 2026-05-11**: `course-library` moved D→C (architect's recommendation). Rationale: course-library is commerce-adjacent and pairs naturally with purchase (which already lives in C). Result: A=2, B=3, C=4, D=3 — load is more even, and the C cluster (commerce: purchase + course-library) + Lane A (entry: onboarding + auth) read as coherent user-journey units.
| Lane Z — infra + integration | (cross-cutting) | `scripts/flows/**`, `App.jsx`, `nav-graph-data.json` (sole writer) | `docs/flows/AGENTS.md`, `docs/flows/README.md`, `docs/flows/global.md`, `docs/flows/shared/navigation.flow.mmd`, `docs/flows/edge-cases/*.flow.mmd`, every GENERATED file under `docs/flows/` | — |

`grep -c "^| Lane [A-DZ] " docs/flows/AGENTS.md` MUST return 5.

---

## Conflict prevention rules

**The single-writer convention for `nav-graph-data.json` is enforced by PROCESS DISCIPLINE, not by an automated gate.** No husky pre-commit hook is wired (decided 2026-05-11). Every lane is responsible for following the rules below; Lane Z's Phase 1.5 re-extract is the trunk-safety mechanism that catches drift.

1. **`nav-graph-data.json` is single-writer.** Lanes A–D MUST NOT commit changes to `nav-graph-data.json` directly. They MAY run `npm run flows:fast` locally for verification, but **stage only** their owned `src/features/<d>/**` files and their owned `docs/flows/domains/<d>/README.md` files. If `nav-graph-data.json` is staged on a lane-A/B/C/D branch, the PR review MUST request unstaging.
2. **Lane Z is the integrator.** After Lanes A–D land their `src/` changes on trunk, Lane Z runs `npm run flows:all` on the merged trunk and commits the resulting `nav-graph-data.json` + regenerated `docs/flows/` artefacts in a single integration commit (Phase 1.5).
3. **Generated artefacts are Lane-Z-write-only.** `docs/flows/domains/*/flow.generated.mmd`, `docs/flows/domains/*/calls.generated.json`, `docs/flows/global.generated.mmd`, `docs/flows/shared/cross-domain.flow.mmd`, `docs/flows/user-flow.md`, `docs/flows/user-flow.html`. Lanes A–D run `npm run flows:fast` locally to preview their domain's regenerated mmd, but DO NOT commit.
4. **Hand-curated files are lane-owned.** `docs/flows/domains/<d>/README.md` is exclusive to the lane owning `<d>`. `docs/flows/shared/navigation.flow.mmd`, `docs/flows/edge-cases/*.flow.mmd`, and `docs/flows/global.md` are Lane Z exclusive.
5. **`src/features/<d>/states.js`, `index.js`, and `domain.meta.json`** are exclusive to the lane owning `<d>`.
6. **`src/App.jsx`** (router) is Lane Z exclusive.

---

## Mandatory manual workflow (every PR that touches `src/features/**` or `nav-graph-data.json`)

1. From `tbot-design/`: `npm run flows:fast`
2. Review the diff. If your branch is a lane-A/B/C/D branch:
   - **Allowed:** `src/features/<your-domain>/**`, `docs/flows/domains/<your-domain>/README.md`
   - **Forbidden:** `nav-graph-data.json`, anything under `docs/flows/domains/*/{flow.generated.mmd,calls.generated.json}`, `global.generated.mmd`, `shared/cross-domain.flow.mmd`, `user-flow.md`. **Unstage them before commit.**
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

---

## Untracked-files policy (C6 — added 2026-05-11)

**Pre-existing prototype state**: `src/features/<d>/*Page.jsx` (127 files across 12 domains) + `src/App.jsx` + `src/devtools/` + `src/design-system/` + `src/config/` are intentionally **untracked** in this branch (`new-design`). They predate this flow restructure; the team's plan did not bring them under version control because (a) it was out of scope, (b) lane workers only needed to touch `src/features/<d>/states.js` + `domain.meta.json` (both tracked + committed).

**Implications:**

- T10's `go('home')` → `go('home_hub_idle')` redirect (30 call sites across 23 Page.jsx files) was applied to **untracked** files. The redirect lives on disk but not in git.
- A future `git clean -df` or `git checkout .` could lose the redirect.
- An external import of the prototype repo would re-introduce the `home` undeclared target if it brings back the original Page.jsx contents.

**Mitigations:**

1. **Phase 1.5 re-extract catches regressions.** Lane Z's `npm run flows:fast` rescans `src/features/**/*.jsx` and flags any reappearance of `go('home')` as an undeclared target (`flows:validate` exits 1). This is the trunk-safety mechanism.
2. **Document, don't gate.** Flow validator's `undeclared-targets` check is the runtime gate; this section is the human-readable contract.
3. **When the prototype gets committed in a future branch**, the Page.jsx redirects MUST be preserved (run `grep -rn "go('home')" src/features --include='*.jsx'` before committing — should return zero). Add a commit message note acknowledging T10's redirect work.

**Sanctioned exceptions to AC15** ("no Page.jsx body edits"):
- T10's `home` redirect (one-time, documented in plan §10.3 step 16).
- Any future undeclared-target resolution following the (a)/(b) fix path above.
