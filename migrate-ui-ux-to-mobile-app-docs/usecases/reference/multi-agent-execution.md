# Multi-Agent Execution Plan — Use Case Model

> Lane → domain ownership for the `docs/usecases/` authoring effort. Reuses ADR-0004 D4 lane scheme with adjustments for the puml-based 14-domain split (plan §1.4).
>
> Single-writer-per-file is enforced. Cross-domain edges live exclusively in `cross-domain-edges.json` (Lane Z owned).

---

## 1. Lane → Domain Table (D7)

| Lane | Domains owned | UC count | Files written |
|---|---|---|---|
| **Lane A** | `auth`, `onboarding` | 13 + 5 = **18** | 2 use-cases.md + 2 backend-mapping.md + 2 edge-cases.md + 0–3 hot |
| **Lane B** | `kid-hub`, `lesson-session`, `course-browse` | 8 + 22 + 8 = **38** | 3 + 3 + 3 + 0–5 hot |
| **Lane C** | `progress`, `parent-gate`, `parent-summary`, `purchase` | 5 + 1 + 6 + 23 = **35** | 4 + 4 + 4 + 0–4 hot |
| **Lane D** | `device-pairing`, `device-mgmt` (KD5), `robot-mgmt`, `course-library`, `fallback-shell`, `mobile-shell` (P5) | 14 + 6 + 12 + 12 + 8 + 1 = **53** | 5 + 5 + 5 + 0–5 hot + 1 net-new `device-mgmt.usecase.puml` |
| **Lane Z** | `actors/`, `reference/`, `templates/`, `diagrams/`, `ADR`, `scripts/`, integration | — | 11 actors + 7 reference docs (+backlog +alias-overrides) + 3 templates + 1 ADR + 7 check scripts ≈ **~30 files** |

**Coverage check:** 18 + 38 + 35 + 53 = **144 ✓** (matches AC1; expanded P3 + P5 from 129 baseline).

**Disjoint check:** every one of the 15 domain folders (14 baseline + `mobile-shell` P5) appears in exactly one lane row above. `check-lane-coverage.mjs` enforces.

---

## 2. Cross-Domain Edge Maintenance

`reference/cross-domain-edges.json` is **Lane Z owned**. Other lanes propose new edges via PR description block:

```markdown
## Cross-Domain Edge Proposals

- source: UC-LL-NN
  target: UC-LL-NN
  kind:   include | extend | delegate | requires | launches | emits | continues | re-enters | resumes | exits
  note:   one-line context
```

Lane Z merges proposals in deterministic alphabetical order by `{source, target, kind}` key. No other lane writes to `cross-domain-edges.json`.

---

## 3. Sprint Hot List

> **Hot-UC source of truth (HR-improve-1):** lane invoking Phase 1 declares hot UCs in their PR description; Lane Z merges the curated list into this section on integration. Phase 1.5 backfill handles UCs that only become hot AFTER body authoring (criterion 3 below).

**Inclusion criteria (ANY of):**

1. UC marked `<<UNDEFINED>>` AND being implemented this sprint (lane declares at start of Phase 1).
2. UC is the target of ≥ 3 cross-domain edges per `cross-domain-edges.json` (machine-checkable from Phase 0 onward).
3. UC has > 5 explicit Main Flow steps and ≥ 2 alt/error flows (lane declares at end of Phase 1 → Phase 1.5 backfill).

**Sequencing (Architect P3):** criteria 1 + 2 yield Phase-1-start hot UCs (their `hot/UC-XX.md` written during Phase 1). Criterion 3 yields Phase-1.5 backfill (after body authoring exposes complexity).

### Sprint Hot List (current — Phase 1.5 backfill, 2026-05-11)

| UC ID | Title | Domain | Owning Lane | Criterion | Hot dossier |
|---|---|---|---|---|---|
| **UC-H01** | View Home Hub | `kid-hub` | B | 2 — 15 incoming cross-domain edges (every "back-home" path) | `domains/kid-hub/hot/UC-H01.md` |
| **UC-L01** | Start Voice Session | `lesson-session` | B | 2 — 8 incoming launch/re-enter edges (universal lesson-start) | `domains/lesson-session/hot/UC-L01.md` |
| **UC-PR01** | Pass Parent Gate | `parent-gate` | C | 2 — 6 incoming `requires` edges (shared service for all parent-mode entry) | `domains/parent-gate/hot/UC-PR01.md` |

**Criterion 1 (UNDEFINED + this sprint):** none — the 3 KD candidates (UC-A06/A09/A10) are tracked in `reference/backlog.md` with `target_sprint: TBD`, not "this sprint." Skip.

**Criterion 3 (>5 Main Flow steps + ≥2 alt/error flows):** none — Phase 1 lane authoring kept Main Flow blocks at ≤5 steps for every UC. Closest near-threshold candidate is UC-CL03 (mf=5, alt+err present); did not promote because plan requires strict `>5`.

**Confirmation per Lane B note:** UC-H07 (Open Kid Settings) is internal navigation only — not added to cross-domain-edges.json, not hot.

---

## 4. PR Discipline

- A lane edits files only inside `domains/<owned>/` plus its own `decisions/NNNN-backend-<domain>.md` ADRs.
- A lane reads `domains/<other>/*.md`, `reference/*.json`, and `architecture/usecases/*.puml` freely.
- A lane never edits `docs/architecture/usecases/*.puml` (D4 read-only); puml copies live under `domains/<d>/diagrams/`. Lane D's net-new `device-mgmt.usecase.puml` is the single sanctioned exception.
- A lane never edits `*.jsx` (HR-improve READ-ONLY guardrail).

Phase 3 reviewer auto-rejects lane PRs that violate any of the above.
