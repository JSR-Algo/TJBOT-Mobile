# tbot-design — Agent Notes

This sub-repo holds the TBOT mobile-design prototype (`src/`, `nav-graph-data.json`) and two adjacent documentation trees that are easy to confuse:

- `docs/flows/` — mobile-UI nav graph. Generated from `src/features/*/domain.meta.json` and `nav-graph-data.json` by the existing `scripts/flows/` pipeline. Files match `*.generated.mmd` + `*.generated.json`. **Owned by the flow generator** — do not hand-edit.
- `docs/sequences/` — backend API-contract sequence diagrams (sequenceDiagram blocks). Hand-authored + spec-seeded under `docs/sequences/<NN>-<system>/<flow>.sequence.mmd`, one contract-level flow per file, covering all 22 backend systems. Cross-system narratives live in `docs/sequences/_cross/` with required `derived_from:` frontmatter pointing back to their constituent per-system files (per-system files are the source of truth; `_cross/` is derived narrative). Canonical participant allow-list at `docs/sequences/_actors.md` (frozen 2026-05-11). Validate with `npm run sequences:fast`. Authoring rules and lane ownership at `docs/sequences/AGENTS.md`. Plan-of-record at `.omc/plans/backend-sequence-spec-design.md`.

The two trees coexist but never collide: `.generated.mmd` is generator-owned, `.sequence.mmd` is hand-curated. When editing one tree, do not touch the other unless the change spans both.
