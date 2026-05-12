# 20-authoring — Content authoring + review

**System spec:** `docs/site/software/systems/20-content-authoring-review.md`
**Sequences:** `docs/sequences/20-authoring/*.sequence.mmd`
**Owning service(s):** `AuthoringService`, `ReviewerConsole`, `AuthoringConsole`
**Lane:** E (worker-4, Phase 2)
**Status:** pending entity extraction.

## Planned entities (from plan §3 manifest)

| Entity | Role |
|---|---|
| `content_drafts` | Pre-publish draft. |
| `content_revisions` | Revision history. |
| `review_assignments` | Reviewer task assignment. |
| `review_decisions` | Reviewer decision log. |
| `publication_records` | Publication audit log. |
