# Use-Case-Model Dry-Run Sign-Off — 2026-05-11

**Plan:** `.omc/plans/usecase-model-mobile.md` v3.1
**Phase:** 0.5 (post-Phase-0 dry-run gate, before Lane A/B/C/D fan-out)
**Approver:** Lane Z agent (per plan §3 step 13 + AC13 sign-off rule HR-9)
**Date:** 2026-05-11

---

## Scope of dry-run

Per plan §3 step 13, the dry-run validates that the structure built in Phase 0 can support real authoring. The dry-run cohort:

- **5 sample UCs end-to-end** (one per lane):
  - UC-A03 — Log In with Email/Password (Lane A)
  - UC-L01 — Start Voice Session (Lane B)
  - UC-PR01 — Pass Parent Gate (Lane C)
  - UC-CL03 — Buy / Unlock Course (Lane D)
  - UC-DP04 — Scan for Robot (Lane D)
- **1 full sample domain** (auth, 10 UCs) authored end-to-end.
- **1 full sample backend-mapping** (auth, 10 rows).
- **1 full sample edge-cases** (auth, 10 UC blocks with enum + rationale).

---

## AC verification table

| AC | Verification command | Expected | Actual | Status |
|----|---------------------|----------|--------|--------|
| AC1 | `node scripts/usecases/check-index-coverage.mjs` | count=129 | `PASS AC1 count=129` | PASS |
| AC2 | `node scripts/usecases/check-uc-sections.mjs` | ≥5 sections per checked UC, no `(none)` stubs | `checked=14, skeletons=115, failures=0` | PASS |
| AC3 | `ls docs/usecases/actors/*.md docs/usecases/actors/external/*.md \| wc -l` | 11 | `11` | PASS |
| AC4+AC5 | `node scripts/usecases/check-backend-sentinel.mjs` | 0 failures, sentinel rule held | `checked=10, failures=0` | PASS |
| AC6 | `node scripts/usecases/check-edge-case-enum.mjs` | 0 failures, n/a ratio ≤50% per domain | `checked=10, failures=0` | PASS |
| AC7 | `node scripts/usecases/check-cross-domain-edges.mjs` | 0 failures | `failures=0` | PASS |
| AC8 | `node scripts/usecases/check-lane-coverage.mjs` | 14 domains, exhaustive + disjoint | `14 domains across 4 lanes, exhaustive + disjoint OK` | PASS |
| AC10 | `grep -c '^## ' docs/usecases/ADR-0005-usecase-model-structure.md` | ≥6 | `6` | PASS |
| AC11 | `node scripts/usecases/check-index-coverage.mjs` | keys ⊂ legacy | `PASS AC11 keys ⊂ legacy (129 legacy IDs covered)` | PASS |
| AC12 | `node scripts/usecases/check-known-defects.mjs` | KD1..KD14 + verbatim §4 mirror | `KD1..KD14 + verbatim §4 mirror OK` | PASS |
| AC13 | this file present | yes | this file at `docs/qa/usecase-model-dry-run-2026-05-11.md` | PASS |
| AC14 | `node scripts/usecases/check-index-coverage.mjs` | alias completeness ≥95% of (129 − no-puml); strict-fuzzy resolved | `alias completeness 100.0% (matched=122 / denominator=122, no-puml=7); every unmapped UC has an override entry` | PASS |

**AC9** (clean-architecture-recs): not applicable to Phase 0.5 — produced by Lane Z agent in Phase 2 step 20.

---

## Stdout snippets (verbatim, last run)

```text
=== check-index-coverage ===
PASS AC1 count=129
PASS AC11 keys ⊂ legacy (129 legacy IDs covered)
PASS AC14 alias completeness 100.0% (matched=122 / denominator=122, no-puml=7)
PASS AC14 every unmapped UC has an override entry
check-index-coverage: OK
=== check-uc-sections ===
check-uc-sections: checked=14, skeletons=115, failures=0
=== check-backend-sentinel ===
check-backend-sentinel: checked=10, failures=0
=== check-edge-case-enum ===
check-edge-case-enum: checked=10, failures=0
=== check-cross-domain-edges ===
check-cross-domain-edges: failures=0
=== check-lane-coverage ===
check-lane-coverage: 14 domains across 4 lanes, exhaustive + disjoint OK
=== check-known-defects ===
check-known-defects: KD1..KD14 + verbatim §4 mirror OK
```

---

## Findings + adjustments made during the dry-run

1. **Fuzzy-match algorithm needed substring-bonus and parser fix.** Initial run produced 37 `no-puml` overrides because the legacy-doc parser dropped multi-word titles after the first capture group (regex was too lazy) and the Levenshtein-only ratio rejected legitimate matches like "Listen to Robot Speech" vs puml "Listen to Robot" (ratio = 0.68). Fixed by (a) rewriting the title-capture to strip `(...)` and ` — ...` qualifiers explicitly, (b) adding a substring-containment bonus (one string fully contains the other → ratio = max(levR, 0.7 + 0.25 × shorter/longer)). Result: 7 `no-puml` (6 KD5 device-mgmt + 1 legacy-only UC-C06) + 10 `manual:` overrides for cross-equivalents the algorithm cannot reach. Alias completeness now 100%.
2. **Cross-domain edge regex is arrow-anchored.** UC-CL03 body legitimately mentions `UC-PR01`, `UC-DP10`, and `UC-BU07/08/09` in prose without a literal `→` arrow before each ID. AC7 check requires the `→ UC-LL-NN` pattern to flag a cross-domain edge declaration; references-as-prose pass through correctly. Lanes should remember: only `→ UC-LL-NN` patterns trigger the cross-domain check.
3. **Backend-mapping sentinel is structurally protected.** All 10 auth rows are `BACKEND_NOT_DESIGNED` for every data cell, so `Domain ADR Pointer = —` passes. As soon as Lane A promotes any cell off sentinel during Phase 1, the row will require an existing `decisions/NNNN-backend-auth.md` ADR (state-based check enforces).
4. **n/a-ratio rule held.** Auth domain has 2 of 10 UCs (UC-A01 and UC-A06) using `n/a` only — 20%, well under the 50% cap. Both rationales contain a justification keyword (`view-only` and `no-async, single-step` respectively).
5. **Skeleton-vs-authored detection works.** `check-uc-sections.mjs` skips UCs whose body has ≥5 `_TBD` placeholders; this lets Phase 0.5 add real bodies without false-failing the 115 still-skeleton UCs.
6. **No JSX edits.** All sample-UC bodies derive from READ-ONLY inspection of `*Screen.jsx` files (line numbers cited). No `*.jsx` files modified during Phase 0.5.

---

## Sign-off

All 14 acceptance criteria checked above are PASS or N/A-deferred-to-later-phase. The structure built in Phase 0 supports real authoring. **Phase 1 fan-out (Lanes A/B/C/D) is unblocked.**

**Phase 0.5 sign-off:** Lane Z agent — 2026-05-11.
