# Documentation Map

This directory holds the project harness and any product contract derived from a
future user-provided spec.

## Main Files

- `HARNESS.md`: how humans and agents collaborate.
- `FEATURE_INTAKE.md`: how prompts become tiny, normal, or high-risk work.
- `ARCHITECTURE.md`: architecture discovery and boundary rules.
- `TEST_MATRIX.md`: living map of behavior to proof.
- `HARNESS_BACKLOG.md`: improvements discovered while working.
- `GLOSSARY.md`: shared terms.

## Folders

- `product/`: current product truth, empty until a spec is derived.
- `stories/`: feature packets and backlog.
- `decisions/`: durable decisions and tradeoffs.
- `demo/`: concrete walkthroughs that show how the harness transforms input
  into agent-ready work.
- `templates/`: reusable spec-intake, story, plan, decision, and validation
  formats.
- `usecases/`: per-domain use-case authoring (129 UCs across 14 domains, plus
  actors, cross-domain edges, hot-UC dossiers). Source-of-truth for use-case
  bodies per ADR-0005. Legacy `architecture/use-case-diagram.md` remains the
  canonical UC ID source (per D2 in ADR-0005).
- `flows/`: per-domain navigation flows, generated from `nav-graph-data.json`
  (per ADR-0004).
- `architecture/`: historical use-case-diagram (UC ID source) + per-domain
  `.usecase.puml` files; high-level architecture map.
- `qa/`: verification matrices and dry-run sign-offs.

## Current State

Harness v0 exists before implementation. These docs define how the project will
grow; they do not imply that app code, tests, CI, or deployment automation exist
yet.
