# AGENTS.md — Authoring rules for migrate-ui-ux-to-mobile-app-docs

## flows/ — Generator-owned. DO NOT hand-edit.

Files match `*.generated.mmd` and `*.generated.json`. Regenerate via:

```sh
cd tbot-mobile && npm run flows:generate
```

## sequences/ — Hand-authored, validator-coupled.

One contract-level flow per file: `docs/sequences/<NN>-<system>/<flow>.sequence.mmd`. Cross-system narratives in `_cross/` require `derived_from:` frontmatter pointing to per-system files (per-system is source of truth). Canonical participant allow-list: `sequences/_actors.md` (frozen 2026-05-11). Validate with `npm run sequences:fast`.

## erd/ — Validator-coupled. Edit dbml, validate with npm run erd:validate.

Each system has its own subdir. `_global/` contains the global ERD and state-machine alignment. Do not edit `.generated.*` files.

## usecases/ — Align with domain.meta.json.

Each domain subdir must align with `src/features/<domain>/domain.meta.json` in `tbot-mobile`. Validate with `npm run usecases:validate`.

## architecture/ — Hand-authored. PlantUML source + rendered png.

Loose markdown files (ARCHITECTURE.md, GLOSSARY.md, HARNESS.md, HARNESS_BACKLOG.md, FEATURE_INTAKE.md, TEST_MATRIX.md) are spec documents — hand-edit with care.

## decisions/ — ADRs. Numbered sequentially. Immutable once merged.

## migration/ — Migration plan files. Hand-authored. Covers PR1–PR8 promotion steps.

## state-machines/ — Placeholder. See erd/_global/state-machine-alignment.md.

## validation/ — No source files here. References validator scripts in tbot-mobile/scripts/.
