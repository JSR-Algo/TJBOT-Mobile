# _global — Assembled ERD artefacts

**Owner:** Lane A (worker-1, Phase 4 only — Phase 2 lanes never touch this folder).

This folder holds outputs assembled from the per-domain ERD files by `scripts/erd/build-global-erd.mjs` and `scripts/erd/dbml-to-mermaid.mjs`, plus the 14 hand-written deliverables required by plan §4.

Planned contents:

| File | Source | Role |
|---|---|---|
| `global-erd.dbml` | auto-built | concatenated domain DBML |
| `global-erd.mmd` | auto-rendered | Mermaid `erDiagram` |
| `domain-overview.md` | hand | plan deliverable 4.3 |
| `relationships.md` | hand | plan deliverable 4.4 |
| `state-machine-alignment.md` | hand | plan deliverable 4.5 |
| `api-alignment.md` | hand | plan deliverable 4.6 |
| `validation-constraints.md` | hand | plan deliverable 4.7 |
| `indexes.md` | hand | plan deliverable 4.8 |
| `audit-history-strategy.md` | hand | plan deliverable 4.9 |
| `edge-cases.md` | hand | plan deliverable 4.10 |
| `ownership.md` | hand | plan deliverable 4.11 |
| `implementation-readiness.md` | hand | plan deliverable 4.12 |
| `clean-architecture-recommendations.md` | hand | plan deliverable 4.13 |

Phase 4 will materialise each file. Phase 1 leaves the folder empty except for this README.
