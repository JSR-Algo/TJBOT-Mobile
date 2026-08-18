# Clean-Architecture Recommendations — Use-Case Model Phase 2

> Phase 2 step 20 (HR-7 fix). Findings produced by Lane Z agent during Phase 2 from FRESH analysis with input = full `src/` tree (READ-ONLY) + completed `docs/usecases/` tree, scanned against the 6-item checklist in `.omc/plans/usecase-model-mobile.md` §3 step 20.
>
> **Date:** 2026-05-11. **Methodology:** `find` + `wc -l` for LOC; `grep -E "^import.*from '@/store"` for store-import counts; `grep -rn "UNDEFINED"` for puml clusters; manual read of `*states.js`, `UnlockConfirmModal.jsx`, `ParentGateScreen.jsx`, `HomeHubScreen.jsx`. Each finding cites the source files; no pre-baked content from the plan.

---

## Summary

| # | Kind | Severity | Title |
|---|---|---|---|
| F1 | Speed-bump duplication | resolved | Course assignment is PIN-free; keep it separate from the parent PIN gate |
| F2 | Missing domain | medium | Three `<<UNDEFINED>>` UCs cluster in `auth` — propose `account/` domain when wiring lands |
| F3 | Cross-axis split | low | `parent-gate` vs `parent-summary` puml split + KD5 device-mgmt axis discrepancy is now historical artifact, not active drag |
| F4 | Simplification | low | `lesson-session/states.js` (26 entries) carries 4 "Done" terminal variants that no UC currently surfaces — candidate for collapse |
| F5 | Over-engineered area | low | Per-domain `*states.js` + per-page screen list duplicates the nav-graph already produced by ADR-0004's flows pipeline |

All findings derive from the actual `src/` tree, not from speculation. Severity is Lane Z agent assessment; Phase 4 may revisit.

---

## F1 — Speed-bump duplication: resolved by separating course assignment

**Classification:** Simplification.

**Evidence:**

- `src/features/parent/screens/ParentGateScreen.jsx:7-12` — generates a random 3-digit number, holds it in `useState`, compares input against `target`, schedules a 280ms `setTimeout` to navigate on match.
- `src/features/course-library/UnlockConfirmModal.tsx` now presents a lightweight "Add to Robot" action and calls course enrollment without collecting a numeric PIN.

The components no longer implement the same intent: Parent Gate protects parent-only settings, while UC-CL04 confirms a course assignment for an already authenticated parent.

**Action:**

Keep UC-CL04 (`UC_CL_CONFIRM_ADD`) in course-library and keep Parent Gate security isolated to parent-only settings and genuine purchase activation flows. Do not reintroduce a shared PIN hook for assignment.

---

## F2 — Missing domain: cluster UC-A06/A09/A10 into a future `account/` domain

**Classification:** Missing domain.

**Evidence:**

- `docs/architecture/usecases/auth.usecase.puml:15,18,19` — three UCs marked `<<UNDEFINED>>`: `UC_AUTH_RESET` (UC-A06 Reset Password), `UC_AUTH_REFRESH` (UC-A09 Token Refresh), `UC_AUTH_LOGOUT` (UC-A10 Logout). All three have store actions but no UI trigger.
- `src/store/auth.store.js:11-43` — `useAuthStore` already carries `beginRefresh/refreshSuccess/refreshFailure/revoke/logout` actions; what's missing is the UI surface and the API binding.
- `reference/backlog.md` already tracks all three as `BACKLOG-UC-A06`, `BACKLOG-UC-A09`, `BACKLOG-UC-A10`, and `BACKLOG-UC-A06-AFFORDANCE`.

**Action:**

When Lane A resolves the backlog entries, three UI surfaces will need a home: a "Reset password" affordance, a token-refresh trigger (timer or `401` interceptor — system-only, not visual), and a logout button (likely in Parent Settings). The natural home is **not** `auth/` (which today is the pre-login surface owned by Guest) — it's a new `account/` domain owned by the `Authenticated User` actor that can host:

- account self-service (logout, reset, delete-data, COPPA exports — all currently NOT CONFIRMED IN SOURCE)
- session lifecycle (refresh trigger, revoked-session UI)

**Sequencing:** do not create `account/` in this restructure. Add it when the first backlog item lands (whichever does first). Until then keep the three UCs in `auth/` so the index stays stable.

