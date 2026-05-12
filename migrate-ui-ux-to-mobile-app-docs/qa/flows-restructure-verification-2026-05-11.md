# Verification Report — Flows Modular Restructure

**Date:** 2026-05-11
**Branch:** new-design
**Plan:** `.omc/plans/flows-modular-restructure.md`
**ADR:** `docs/decisions/0004-flows-modular-restructure.md`

## Summary

**17/17 ACs PASS.**

Original plan §10.2 lists 17 acceptance criteria (AC1–AC17, with AC5 split into AC5a/AC5b/AC5c). Two were amended after the 2026-05-11 user decision to drop husky:
- **AC11** — original required `.husky/pre-commit` + `.husky/pre-push`. Amended: husky removed; replaced by manual `npm run flows:fast` workflow documented in `docs/flows/AGENTS.md` + `docs/flows/README.md`.
- **AC16** — original required husky pre-commit reject of `nav-graph-data.json` staging on lane-A/B/C/D branches. Amended: validator's `lane-write` check is warn-only (writes to stderr, exits 0). Process discipline + Lane Z Phase 1.5 re-extract are the trunk-safety mechanisms.

## AC pass table

| # | AC | Status | Evidence |
|---|---|---|---|
| AC1  | nav-graph-data.json validates against schema (incl. kind enum) | PASS | `node scripts/flows/validate-go-calls.mjs --schema-only` → `[validate] schema(nav-graph): OK; schema(domain-meta): OK` |
| AC2  | extractor idempotent: full sort tuple | PASS | `npm run flows:extract` x2 → identical sha `bae0c96c867a0c70aeb7f11080d639ad29f55021` |
| AC3  | generator idempotent over GENERATED files only | PASS | `npm run flows:generate` x2 → identical tree-checksum (excluding flow.md) `af6ef70e521be8c880e6d341b89ecae4ec2225cb` |
| AC4  | validator exits non-zero on missing target | PASS | seed `go('ac4_probe_target_xyz')` in SplashPage → `npm run flows:fast` exit 1 with message `[undeclared-targets] state "ac4_probe_target_xyz" is a synthesized placeholder...` |
| AC5a | each domain dir contains flow.mmd + go-calls.json | PASS | `for d in docs/flows/domains/*/; do test -f $d/flow.mmd && test -f $d/go-calls.json; done` exits 0 (12/12 domains) |
| AC5b | each domain dir contains flow.md with HAND-CURATED marker | PASS | `head -n1` on each `flow.md` matches "HAND-CURATED" (12/12 domains; lanes A-D + lane-z bootstrap) |
| AC5c | generator does NOT write flow.md (mtime preserved) | PASS | `touch -t 202401010101 docs/flows/domains/onboarding/flow.md`; mtime=1704045660; `npm run flows:generate`; mtime still 1704045660 |
| AC6  | generated mmd headers carry sha matching nav-graph sha | PASS | `node scripts/flows/validate-go-calls.mjs --check-generated` → `generated-sha(15 files): OK` |
| AC7  | shared/cross-domain.flow.mmd lists every cross-domain edge once; no domain mmd refs foreign state | PASS | `node scripts/flows/validate-go-calls.mjs --check-cross-domain` → `cross-domain: OK` |
| AC8  | 6 edge-case templates exist with HAND-CURATED marker | PASS | `for n in error retry cancel timeout validation unauthorized; do test -f docs/flows/edge-cases/$n.flow.mmd && head -n1 ... grep -q HAND-CURATED; done` exits 0 |
| AC9  | each src/features/<d>/domain.meta.json validates against domain-meta.schema.json | PASS | manual JSON-Schema check across 12 domains: id, owner_lane ∈ {A,B,C,D}, flow path, edge_cases map all present + valid |
| AC10 | docs/flows/AGENTS.md documents 4-lane matrix | PASS | `grep -c "^| Lane [A-DZ] " docs/flows/AGENTS.md` = 5 ; `grep -q "single-writer"` → present |
| AC11 | (AMENDED 2026-05-11) | PASS-amended | husky removed (no `.husky/`, no `prepare` script, no devDep); manual workflow documented in docs/flows/README.md "Mandatory manual workflow" section |
| AC12 | user-flow.md ≤ 200 lines AND archive present | PASS | `wc -l docs/flows/user-flow.md` = 39 (≤200); `test -f docs/flows/user-flow.md.archive-2026-05-09` exists |
| AC13 | mermaid-cli parses every .mmd under docs/flows/ | PASS | `for f in $(find docs/flows -name '*.mmd'); do npx mmdc -i $f -o /tmp/check.svg; done` → 0 failures across 21 files. **Required AC13 fix:** generator switched from `<!-- ... -->` HTML comment to `%% ... ` mermaid comment for first-line marker (committed 9acafb5). |
| AC14 | all undeclared target IDs resolved | PASS | live count: 0 undeclared targets in nav-graph-data.json. Original `home` target (30 callsites, 23 files) resolved by T10 redirect → `home_hub_idle`. Plan AC14 amended count-agnostic per team-lead (was originally "3"). |
| AC15 | no edits in *Page.jsx page bodies | PASS-with-exception | 0 modifications to tracked Page.jsx (`git status` count=0). T10's 23 file redirects (`go('home')` → `go('home_hub_idle')`) are in UNTRACKED Page.jsx files (lanes never tracked them); per plan §10.3 step 16 + AC16 these target-string-only edits are the single sanctioned exception. |
| AC16 | (AMENDED 2026-05-11) | PASS-amended | validator's `lane-write` check is warn-only — `grep -c "lane-write WARNINGS" scripts/flows/validate-go-calls.mjs` = 1 (warn-only branch present). Process discipline documented in docs/flows/AGENTS.md "Conflict prevention rules" + docs/flows/README.md "Mandatory manual workflow". |
| AC17 | 4 happy-path exemptions carry kind:"happy" + empty edge_cases | PASS | `node scripts/flows/validate-go-calls.mjs --check-edge-exemptions` → `edge-exemptions: OK`. Verified states: `pr_confirm`, `cl_unlock_confirm`, `onb_intro_retry`, `dv_pair_first_lesson`. |

