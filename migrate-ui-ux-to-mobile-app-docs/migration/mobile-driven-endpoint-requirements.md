# Option C — Mobile-Driven Endpoint Requirements (Skeleton Plan)

**Status:** SKELETON — P-1 pre-meeting deliverable (1-page outline)
**Owner:** tbot-design (planner)
**Created:** 2026-05-12
**Selected if:** Backend lead chooses Option C at P-1 meeting (see [parent plan §18.0](./mobile-driven-api-contract-gap-analysis.md))
**Supersedes/Superseded-by:** N/A (alternative to `mobile-driven-api-contract-gap-analysis.md`)

---

## 1. One-line summary

**Status quo preserved.** Backend remains sole owner of OpenAPI spec (auto-emitted from existing NestJS decorators). tbot-design produces a **requirements package** — a structured document listing every endpoint mobile needs but doesn't yet exist in `tbot-backend/openapi.json`. The package becomes input to the backend roadmap; no contract authority shift, no per-domain OpenAPI files in `docs/api/`, no validator infrastructure.

---

## 2. Why this option exists

Status-quo fallback if backend lead is unwilling to accept any contract-authority shift (Option A) AND lacks capacity for stub-controller work (Option B). Preserves the most valuable artifact (mobile-driven gap analysis) without the multi-week authoring effort or the cross-team political negotiation.

---

## 3. Scope

- **In scope (produce 4 deliverables):**
  1. `_reports/mobile-endpoint-inventory.md` — every endpoint the mobile UI requires, derived from 118 nav-graph states × 12 mobile domains × 78 sequence diagrams. ~69 endpoints expected.
  2. `_reports/mobile-gap.md` — subset of (1) NOT present in `tbot-backend/openapi.json` (set-difference per parent plan AC-7).
  3. `_reports/mobile-priority-matrix.md` — gap endpoints sorted by mobile-impact (number of UI states blocked) × system criticality.
  4. Populated `docs/flows/domains/<d>/calls.generated.json` for all 12 domains, listing required endpoints with sequence-diagram references.
- **Out of scope:** Hand-authored OpenAPI. Validator scripts. ADR-0008. Cross-doc enforcement. Backend implementation. Mobile UI changes.

---

## 4. Key decisions (vs Options A/B)

| Topic | Option A | Option B | Option C (this) |
|---|---|---|---|
| Authoring effort | High (~20-55d) | Medium (~10-14d, backend-heavy) | **Low (~5d, mobile-only)** |
| Output | Per-domain OpenAPI files in `docs/api/**` | Backend stubs + emitted OpenAPI | Markdown reports only |
| Validators built | 7 Phase-1 scripts | 0 (backend test suite reused) | 0 |
| ADR-0008 needed | Yes (5-decision combined) | Yes (single decision) | No |
| Mobile dev unblocked | After S5 (~22-28d) | After B-3 (~7-10d) | After C-3 (~3-4d) for read access; integration timing depends on backend |
| Contract authority | Mobile | Backend (code) | Backend (unchanged) |
| Best for | Greenfield, mobile drives | Brownfield, joint ownership | Backend autonomy preserved |

---

## 5. Stage outline (Option C)

| Stage | Duration | Owner | Output |
|---|---|---|---|
| P-1 | calendar-week | mobile + backend leads | Decision recorded; this plan adopted |
| C-1 | 1-1.5 d | tbot-design (planner) | Walk all 12 mobile flow domains + 118 nav-graph states; for each `kind: "happy"` state, identify required backend calls. Output: `_reports/mobile-endpoint-inventory.md`. |
| C-2 | 1 d | tbot-design | Cross-reference (1) against `tbot-backend/openapi.json` (25 paths baseline). Produce `_reports/mobile-gap.md` with set-difference. |
| C-3 | 1 d | tbot-design | Populate `docs/flows/domains/<d>/calls.generated.json` for all 12 domains (currently `count:0, calls:[]`). Each entry links to source UI state + sequence diagram + (existing OR missing) backend endpoint. |
| C-4 | 0.5-1 d | tbot-design + product | Produce `_reports/mobile-priority-matrix.md` ranking gap endpoints by impact × criticality. Hand to backend roadmap. |
| C-5 | 0.5 d | tbot-design | Closeout: README in `_reports/` explaining how to use the package; commit to main. | 
| **Total** | **~4-5 working days** | tbot-design solo | Markdown reports + populated `calls.generated.json` |

No multi-author parallelism needed; single author throughout.

---

## 6. Who owns what

| Asset | Owner |
|---|---|
| Mobile endpoint inventory | tbot-design |
| Gap report | tbot-design |
| Priority matrix | tbot-design + product |
| `calls.generated.json` population | tbot-design |
| `tbot-backend/openapi.json` | tbot-backend (unchanged) |
| Endpoint implementation prioritization | tbot-backend (consumes priority matrix) |

---

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| RC-1 | Mobile dev blocked waiting for endpoints that backend hasn't prioritized | Priority matrix gives backend clear ranking; mobile dev paths use Prism mock-server against an aspirational OpenAPI sketch (optional follow-on) |
| RC-2 | Gap report becomes shelf-ware if backend doesn't ingest it | P-1 meeting commits backend lead to reviewing within N working days post-handoff (specific N negotiated at meeting) |
| RC-3 | Mobile UI evolves → endpoint inventory goes stale fast | Lightweight: re-run C-1/C-2 quarterly; deliverable is a markdown report, low-cost to refresh |
| RC-4 | No structured contract → mobile dev integration breaks late | Mobile devs read existing `tbot-backend/openapi.json` + the inventory; integration discovers mismatches at compile time (TypeScript codegen) rather than runtime |

---

## 8. Comparison summary

| | Option A | Option B | Option C (this) |
|---|---|---|---|
| Duration | 20-55d | ~10-14d | **~5d** |
| Source of truth | Hand-authored docs | Backend decorators | Backend decorators (unchanged) |
| Backend buy-in | High (R-4 critical) | High (capacity commit) | **Low (just agree to consume report)** |
| Mobile contract authority | High | Medium | **None** |
| Cross-team political cost | High | Medium | **Low** |
| Validator infrastructure | 7 scripts | 0 | 0 |
| Best for | Greenfield, mobile drives | Brownfield, joint ownership | **Status quo + scoping** |

---

## 9. If Option C is chosen

1. This skeleton becomes the canonical plan (already executable as-is, no further upgrade needed).
2. Option A plan `mobile-driven-api-contract-gap-analysis.md` is marked `status: superseded` and archived for reference.
3. No ADR-0008 written.
4. tbot-design executes C-1..C-5 over ~5 working days.
5. Output reports handed to tbot-backend roadmap; tbot-design's contract-authoring scope closed.

**Follow-on option:** If after consuming the gap report, backend team decides they want contract authority shift, Option A or B can be revisited as a follow-on plan.

---

## 10. References

- Parent plan: `mobile-driven-api-contract-gap-analysis.md` (§4.2 ALT-1, §18.0 Option C)
- Existing baseline: `tbot-backend/openapi.json` (25 paths, 29 ops covering Systems 01-02 only)
- Mobile flow domains: `docs/flows/domains/<12 dirs>/calls.generated.json` (currently all empty)
- Nav graph: `nav-graph-data.json` (118 states, 15 groups, 12 mobile domains)
