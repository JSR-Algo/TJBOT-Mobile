# migrate-ui-ux-to-mobile-app-docs

Docs workspace for the TBOT mobile app. Source-of-truth for all design, API contracts, ERD, flows, sequences, and use-cases. Moved from `tbot-mobile/tbot-design/docs/` during PR1.

## Subdirectory ownership

| Dir | Purpose | Owned by |
|---|---|---|
| `architecture/` | System architecture diagrams (puml, png, md) + ARCHITECTURE.md, GLOSSARY.md, HARNESS.md, TEST_MATRIX.md | Hand-authored |
| `api/` | API specs; `openapi.json` symlinked from `../../docs/site/api/` | Backend team |
| `decisions/` | Architecture Decision Records (ADRs) | Hand-authored |
| `erd/` | Entity-relationship diagrams (25 subdirs, dbml + prisma) | Validator-coupled — edit with `npm run erd:validate` |
| `flows/` | Mobile UI nav-graph flows | Generator-owned (`*.generated.mmd`, `*.generated.json`) — do NOT hand-edit |
| `master-prompts/` | Agent master-prompt templates | Hand-authored |
| `migration/` | Migration plan files for tbot-design→tbot-mobile promotion (PR1–PR8) | Hand-authored |
| `product/` | Product specs and briefs | Hand-authored |
| `qa/` | QA verification matrices | Hand-authored |
| `sequences/` | Backend API-contract sequence diagrams (22 systems + `_cross/`) | Hand-authored; validate with `npm run sequences:fast` |
| `state-machines/` | State-machine alignment docs (placeholder) | See `erd/_global/state-machine-alignment.md` |
| `stories/` | User story files | Hand-authored |
| `templates/` | Doc templates | Hand-authored |
| `usecases/` | Use-case domain models (15 domains + actors + reference) | Validator-coupled — align with `domain.meta.json` |
| `validation/` | Validation script references | See `tbot-mobile/scripts/` |

## Validators

Run from `tbot-mobile/`:

```sh
npm run erd:validate
npm run sequences:fast
npm run usecases:validate
npm run flows:validate
```
