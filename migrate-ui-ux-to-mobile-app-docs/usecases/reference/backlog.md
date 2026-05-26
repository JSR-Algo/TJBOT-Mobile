# Use-Case-Model Backlog

> Concrete carry-forward entries (HR-8 fix). Each entry has an owner, a target-sprint slot (`TBD` until scheduled), and an actionable next step. Resolved entries are removed from this file.

| ID | Owner | Target Sprint | Action |
|---|---|---|---|
| **BACKLOG-UC-A06** (KD1, KD13) | Lane A | TBD | Decide UC-A06 fate: (a) implement Reset Password API + UI handler, OR (b) demote to "affordance" (button-only, no API), OR (c) retire entirely. Update `use-case-index.json` `status` field accordingly. Update `auth.usecase.puml` to remove `<<UNDEFINED>>` once decided. |
| **BACKLOG-UC-A09** (KD2) | Lane A | TBD | Decide UC-A09 fate: (a) wire token-refresh trigger (timer or `401 → refresh`), OR (b) document as system-only with no UI surface, OR (c) retire from index. Update `auth.usecase.puml` to remove `<<UNDEFINED>>` once decided. |
| **BACKLOG-UC-A10** (KD3) | Lane A | TBD | Decide UC-A10 fate: (a) add Logout button to a real screen (kid-settings? parent-settings?), OR (b) document as triggered only by `revoke()` from server. Update `auth.usecase.puml` to remove `<<UNDEFINED>>` once decided. |
| **BACKLOG-UC-A06-AFFORDANCE** (KD13 follow-up) | Lane A | TBD | Companion decision to BACKLOG-UC-A06: explicitly evaluate whether button-only-with-no-API qualifies as a use case at all. If demoted, document the demotion criterion in ADR-0005 §Follow-up so future agents know the rule. |

---

## Adding a Backlog Entry

When a Lane discovers a new defect or open question during Phase 1 authoring, append a row using the schema:

- `ID`: stable kebab-case identifier prefixed `BACKLOG-`
- `Owner`: lane name
- `Target Sprint`: `TBD` until scheduled, then a sprint identifier
- `Action`: one-paragraph next step (verb-first, testable)

Update `reference/known-defects.md` to cross-reference the new backlog entry by ID.
