# Plan — Use Case Model + File Architecture (tbot-mobile design)

**Status:** DRAFT v3 — post-Critic review (iteration 1/5), pending re-review
**Owner:** omc-plan (consensus mode)
**Plan path:** `tbot-mobile/tbot-design/.omc/plans/usecase-model-mobile.md`
**Date:** 2026-05-11
**Scope:** Mobile design repo only (`tbot-mobile/tbot-design/`). Out of scope: backend services, AI/Voice service internals, firmware OTA pipeline, infra.

---

## 0. RALPLAN-DR Summary

### Principles (5)

1. **Evolve, don't replace.** Existing `docs/architecture/use-case-diagram.md` (**129 UCs**, 11 actors) is canonical for `UC-LL-NN` IDs. There are **13 per-domain `.usecase.puml` files plus 1 overview puml** (14 total under `docs/architecture/usecases/`). The puml axis and the legacy-doc axis are **not identical** — see §1.4. Keep both ID sources; treat puml IDs as alias-only (D2 below). Do not invent IDs.
2. **One file per task-cohort, not per UC.** Per-domain `use-cases.md` is the primary unit. Per-UC files exist **only** for hot UCs (§6.2). Defaults to **~13 base domain docs + 0–17 hot UC files** = ~13–30 markdown bodies plus actors/reference scaffold.
3. **Cite real source paths only — and structurally protect empty cells.** Backend mapping cites existing `src/services/api/<d>.api.js` exports + `src/store/<d>.store.js` actions + `docs/erd/` entities. When a service does not exist, the cell value is the protected sentinel `BACKEND_NOT_DESIGNED` (D3).
4. **`.puml` is the diagram source-of-truth; `.mmd` is generator output.** `.puml` retains full UML semantic vocabulary. `.mmd` mirrors are produced by a one-direction PUML→MMD generator, **deferred to Phase 4** (D4). Until then we ship `.puml` only.
5. **Edge-case coverage is semantic, not link-presence.** Per-domain `edge-cases.md` declares per UC a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` with one-line rationale per chosen mode. Linking to `flows/edge-cases/*.flow.mmd` is informational.

### Decision Drivers (top 3)

1. **Avoid documentation drift.** Single 504-line `use-case-diagram.md` was heading toward `user-flow.md`'s monolith fate (ADR-0004). Per-domain split + cross-reference index breaks the monolith without overshoot.
2. **Backend implementability without invented endpoints.** Every export in `src/services/api/*.api.js` throws `not implemented` (`auth.api.js:2-5`). Without a structurally protected sentinel, agents will hallucinate REST routes.
3. **Multi-agent execution boundaries that match the actual conflict surface.** ADR-0004 lanes A/B/C/D were proven zero-conflict for *single-writer-per-file* `flows/` work. Use-case authoring has cross-domain `<<include>>`/`<<extend>>` edges; cross-domain edges therefore live in a single Lane-Z-owned `cross-domain-edges.json`.

### Locked Decisions (D1–D7)

| # | Decision | Choice |
|---|---|---|
| D1 | File granularity | Per-domain `use-cases.md` primary; per-UC files for hot UCs only |
| D2 | UC ID schema | `UC-LL-NN` from `use-case-diagram.md` is canonical; puml-local IDs (`UC_<PREFIX>_<VERB>`, prefix in `{AUTH, ONB, HUB, CRS, LSN, PRG, PG, PRT, CL, BUY, DP, RM, FB}`) recorded as `aliases: []` per UC |
| D3 | Backend mapping for unbuilt backend | Sentinel `BACKEND_NOT_DESIGNED`; **state-based** rule (HR-6 fix): any non-sentinel cell requires a sibling row in `domains/<d>/backend-mapping.md` *Domain ADR Pointer* column citing `decisions/NNNN-backend-<domain>.md`. CI script `check-backend-sentinel.mjs` enforces state, no git-diff dependency. |
| D4 | Diagram authoring | `.puml` primary; `.mmd` is generator output (Phase 4 deferred); ship `.puml` only initially |
| D5 | Edge-case coverage AC | Semantic enum + rationale, not link-presence; `n/a` ratio per domain ≤ 50% |
| D6 | Cross-domain UC edges | Single source: `reference/cross-domain-edges.json` owned by Lane Z; per-domain files reference IDs only |
| D7 | Lane assignments | Reuse ADR-0004 D4: A=auth+onb, B=hub+lsn+crs, C=prg+pgate+psum+buy, D=dp+dm+rm+cl+fb, Z=infra+actors+reference+ADR |

### Viable Options (≥2)

#### Option A — Per-domain primary + per-UC for hot UCs (RECOMMENDED)

(File-tree unchanged from v2; see §0.A below.)

```
docs/usecases/
  README.md
  ADR-0005-usecase-model-structure.md
  actors/
    child.md, parent.md, guest.md, authenticated-user.md
    external/
      robot-device.md, realtime-voice-service.md, google-oauth.md,
      apple-sign-in.md, payment-provider.md, device-os.md, wifi-network.md
  domains/<domain>/
    use-cases.md
    backend-mapping.md
    edge-cases.md
    diagrams/<domain>.usecase.puml
    hot/UC-XX.md            # optional, hot-UC list governance §6.2
  reference/
    use-case-index.json
    alias-overrides.json    # NEW v3: manual fuzzy-match overrides (HR-5)
    cross-domain-edges.json
    backend-mapping.md      # generated rollup
    multi-agent-execution.md
    clean-architecture-recs.md
    glossary.md
    known-defects.md
    backlog.md              # NEW v3: concrete carry-forward owner+sprint (HR-8)
  diagrams/overview.puml
  templates/
    use-cases.template.md, backend-mapping.template.md, hot-uc.template.md
```

**Pros / Cons:** unchanged from v2.

#### Options B/C/D/E

Rejected; rationale unchanged from v2 §0.

---

## 1. Requirements Summary

(unchanged — see v2 §1)

## 1.4. Domain Axis Reconciliation (NEW v3, fixes HR-2)

Two domain-axis sources exist:

| Axis | Domains | Notes |
|------|---------|-------|
| Legacy `use-case-diagram.md` §2 | 13 | AUTH, ONBOARDING, KID HUB/HOME, COURSE BROWSE, LESSON SESSION, PROGRESS, **PARENT (gated)**, COURSE LIBRARY, PURCHASE FUNNEL, DEVICE PAIRING, **DEVICE MANAGEMENT**, ROBOT MANAGEMENT, FALLBACK |
| `docs/architecture/usecases/*.usecase.puml` | 13 | auth, onboarding, kid-hub, course-browse, lesson-session, progress, **parent-gate**, **parent-summary**, course-library, purchase, device-pairing, robot-mgmt, fallback-shell |

**Discrepancies:**
- Legacy "PARENT (gated)" (7 UCs PR01–PR07) ↔ puml split into `parent-gate` (1 UC = `UC_PG_PASS` ↔ UC-PR01) + `parent-summary` (6 UCs = PR02–PR07) + a shared `UC_PG_UNLOCK` (course-library unlock = UC-CL04).
- Legacy "DEVICE MANAGEMENT" (6 UCs DM01–DM06) has **no puml**. KD5 requires Lane D to author `device-mgmt.usecase.puml` in Phase 0.

**Plan adopts puml axis as the new domain folder structure** — 13 folders under `docs/usecases/domains/` matching the puml file set, plus a 14th `device-mgmt/` folder added by Lane D for KD5 parity. Final folder count: **14** (13 from puml + 1 new = 14, matching the union of both axes).

## 1.5. Known-Defect Inheritance

(All KD entries from v2 retained; KD13 fix below.)

| # | Defect | Carry-forward (v3) |
|---|--------|-------------------|
| KD1 | UC-A06 `<<UNDEFINED>>` | **(HR-8 fix)** Concrete entry in `reference/backlog.md`: owner=Lane A, target=next sprint, action=decide retire-vs-implement; until then `status: undefined` in index |
| KD2 | UC-A09 same | Same as KD1 |
| KD3 | UC-A10 same | Same as KD1 |
| KD4 | Child vs Parent speed-bump | Document in `actors/parent.md`: "scope-marker, not security boundary" |
| KD5 | Device-mgmt UCs absent from puml | Lane D Phase 0 deliverable: `device-mgmt.usecase.puml` |
| KD6 | UC-DM05/06 (LCD) ambiguity | Keep in device-mgmt; cross-ref note in `robot-mgmt/use-cases.md` |
| KD7 | 11 actors include speed-bump-distinguished | Keep both; document gating |
| KD8 | Pairing radio NOT CONFIRMED | UC-DP04 → `BACKEND_NOT_DESIGNED` |
| KD9 | Payment provider NOT CONFIRMED | UC-BU08/09 → `BACKEND_NOT_DESIGNED` |
| KD10 | Realtime voice provider NOT CONFIRMED | UC-L02 → `BACKEND_NOT_DESIGNED` |
| KD11 | Course-lock client-side only | `course-library/edge-cases.md` `unauthorized: client-side gate only — server enforcement deferred` |
| KD12 | Two parallel UC ID schemas | Resolved by D2 |
| KD13 | UC-A06 button-only | **(HR-8 fix)** Decision NOW: keep as UC with `status: button-only`. Backlog entry created in `reference/backlog.md` proposing demotion to "affordance" — owner=Lane A, target=next sprint review; resolution decision recorded in ADR-0005 §Follow-up. |
| KD14 | 14 unresolved assumptions in legacy §4 | Mirror verbatim in `known-defects.md` |

---

## 2. Acceptance Criteria (testable)

| # | Criterion | Verification |
|---|-----------|--------------|
| AC1 | `docs/usecases/reference/use-case-index.json` contains exactly **129** entries; every UC ID equals an entry in legacy `use-case-diagram.md`; alias-mapping completeness ≥ **95%** of `(129 − N_no_puml)` where `N_no_puml` = count of entries in `alias-overrides.json` with `override: "no-puml"` (denominator computed from data, not hardcoded — fixes Architect P1). Unmapped UCs must appear in `alias-overrides.json` with explicit `{id, override: "no-puml" \| "manual: <UC_PREFIX_VERB>"}`. | `node scripts/usecases/check-index-coverage.mjs` |
| AC2 | Every domain has `domains/<d>/use-cases.md` with one `## UC-LL-NN — <title>` H2 anchor per UC owned. Each H2 has at minimum: Goal, Trigger, Preconditions, Main Flow, Postconditions. Alt Flow / Error Flow optional but if present must be non-empty (no `(none)` stubs). | `node scripts/usecases/check-uc-sections.mjs` |
| AC3 | 11 actor files at right paths (4 internal + 7 external) | `ls actors/*.md actors/external/*.md \| wc -l` = 11 |
| AC4 | Every domain `backend-mapping.md` has one row per UC. Every cell in `Endpoint`, `Service`, `DB Entity`, `Events` columns is either: (a) a real `*.api.js` export name (verified against disk), (b) a real store action (verified against `src/store/`), (c) a `docs/erd/README.md` §entity-sketch entry, or (d) the literal sentinel `BACKEND_NOT_DESIGNED`. The `Domain ADR Pointer` column is `—` if all cells in the row are sentinels, otherwise must cite `decisions/NNNN-backend-<domain>.md`. | `node scripts/usecases/check-backend-sentinel.mjs` (state-based, no git context required — HR-6 fix) |
| AC5 | For every domain whose `backend-mapping.md` has any non-sentinel row, the cited `decisions/NNNN-backend-<domain>.md` ADR file exists | enforced by `check-backend-sentinel.mjs` |
| AC6 | Per-domain `edge-cases.md` declares per UC a non-empty subset of `{cancel, error, retry, timeout, unauthorized, validation, n/a}` plus rationale ≥ 20 chars per chosen mode. `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}`. **`n/a` ratio per domain ≤ 50%** (D5) — exceeding triggers Lane Z review request via `reference/edge-case-overrides.md`. | `node scripts/usecases/check-edge-case-enum.mjs` |
| AC7 | `reference/cross-domain-edges.json` is the single source for cross-domain edges. No per-domain `use-cases.md` declares an edge whose target is in another domain (parser scans for `→ UC-LL-NN` patterns where the LL prefix differs from the file's domain). **Allowlist (Architect P2):** lines containing the literal `cross-domain-edges.json:` are exempt — these are legitimate cross-references, not edge declarations. | `node scripts/usecases/check-cross-domain-edges.mjs` |
| AC8 | `multi-agent-execution.md` lists each lane (A/B/C/D/Z) and the domains it owns; coverage of all **14 domains** (13 puml + 1 KD5) exhaustive and disjoint; cross-domain-edges.json maintenance assigned to Lane Z. | `node scripts/usecases/check-lane-coverage.mjs` |
| AC9 | `clean-architecture-recs.md` contains ≥ 3 specific findings (file:line citations) and ≥ 1 each: simplification, missing domain, over-engineered area. **Findings produced by Lane Z agent during Phase 2 step 18 with input = full `src/` tree + new `docs/usecases/` tree, scanned against the checklist in §3 step 18.** Manual review by Lane Z reviewer. | manual review against §3 step 18 checklist (HR-7 fix) |
| AC10 | `ADR-0005-usecase-model-structure.md` exists with sections: Status, Context, Decision, Alternatives Considered, Consequences, Follow-Up | `grep -c '^## ' docs/usecases/ADR-0005-*.md` ≥ 6 |
| AC11 | No new UC ID is invented; index keys ⊂ legacy doc UC IDs (set equality, since AC1 requires count = 129) | `check-index-coverage.mjs` |
| AC12 | `known-defects.md` contains all 14 KD entries from §1.5 + verbatim mirror of legacy doc §4 | `node scripts/usecases/check-known-defects.mjs` |
| AC13 | Phase 0.5 dry-run gate: 5 sample UCs (UC-A03, UC-L01, UC-PR01, UC-CL03, UC-DP04) + 1 sample domain (auth) + 1 sample backend-mapping pass ALL ACs in isolation. **Sign-off recorded in `docs/qa/usecase-model-dry-run-2026-05-XX.md` by Lane Z agent or human reviewer (HR-9 fix).** | manual sign-off file present |
| AC14 (NEW v3) | Fuzzy-match algorithm for D2 alias mapping: normalized Levenshtein on lowercased, dash-stripped titles with ratio ≥ 0.7. Conflicts (multiple matches above 0.7) recorded in `alias-overrides.json` with explicit decision; build fails if any auto-match has ratio < 0.7 without an override. | `check-index-coverage.mjs --strict-fuzzy` (HR-5 fix) |

**Removed from v1:** AC5/AC6 mmdc render (superseded by D4). **Deferred-AC marker (HR-improve-5):** when PUML→MMD generator lands in Phase 4, add `AC-D1: every <d>.usecase.puml has a generator-output <d>.usecase.mmd; mmdc renders without error`.

---

## 3. Implementation Steps

### Phase 0 — Lane Z infra (single agent, blocks all lanes)

1. Pre-flight: `ls docs/erd/README.md` exists (HR-improve-6); `vite.config.js` watch globs do not include `docs/` (R-row); confirm 13 `.usecase.puml` + 1 overview = 14 files.
2. Create directory skeleton listed in §0 Option A (folders only, no content). 14 domain folders (13 from puml + `device-mgmt/` for KD5).
3. Write `docs/usecases/README.md` with: ID schema rules (D2), per-domain anchor convention (`## UC-LL-NN — <title>`), backend-mapping column definitions including `Domain ADR Pointer`, sentinel rules (D3), edge-case enum + n/a-ratio cap (D5), cross-domain edge convention (D6), PUML primary (D4).
4. Write templates: `use-cases.template.md`, `backend-mapping.template.md`, `hot-uc.template.md`.
5. Generate `reference/use-case-index.json` from `use-case-diagram.md`. Algorithm:
   1. Parse all `^- UC-LL-NN ...` lines → 129 entries with `{id, name, domain (from preceding ### header), source_file_md_line}`.
   2. Parse all `usecase "Title" as UC_PREFIX_VERB` lines from each `.usecase.puml` → puml-side title set per prefix.
   3. **Fuzzy-match algorithm (HR-5/AC14):** for each UC in legacy, normalize title (lowercase, strip dashes/parens/qualifiers), compute Levenshtein ratio against every puml title within the prefix-mapped domain. If best ratio ≥ 0.7 AND unique, write to `aliases: [...]`. If ambiguous (≥ 2 above 0.7 within Δ 0.05), add to `alias-overrides.json` with empty `decision: ""` for human resolution. If no match ≥ 0.7, write `aliases: []` and add to `alias-overrides.json` with `override: "no-puml"`.
   4. Write `alias-overrides.json` skeleton; Lane Z resolves entries before exit-criteria.
6. Generate `reference/cross-domain-edges.json` by parsing all 13 `.puml` files for any `..>` or `-->` edge whose source-package and target-package differ, plus the 8 cross-domain edges enumerated in `architecture/usecases/README.md` "Cross-Domain Relation Map." Schema: `{ source: "UC-LL-NN", target: "UC-LL-NN" \| "ACTOR:Robot", kind, note? }`.
7. Write `reference/multi-agent-execution.md`. Lane → domain table per D7. Add `## Sprint Hot List` heading; **hot-UC source of truth (HR-improve-1):** "Lane invoking Phase 1 declares hot UCs in their PR description; Lane Z merges into this section on integration."
8. Write `reference/known-defects.md` with all 14 KD entries from §1.5 + verbatim §4 of legacy doc.
9. Write `reference/backlog.md` (HR-8 fix) with concrete entries for KD1, KD2, KD3, KD13: each with `{id, owner: lane, target_sprint: TBD, action}`.
10. Write per-domain `use-cases.md` skeleton (UC index list as `## UC-LL-NN — title` headers, body sections empty) for all 14 domains. Each lane fills bodies in Phase 1.
11. Write check scripts (≤ 100 LOC each, pure ESM, node-only deps):
    - `check-index-coverage.mjs` (AC1, AC11, AC14)
    - `check-uc-sections.mjs` (AC2)
    - `check-backend-sentinel.mjs` (AC4, AC5; state-based — scans for any cell that is neither sentinel nor a real export/store/erd reference; if any non-sentinel rows in a domain, the `Domain ADR Pointer` column must be populated AND the cited file must exist on disk)
    - `check-edge-case-enum.mjs` (AC6)
    - `check-cross-domain-edges.mjs` (AC7)
    - `check-lane-coverage.mjs` (AC8)
    - `check-known-defects.mjs` (AC12)
12. Draft `ADR-0005-usecase-model-structure.md` (Proposed status). Body lives in the file itself; this plan §7 has only a 1-line pointer (HR-improve-7).
13. **Phase 0.5 dry-run gate:** Lane Z fills 5 sample UCs (UC-A03, UC-L01, UC-PR01, UC-CL03, UC-DP04 — one per lane) + 1 sample domain `use-cases.md` (auth) + 1 sample `backend-mapping.md`. Run all check scripts. **Sign-off (HR-9): Lane Z agent or human reviewer signs off in `docs/qa/usecase-model-dry-run-2026-05-XX.md`.** If any AC fails, fix BEFORE Phase 1 fans out.

**Exit criteria:** AC1 + AC3 (skeleton) + AC10 (Proposed) + AC11 + AC12 + AC13 + AC14 pass.

### Phase 1 — Lane A/B/C/D parallel (one lane = one branch, 4 worktrees)

For each domain owned by the lane:

14. In `domains/<d>/use-cases.md`, fill the body of every `## UC-LL-NN` section. Sections: Goal (1 line), Trigger, Preconditions, Main Flow (numbered steps), Postconditions. Add Alt Flow / Error Flow only if domain warrants. Source content from existing `.puml` notes + legacy `use-case-diagram.md` one-liners + **READ-ONLY** inspection of `*Page.jsx` (HR-improve, no edits to JSX).
15. Fill `domains/<d>/backend-mapping.md`. Every cell either real export from `src/services/api/<d>.api.js` / store action / erd entity, OR sentinel `BACKEND_NOT_DESIGNED`. If any row deviates from sentinel, `Domain ADR Pointer` column cites `decisions/NNNN-backend-<d>.md` ADR (which Lane creates in same PR).
16. Fill `domains/<d>/edge-cases.md` per UC with enum subset + rationale per chosen mode. Reference `flows/edge-cases/*.flow.mmd` template by relative path when applicable (informational).
17. Per-domain `.puml` is **read-only** (D4). Hot UCs (declared in lane PR description, merged into `multi-agent-execution.md` Sprint Hot List by Lane Z) get a `domains/<d>/hot/UC-XX.md` file using `templates/hot-uc.template.md`.
18. **No edits to files outside `domains/<owned>/`.** Cross-domain edges proposed via PR comment to Lane Z (D6, §6.1). Lane D adds `device-mgmt.usecase.puml` (KD5) — this is the only sanctioned new puml file.

**Exit criteria for each lane:** AC2 + AC4 + AC5 + AC6 + AC7 pass for the lane's domains.

### Phase 2 — Lane Z integration (single agent)

19. Generate `reference/backend-mapping.md` rollup by concatenating every `domains/*/backend-mapping.md`.
20. **Clean-architecture analysis (HR-7 fix):** Lane Z agent runs FRESH analysis with input = full `src/` tree (read-only) + completed `docs/usecases/` tree. Use this checklist:
    - **God components:** any `*Page.jsx` > 300 LOC OR with > 5 distinct store imports → flag as candidate for split.
    - **Leaked store mutations:** any `src/store/*.js` action mutating state owned by a different domain's store → flag as boundary violation.
    - **Duplicated state machines:** any pair of `*states.js` files with > 50% common state names → flag as candidate for shared abstraction.
    - **Speed-bump duplication:** parent-gate + course-library/UnlockConfirmModal patterns → flag as `usePinGate(scope)` candidate.
    - **Missing domain:** UCs marked `<<UNDEFINED>>` (KD1/2/3) clustered → flag as `account/` candidate.
    - **Cross-axis split:** parent-gate vs parent-summary puml split + DEVICE MGMT axis discrepancy → flag taxonomy ambiguity.
    Output `reference/clean-architecture-recs.md` with ≥ 3 findings (≥ 1 each kind), each with file:line + classification + action.
21. Promote `ADR-0005-usecase-model-structure.md` to Accepted. Sections: Status, Context (cites this plan + ADR-0004), Decision (D1–D7), Alternatives Considered (B/C/D/E), Consequences (positive/tradeoffs/follow-up including HR-8 KD13 affordance-demotion proposal).
22. Update `docs/architecture/README.md` and `docs/architecture/use-case-diagram.md` with top-of-file pointer: "See `docs/usecases/` for active use-case authoring. This file is preserved as historical canonical UC ID source per ADR-0005 D2."
23. Update `docs/README.md` documentation map to add `usecases/` entry.

**Exit criteria:** AC8 + AC9 + AC10 (Accepted) pass.

### Phase 3 — Validation (Lane Z)

24. Run all 14 ACs; capture outputs into `docs/qa/usecase-model-verification-2026-XX-XX.md` (mirror format of `docs/qa/flows-restructure-verification-2026-05-11.md`).
25. Manual spot-check 5 random UCs end-to-end (per-domain section → backend-mapping row → cross-domain-edges entry → known-defects status all consistent).
26. Mark plan DONE only when all 14 ACs pass with evidence.

### Phase 4 — Optional follow-up (deferred)

- Build PUML→MMD generator (~150 LOC). Add deferred-AC AC-D1.
- `check-legacy-staleness.mjs` to keep `use-case-diagram.md` aligned with index.
- Auto-generate per-UC files (Option E) if total UCs exceed 200.
- Resolve KD1/2/3/13 backlog entries.

---

## 4. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Drift between legacy `use-case-diagram.md` and new per-domain files** | High if both editable | Med | Phase 2 step 22 header pointer; Phase 4 `check-legacy-staleness.mjs` |
| **`lesson-session/use-cases.md` exceeds ~600 lines (21 UCs × ~30 lines)** | High | Low | Acknowledged; if exceeds 1000 lines, **Lane Z opens `reference/hot-promotion-UC-LXX.md` proposal** (HR-improve-4) for selective hot-UC extraction |
| **`BACKEND_NOT_DESIGNED` sentinel silently overwritten** | Med | High | `check-backend-sentinel.mjs` (D3, state-based) blocks PR if any non-sentinel row lacks `Domain ADR Pointer` citing an existing ADR file |
| **Cross-domain edges desync between `cross-domain-edges.json` and `.puml` source** | Med | Med | `check-cross-domain-edges.mjs` parses both `.puml` files and JSON; fails on mismatch |
| **PUML→MMD deferred → user expected Mermaid** | Med | Low | ADR-0005 D4 documents tradeoff; user can prioritize Phase 4 generator |
| **Lane conflict on `cross-domain-edges.json`** | High | Low | Only Lane Z writes; lanes propose via PR comment with diff snippet; Lane Z merges in deterministic alphabetical order by `{source, target}` key |
| **AC enum check creates checklist-fatigue → mark everything `n/a`** | Med | Med | `check-edge-case-enum.mjs` (D5/AC6): rationale ≥ 20 chars + keyword match for `n/a`; **n/a ratio per domain ≤ 50%** triggers Lane Z review (HR-improve-2) |
| **Phase 0.5 dry-run misses lane-specific patterns** | Low | Med | Dry-run picks one UC per lane; if any lane's pattern differs, surface during dry-run review and update template before fanout |
| **`*Page.jsx` reading bleeds into editing (ADR-0004 T10 echo)** | Med | Med | Phase 1 step 14 explicit READ-ONLY guardrail; lane PRs that touch `src/` auto-rejected by Phase 3 reviewer |
| **Vite dev/build watcher chokes on docs/usecases write storm** | Low | Low | Phase 0 step 1 pre-flight check |
| **Fuzzy-match algorithm produces silent miswires** | Med | Med | AC14: ratio ≥ 0.7 strict, ambiguous → manual override required, missing → manual override required, build fails on unresolved (HR-5) |
| **Hot-UC list never gets curated** | Med | Low | Source of truth: lane PR descriptions; Lane Z merges (HR-improve-1) |
| **Backlog never gets actioned** | Med | Med | `reference/backlog.md` has `target_sprint: TBD` slots; Phase 4 includes "Resolve KD1/2/3/13 backlog entries" |
| **File count reality > advertised** | High | Low | True total: 11 actors + 14×3 domain docs + 14 puml + 1 overview puml + 6 reference + 3 templates + 1 ADR + 7 scripts ≈ **75 files** before hot UCs (HR-improve-3 — admitted; principles 1+2 file-budget revised to ~75 baseline) |

---

## 5. Verification Steps

```bash
# AC1 + AC11 + AC14 — UC index coverage + no invented IDs + alias mapping ≥ 95%
node scripts/usecases/check-index-coverage.mjs

# AC2 — UC sections in domain files
node scripts/usecases/check-uc-sections.mjs

# AC3 — actor file count
ls docs/usecases/actors/*.md docs/usecases/actors/external/*.md | wc -l   # → 11

# AC4 + AC5 — backend mapping uses sentinel; non-sentinel rows have ADR pointer
node scripts/usecases/check-backend-sentinel.mjs

# AC6 — edge-case enum + rationale + n/a-ratio
node scripts/usecases/check-edge-case-enum.mjs

# AC7 — cross-domain edges live only in cross-domain-edges.json
node scripts/usecases/check-cross-domain-edges.mjs

# AC8 — lane coverage exhaustive + disjoint over 14 domains
node scripts/usecases/check-lane-coverage.mjs

# AC10 — ADR section structure
grep -c '^## ' docs/usecases/ADR-0005-usecase-model-structure.md   # → ≥ 6

# AC12 — known-defects coverage
node scripts/usecases/check-known-defects.mjs

# AC13 — dry-run gate sign-off
ls docs/qa/usecase-model-dry-run-*.md   # → exists and signed
```

All scripts ≤ 100 LOC, pure ESM, node-only deps.

---

## 6. Multi-Agent Execution Plan (lane → work)

| Lane | Domains owned | UC count | Files written |
|------|--------------|---------|---------------|
| **Lane A** | auth, onboarding | 10+4 = 14 | 2 use-cases.md + 2 backend-mapping.md + 2 edge-cases.md + 0–3 hot |
| **Lane B** | kid-hub, lesson-session, course-browse | 8+21+8 = 37 | 3+3+3 + 0–5 hot |
| **Lane C** | progress, parent-gate, parent-summary, purchase | 5+1+6+14 = **26** | 4+4+4 + 0–4 hot |
| **Lane D** | device-pairing, **device-mgmt** (KD5), robot-mgmt, course-library, fallback-shell | 14+6+12+12+8 = 52 | 5+5+5 + 0–5 hot + 1 net-new `device-mgmt.usecase.puml` |
| **Lane Z** | actors/, reference/, templates/, diagrams/, ADR, scripts, integration | — | 11 actors + 7 reference (+backlog +alias-overrides) + 3 templates + 1 ADR + 7 scripts ≈ ~30 files |

**Total UCs: 14 + 37 + 26 + 52 = 129 ✓ matches AC1.**

### 6.1 Cross-Domain Edge Ownership (D6 enforcement)

Cross-domain edges (`<<include>>` / `<<extend>>` / `<<delegate>>` / `<<requires>>` / `<<launches>>` / `<<emits>>` / `<<continues>>` / `<<re-enters>>` / `<<resumes>>` / `<<exits>>`) **only** in `reference/cross-domain-edges.json`. Per-domain `use-cases.md` files reference target UC IDs only:

```markdown
## UC-H08 — Enter Parent Space
- Goal: ...
- Postconditions: parent gate handoff (see cross-domain-edges.json: UC-H08→UC-PR01)
```

When Lane B writes `UC-H08` and Lane C writes `UC-PR01`, neither edits the other's file. The edge text lives in Lane Z's JSON. `check-cross-domain-edges.mjs` enforces.

**Proposal protocol:** Lane opens PR; PR description includes `## Cross-Domain Edge Proposals` block listing edges. Lane Z reviews and applies to JSON in deterministic alphabetical order by `{source, target}` key.

### 6.2 Hot-UC Governance (HR-improve-1)

**Source of truth:** `multi-agent-execution.md` Sprint Hot List section. Lane Z owns this section; lanes propose via PR description.

**Inclusion criteria (ANY of):**
- UC marked `<<UNDEFINED>>` AND being implemented this sprint (lane declares in PR — known at start of Phase 1), OR
- UC is target of ≥ 3 cross-domain edges per `cross-domain-edges.json` (machine-checkable at start of Phase 1, since JSON exists from Phase 0 step 6), OR
- UC has > 5 explicit Main Flow steps and ≥ 2 alt/error flows (lane declares AFTER writing body — only knowable end of Phase 1).

**Sequencing (Architect P3):** Criteria 1 + 2 produce hot UCs known at Phase 1 start; their `hot/UC-XX.md` files written during Phase 1. Criterion 3 produces hot UCs only known after body authoring; their `hot/UC-XX.md` files are a **Phase 1.5 backfill** (between Phase 1 lane work and Phase 2 Lane Z integration). Lane Z reviews and merges hot list into `multi-agent-execution.md` Sprint Hot List during Phase 1.5.

---

## 7. ADR-0005 Reference

ADR text lives at `docs/usecases/ADR-0005-usecase-model-structure.md` (drafted Phase 0 step 12, accepted Phase 2 step 21). Plan does not embed ADR body to avoid drift (HR-improve-7).

---

## 8. Out of Scope

- Authoring per-domain UC bodies for all 129 UCs (Phase 1; this plan only sets structure).
- Changing existing UC IDs or actor taxonomy beyond KD aliasing.
- Backend stack selection (per ADR-0001 / ARCHITECTURE.md template).
- Real backend wiring; mapping cells stay `BACKEND_NOT_DESIGNED` until backend exists.
- Cross-repo coordination (tbot-backend, tbot-ai-services) — mobile-only per user scope.
- Building the PUML→MMD generator (Phase 4 deferred).

---

## 9. Open Questions Closed

| Q | Resolution |
|---|------------|
| Q1: Per-UC vs per-domain granularity? | Per-domain primary + per-UC for hot UCs (D1) |
| Q2: `actors/external/` subfolder? | Yes — stable-vs-internal axis |
| Q3: `reference/backend-mapping.md` duplication? | Generator output, Phase 2 step 19 |
| Q4: Mermaid for use-case diagram semantics? | Insufficient; PUML primary, MMD via Phase 4 generator (D4) |
| Q5: ADR-0005 numbering? | Confirmed free (existing 0001–0004) |

---

## 10. Plan ↔ Existing Artefact Crosswalk

| Existing artefact | New artefact | Action |
|------------------|--------------|--------|
| `docs/architecture/use-case-diagram.md` (**129 UCs, 13 domains**) | `docs/usecases/reference/use-case-index.json` + per-domain `use-cases.md` files (**14 domains**) | DEPRECATE + add header pointer (Phase 2 step 22) |
| `docs/architecture/usecases/00-overview.puml` | `docs/usecases/diagrams/overview.puml` | COPY |
| `docs/architecture/usecases/<d>.usecase.puml` (**13 files**) | `docs/usecases/domains/<d>/diagrams/<d>.usecase.puml` | COPY (+ KD5 net-new device-mgmt) |
| `docs/architecture/usecases/README.md` | merged into `docs/usecases/README.md` | ABSORB |
| `docs/architecture/use-case-diagram.md §4` Assumptions Check | `docs/usecases/reference/known-defects.md` | MIRROR + extend |
| `docs/flows/edge-cases/*.flow.mmd` | referenced by per-domain `edge-cases.md` (informational only) | LINK |
| `docs/decisions/0004-flows-modular-restructure.md` | cited by ADR-0005 as precedent | LINK |
| `src/services/api/<d>.api.js` | cited in `backend-mapping.md` | LINK ONLY |
| `docs/erd/README.md` | cited in `backend-mapping.md` DB Entity column | LINK ONLY |
| `docs/templates/story.md` | inspiration for per-UC body sections | INSPIRATION |

---

## 11. Changelog

- v1 (2026-05-11): initial draft, pre-Architect.
- v2 (2026-05-11): post-Architect (APPROVE_WITH_IMPROVEMENTS); 12 fixes applied.
- **v3 (2026-05-11): post-Critic iteration 1/5 (REVISE_AND_RESUBMIT). Applied fixes:**
  - **HR-1:** Corrected UC count from 99 → **129** in AC1, AC11, §6, §10, principle 1, plus all references. Lane C UC count corrected 27 → 26 (parent-gate is 1 UC, parent-summary is 6).
  - **HR-2:** Added §1.4 Domain Axis Reconciliation. 13 puml + KD5's net-new device-mgmt.puml = **14 domain folders**. Total puml files = 14 (13 domain + 1 overview).
  - **HR-3:** D2 schema label corrected to `UC_<PREFIX>_<VERB>` with explicit prefix set `{AUTH, ONB, HUB, CRS, LSN, PRG, PG, PRT, CL, BUY, DP, RM, FB}`. Prefix-domain map noted in alias entries.
  - **HR-4:** AC1 alias completeness threshold raised from 80% → **95%** with explicit exclusion list = the 6 device-mgmt UCs (KD5, no puml).
  - **HR-5:** AC14 added — fuzzy-match algorithm specified (normalized Levenshtein ≥ 0.7) + `alias-overrides.json` for ambiguous/no-match cases + build fails on unresolved.
  - **HR-6:** AC4/AC5 reformulated as **state-based** check (not delta-based). Backend-mapping table gains `Domain ADR Pointer` column; non-sentinel rows require existing ADR file. No git diff dependency.
  - **HR-7:** Phase 2 step 20 names actor (Lane Z agent) + input (full `src/` + new `docs/usecases/`) + concrete checklist (6 anti-patterns).
  - **HR-8:** Added `reference/backlog.md` with concrete entries for KD1/2/3/13 (owner, target_sprint slot, action). KD13 keeps `status: button-only` NOW with documented backlog entry, not punted.
  - **HR-9:** AC13 names approver (Lane Z agent or human reviewer) + sign-off file format `docs/qa/usecase-model-dry-run-2026-05-XX.md`.
  - **Improvement #1:** §6.2 hot-UC source-of-truth = lane PR descriptions, Lane Z merges to `multi-agent-execution.md` Sprint Hot List.
  - **Improvement #2:** D5/AC6 — n/a ratio ≤ 50% per domain; rationale ≥ 20 chars + keyword for n/a.
  - **Improvement #3:** §4 risk row + principle 2 admit baseline ≈ **~75 files** before hot UCs, not "~50."
  - **Improvement #4:** lesson-session > 1000 lines escalation = Lane Z opens `reference/hot-promotion-UC-LXX.md` proposal.
  - **Improvement #5:** Deferred-AC marker AC-D1 noted at end of §2 for Phase 4 generator.
  - **Improvement #6:** Phase 0 step 1 pre-flight `ls docs/erd/README.md` check.
  - **Improvement #7:** §7 ADR body removed; replaced with file pointer.
- **v3.1 (2026-05-11): post-Architect re-review iteration 1 (APPROVE_WITH_IMPROVEMENTS, 3 minor items). Applied:**
  - **P1:** AC1 alias-completeness denominator now data-driven (computed from `alias-overrides.json` `no-puml` count), not hardcoded.
  - **P2:** AC7 parser allowlist for legitimate `cross-domain-edges.json:` cross-references.
  - **P3:** §6.2 hot-UC governance sequencing clarified — criteria 1+2 produce Phase-1-start hot UCs; criterion 3 produces Phase-1.5 backfill.