## Trunk timeline

```
6970b1c i18n(phase-11): JSON locales wire-up + persona resolver + 0 leaks closure  (base)
cf10f90 feat(flows/lane-d): Phase 1 — device + robot-mgmt + fallback + course-library  (T8)
12c3648 feat(lane-b): Phase 1 — home + lesson-session + course states.js kind tags  (T6)
137e267 feat(flows/lane-a): Phase 1 — onboarding + auth kind tags + domain.meta.json  (T5)
8b29223 feat(flows/lane-c): Phase 1 — progress + parent + purchase domain metadata  (T7; also bundled my Phase 0 — single-writer violation, recovered by T9 re-extract)
d567201 flows(phase-0): generator pipeline + schemas + hand-curated mmds + AGENTS.md  (T1-T4 finalization, 7-file delta)
9acafb5 flows(integrate): regenerate nav-graph + per-domain artefacts after Lanes A-D  (T9 + AC13 fix, 25 files)
<pending>  flows(close-out): resolve undeclared targets + ADR + AGENTS pointer  (T10, this commit)
```

## Final pipeline state

```
$ npm run flows:fast
[flows:extract] {"states":122,"edges":270,"groups":15,"dynamicCalls":6,"orphanSubcomponents":0}
[flows:generate] wrote=0 files (check=false); total=27
[validate] schema(nav-graph): OK
[validate] schema(domain-meta): OK
[validate] edges(target-resolves): OK
[validate] src-coverage: OK
[validate] undeclared-targets(0): OK
[validate] generated-sha(15 files): OK
[validate] cross-domain: OK
[validate] edge-meta: OK
[validate] edge-exemptions: OK
[validate] lane-write(branch=new-design): OK
[validate] ALL CHECKS PASSED
```

10 validator checks (added `undeclared-targets` strict check during T10).

## Counts

- States: 122 (down from 123 placeholder during Phase 0/1)
- Edges: 270
- Groups: 15 (Undeclared group dropped post-T10)
- Domains: 12
- Lanes: 4 (A/B/C/D) + Lane Z
- mmd files: 21 (12 domains + 6 edge-cases + 2 shared + 1 global)
- Markdown narrative files: 14 (12 domains + 1 global + user-flow.md INDEX)
- Generator scripts: 4 (extract, validate, generate, render-html) + 2 lib (repo, json-validate) + 2 schemas

## Outstanding

- None. All 17 ACs pass.
- Backend mapping intentionally deferred per D2 (revisit when backend lands).
- `.husky/` removed per 2026-05-11 user decision (no auto gate).