**Rationale:** building an empty domain folder in advance violates "don't add features beyond what the task requires." This is a future-marker, recorded so that when the trigger event (any backlog item resolution) arrives, the splitter knows where to put the result.

---

## F3 — Cross-axis split: parent-gate vs parent-summary + KD5 device-mgmt

**Classification:** Over-engineered area (now resolved historically).

**Evidence:**

- Plan §1.4 documents the legacy "PARENT (gated)" 7-UC group split into puml `parent-gate` (1 UC, UC-PR01) + `parent-summary` (6 UCs, UC-PR02..PR07). UC-CL04 is now the independent course-library `UC_CL_CONFIRM_ADD` use case.
- KD5: legacy "DEVICE MANAGEMENT" had no puml; Lane D added it in Phase 1.
- The 14-folder structure embeds both axis discrepancies; everything works because the index aliases reconcile them.

**Action:**

No code change. Document the reconciliation in `docs/usecases/README.md` §1 (already done — D2 schema rule). When (if) the team wants a single axis, the candidate moves are:

1. Merge `parent-gate` + `parent-summary` puml into one `parent.usecase.puml` (mirrors legacy header).
2. Or split the legacy doc to mirror the puml axis.

Either choice is a one-time renaming churn (per ADR-0005 D2 we explicitly avoided this in the current restructure). Defer to Phase 4 or a future restructure.

**Rationale:** the cross-axis split is the **direct consequence** of the puml axis being source-of-truth for diagrams while legacy IDs are source-of-truth for anchors (D2 + D4). It's intended, not accidental. The dossier exists so future agents don't try to "fix" it without understanding the trade.

---

## F4 — Simplification: collapse unused terminal variants in `lesson-session/states.js`

**Classification:** Simplification.

**Evidence:**

- `src/features/lesson-session/states.js:21-25` — five "Done" group entries beyond `lesson_done`: `timed_out`, `cost_capped`, `parent_stopped`, `abandoned_disconnect`. None of these states is reached by any UC body in `domains/lesson-session/use-cases.md` (Lane B authored 21 UCs; none cite these states in their Main Flow or Error Flow blocks).

**Action:**

Either (a) author UCs that surface these terminal states (each warrants its own UC if it's a real outcome), or (b) remove the unreachable entries. Lane Z's recommendation: **keep them** for now — `useLessonStore` may eventually emit them as system-level outcomes (cost capping, parent-initiated stop) even if no kid-facing screen renders the state. But add a comment in `states.js` clarifying intent.

**Rationale:** unreachable enum entries silently rot; either wire them up or document why they exist. This is a low-severity "future-rot risk," not an active bug.

---

## F5 — Over-engineered area: `*states.js` per domain duplicates nav-graph

**Classification:** Over-engineered area.

**Evidence:**

- 12 `*states.js` files (one per `src/features/<d>/`), 156 lines total — each defines `STATES = [{ id, title, group, kind }, ...]`.
- ADR-0004 (`docs/decisions/0004-flows-modular-restructure.md`) already produces `nav-graph-data.json` as the single source of truth for screens + transitions, with `domain.meta.json` carrying the per-domain `flow` path and `edge_cases` map.
- `*states.js` duplicates the screen-id and group fields that `nav-graph-data.json` already carries.

**Action:**

Defer. ADR-0004 was a clean-slate restructure; touching `*states.js` files would re-open the merge surface that ADR-0004 closed. The duplication is acceptable until a Phase 4 effort can either (a) generate `*states.js` from `nav-graph-data.json`, or (b) replace `*states.js` consumers with direct nav-graph reads.

**Rationale:** this is exactly the kind of "while I'm here" scope creep the task discipline forbids. Recording the observation; no action this sprint.

---

## Cross-cutting note

None of the per-`Page.jsx` files exceed 300 LOC (largest is `HomeHubScreen.jsx` at 175). None imports more than 0 stores directly (stores are accessed inside screens via `useXxxStore()` hook calls, not module-top imports). The "god component" and "leaked store mutation" checklist items returned **zero hits** — the prototype is structurally clean on those axes today.

Stores do not import each other (`grep -rln "from '@/store/" src/store/` returned no matches), so the "leaked store mutation" risk is structurally prevented today; flag if it appears.
