# ADR-0005 — Use Case Model Structure

Date: 2026-05-11

## Status

**Accepted** (2026-05-11, post-Phase-2 integration). Phase 1 lane fan-out delivered all 129 UC bodies; Phase 1.5 backfill merged 90 cross-domain edges and 3 hot-UC dossiers; Phase 2 integration produced the backend-mapping rollup, clean-architecture findings (`reference/clean-architecture-recs.md`), and this Accepted promotion. All 14 ACs pass with green check scripts.

## Context

`docs/architecture/use-case-diagram.md` had grown to a single 504-line monolith covering 129 UCs, 11 actors, and 13 domains. The artefact was heading toward `user-flow.md`'s pre-restructure fate (single source of truth that no agent could update without conflict — see ADR-0004). Concurrently, `docs/architecture/usecases/` already split the diagram source into 14 `.usecase.puml` files (1 overview + 13 per-domain), but the legacy markdown still owned the canonical `UC-LL-NN` IDs and the cross-domain narrative.

We needed:

- A per-domain authoring split that survives 4-lane parallel work.
- A way to keep two ID schemas (`UC-LL-NN` from legacy, `UC_<PREFIX>_<VERB>` from puml) coexisting without a renaming churn.
- Backend mapping cells that cannot silently hallucinate REST routes (every `src/services/api/*.api.js` export currently throws `not implemented`).
- Cross-domain edges in one writable place to prevent merge conflicts on shared edge declarations.
- A multi-agent execution boundary that matches the actual conflict surface.

ADR-0004 established the lane scheme (A/B/C/D + Z) and the single-writer-per-file principle for `flows/`. This ADR extends those primitives to the use-case model.

Driving plan: `.omc/plans/usecase-model-mobile.md` (v3.1).

## Decision

Seven locked decisions (plan §0):

| # | Decision | Choice |
|---|---|---|
| **D1** | File granularity | Per-domain `domains/<d>/use-cases.md` is the primary unit; per-UC files exist **only** for hot UCs (governance: `reference/multi-agent-execution.md` §Sprint Hot List). Default ≈ 13 base domain docs + 0–17 hot UC files = ~13–30 markdown bodies plus actors/reference scaffold. |
| **D2** | UC ID schema | `UC-LL-NN` from `use-case-diagram.md` is canonical. Puml-local IDs (`UC_<PREFIX>_<VERB>`, prefix in `{AUTH, ONB, HUB, CRS, LSN, PRG, PG, PRT, CL, BUY, DP, RM, FB}`) recorded as `aliases: []` per UC in `reference/use-case-index.json`. Never an anchor target. |
| **D3** | Backend mapping for unbuilt backend | Sentinel `BACKEND_NOT_DESIGNED`. State-based check (`check-backend-sentinel.mjs`): any non-sentinel cell requires a `Domain ADR Pointer` row citing `decisions/NNNN-backend-<domain>.md` whose existence is verified on disk. No git-diff dependency (HR-6 fix). |
| **D4** | Diagram authoring | `.usecase.puml` is primary; `.mmd` is generator output, deferred to Phase 4. Until then we ship `.puml` only. Per-domain pumls are READ-ONLY copies under `domains/<d>/diagrams/` **except** the KD5-resolution puml (`domains/device-mgmt/diagrams/device-mgmt.usecase.puml`) which is the source-of-truth for that domain (no archive copy under `docs/architecture/usecases/`); see §Amendments below. |
| **D5** | Edge-case coverage AC | Semantic enum + rationale (`{cancel, error, retry, timeout, unauthorized, validation, n/a}`), not link-presence. Rationale ≥ 20 chars; `n/a` rationale must contain a justification keyword from `{stateless, single-step, no-async, view-only, terminal}`. **`n/a` ratio per domain ≤ 50%.** |
| **D6** | Cross-domain UC edges | Single source: `reference/cross-domain-edges.json` owned by Lane Z. Per-domain files reference target IDs only. Lanes propose new edges via PR description block; Lane Z merges in deterministic alphabetical order by `{source, target, kind}`. |
| **D7** | Lane assignments | Reuse ADR-0004 D4: A=auth+onboarding, B=kid-hub+lesson-session+course-browse, C=progress+parent-gate+parent-summary+purchase, D=device-pairing+device-mgmt+rotjtjbot-mgmt+course-library+fallback-shell, Z=infra+actors+reference+ADR. |

## Alternatives Considered

| # | Alternative | Rationale for rejection |
|---|---|---|
| **B** | Per-UC files for ALL 129 UCs | File-count explosion; slows review; navigation harder than per-domain split; gives no benefit for the 90% of UCs that have a 5-line body. |
| **C** | Single mega-file (status quo) | Already ≥504 lines; merge-conflict surface is exactly the conflict that prompted this ADR. Doesn't solve the original problem. |
| **D** | Per-puml-file split (one .md per .usecase.puml) | Misaligns with legacy `UC-LL-NN` ID schema (which uses 13 legacy domain headers, not the 14 puml domains). Forces double-renaming across hundreds of cross-references during Phase 1. |
| **E** | Generated per-UC files from a `use-cases.yaml` source | Tooling cost (~150 LOC generator + 129 YAML entries) unjustified for a 129-UC catalog that grows slowly. Defer to Phase 4 if UC count exceeds 200. |

## Consequences

### Positive

- **Conflict-free fan-out:** 4 lanes write to disjoint `domains/<d>/` subtrees; cross-domain edges land only in a Lane-Z-owned JSON.
- **Two-schema coexistence without rename churn:** `aliases: []` in the index records the puml-side identifier; legacy IDs remain anchors; new agents pick the right schema via `reference/README.md`.
- **Hallucination guardrail:** `BACKEND_NOT_DESIGNED` is structurally protected by `check-backend-sentinel.mjs`; no agent can silently add `POST /v1/auth/login` to a cell.
- **Reviewability:** 14 domain dirs (~30–500 lines each `use-cases.md`) replace one 504-line file.
- **ADR-0004 precedent reuse:** lanes A/B/C/D + Z have already proved zero-conflict for `flows/`; same boundary works here.

### Tradeoffs

- **Two ID schemas to remember.** Documented in `reference/README.md` §1; new agents read it before authoring.
- **No automatic mmd render.** Until Phase 4 generator lands, agents render `.puml` manually with PlantUML CLI or VS Code extension. Acceptable: nav target audience is humans, not the build pipeline.
- **Hot-UC list adds a per-PR governance step** (lanes declare hot UCs in PR descriptions; Lane Z merges into Sprint Hot List). Mitigated by clear inclusion criteria and a Phase-1.5 backfill window for criterion-3 hot UCs (Architect P3 sequencing fix).
- **File count baseline ≈ 75** before hot UCs (HR-improve-3 admission). Larger than first-pass advertising of "~50."

## Follow-Up

- **KD13 affordance demotion proposal (BACKLOG-UC-A06-AFFORDANCE):** evaluate whether button-only-with-no-API qualifies as a use case at all. If demoted, document the rule here:
  > _Demotion criterion (proposed):_ a "UC" that has no async work, no state mutation, no API call, and is invoked by a single trigger that always navigates to a fixed target is an **affordance**, not a UC. Affordances live in the parent UC's "Alt Flow" section, not as standalone H2 anchors. Proposed by Lane Z during Phase 2; pending Lane A confirmation when `BACKLOG-UC-A06` lands.
- **KD1/KD2/KD3 UC-A06/A09/A10 status decisions:** owner Lane A; resolutions feed `auth.usecase.puml` `<<UNDEFINED>>` removal. See F2 in `reference/clean-architecture-recs.md` — when the first backlog item lands, evaluate splitting `auth/` into `auth/` (Guest, pre-login) + `account/` (AuthUser, session lifecycle).
- **PUML→MMD generator (Phase 4):** add deferred AC-D1 to verify each `<d>.usecase.puml` has a generator-output `<d>.usecase.mmd` that mmdc renders without error.
- **Per-UC file generator (Option E):** revisit if total UC count exceeds 200.
- **Backend ADRs:** `decisions/NNNN-backend-<domain>.md` skeleton needed when the first non-sentinel cell lands per domain. State-based check (`check-backend-sentinel.mjs`) enforces.
- **Hot-UC backlog candidates (from Phase 1.5 dossiers):** `BACKLOG-UC-L01-PRECONDITION-GUARDS`, `BACKLOG-UC-PR01-RETURN-TARGET`, `BACKLOG-PARENT-RBAC-DECISION` — pending team-lead confirmation before Lane Z adds to `reference/backlog.md`.
- **Speed-bump duplication hook (F1 in clean-arch-recs):** extract `usePinGate(scope)` shared hook backing `ParentGateScreen` + `UnlockConfirmModal`.

## Amendments

### §1 — D4 location amendment for KD5 net-new puml (2026-05-11, post-review)

Plan §3 step 18 originally implied all pumls live under `docs/architecture/usecases/` with `domains/<d>/diagrams/` as copies. Lane D's KD5-resolution puml `device-mgmt.usecase.puml` was placed only at `docs/usecases/domains/device-mgmt/diagrams/device-mgmt.usecase.puml`, with no source under `docs/architecture/usecases/`. Reviewer F1 flagged the location-vs-copy ambiguity.

**Decision:** Keep the KD5 puml at its current location (`domains/device-mgmt/diagrams/`). The existing 13 archive pumls under `docs/architecture/usecases/` remain READ-ONLY historical sources; their `domains/<d>/diagrams/` siblings are copies. The KD5 puml is the **only** exception: it is source-of-truth in the new corpus, with no archive copy.

**Rationale:** Moving the file backwards into the legacy archive would (a) re-establish the dual-location authoring confusion ADR-0004 worked to remove, and (b) require Lane D's already-cited `domains/device-mgmt/diagrams/...` references in body docs to be updated. The amendment is the lower-friction path.

**Carry-forward:** Future net-new pumls (none anticipated) follow the same rule: live in the new corpus only.
