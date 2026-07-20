# Use Case Model — tjbot-mobile (tjbot-design)

Per-domain use-case authoring split out of `docs/architecture/use-case-diagram.md` (504-line monolith) per ADR-0005. Reads `docs/architecture/usecases/*.usecase.puml` as the authoritative diagram source.

> **Status:** Phase 0 skeleton (Lane Z infra). Per-domain bodies authored by Lanes A/B/C/D in Phase 1. See `.omc/plans/usecase-model-mobile.md` v3.1.

---

## 1. ID schema (D2)

Two ID schemas live side-by-side:

| Schema | Source | Role |
|---|---|---|
| `UC-LL-NN` | `docs/architecture/use-case-diagram.md` | **Canonical.** All anchors, indices, cross-references use this. |
| `UC_<PREFIX>_<VERB>` | `docs/architecture/usecases/<d>.usecase.puml` | **Alias.** Recorded in `reference/use-case-index.json` `aliases: [...]`. Never an anchor target. |

**Prefix set (D2):** `{AUTH, ONB, HUB, CRS, LSN, PRG, PG, PRT, CL, BUY, DP, RM, FB}`. KD5 device-mgmt UCs (UC-DM01..06) currently have no puml and therefore no alias; recorded in `reference/alias-overrides.json` with `override: "no-puml"`.

**Never invent a UC ID.** Index keys ⊂ legacy doc UC IDs (AC11). Any new UC requires a legacy-doc edit + index regeneration.

---

## 2. Per-domain anchor convention

Every UC owned by a domain gets one H2 in `domains/<d>/use-cases.md`:

```markdown
## UC-LL-NN — <title from legacy doc>

- **Goal:** one line
- **Trigger:** one line
- **Preconditions:** one line
- **Main Flow:**
  1. step
  2. step
- **Postconditions:** one line
```

**Mandatory sections (≥ 5):** Goal, Trigger, Preconditions, Main Flow, Postconditions. **Optional:** Alt Flow, Error Flow. If present, body must be non-empty (no `(none)` stubs — AC2).

---

## 3. Backend mapping (D3 — sentinel rule)

`domains/<d>/backend-mapping.md` columns:

| UC ID | Endpoint | Service | DB Entity | Events | Domain ADR Pointer |
|---|---|---|---|---|---|

**Cell rules (AC4):**
- `Endpoint`: real `*.api.js` export OR sentinel `BACKEND_NOT_DESIGNED`. Cited file must exist.
- `Service`: real store action (e.g. `auth.store.js → loginSuccess`) OR sentinel.
- `DB Entity`: entry from `docs/erd/README.md` "Expected entities" table OR sentinel.
- `Events`: literal value `BACKEND_NOT_DESIGNED` until backend lands (no event bus exists in prototype).
- `Domain ADR Pointer`: `—` if **all** four cells are sentinel; otherwise must cite an existing `decisions/NNNN-backend-<domain>.md` ADR file (AC5).

**`BACKEND_NOT_DESIGNED` is structurally protected** — `check-backend-sentinel.mjs` rejects any cell that is neither a real export nor the sentinel.

---

## 4. Edge-case coverage (D5)

`domains/<d>/edge-cases.md` declares per UC a non-empty subset of:

```
{ cancel, error, retry, timeout, unauthorized, validation, n/a }
```

Plus one-line rationale per chosen mode (≥ 20 chars).

**`n/a` justification (AC6):** rationale must contain a keyword from `{stateless, single-step, no-async, view-only, terminal}`.

**`n/a` ratio cap:** ≤ 50% per domain. Exceeding triggers Lane Z review via `reference/edge-case-overrides.md`.

Linking to `docs/flows/edge-cases/<mode>.flow.mmd` is **informational only** — coverage is semantic, not link-presence.

---

## 5. Cross-domain edges (D6)

Cross-domain edges (`<<include>>`/`<<extend>>`/`<<delegate>>`/`<<requires>>`/`<<launches>>`/`<<emits>>`/`<<continues>>`/`<<re-enters>>`/`<<resumes>>`/`<<exits>>`) live **only** in `reference/cross-domain-edges.json`. Per-domain files reference target IDs only:

```markdown
## UC-H08 — Enter Parent Space
- **Postconditions:** parent gate handoff (see cross-domain-edges.json: UC-H08→UC-PR01)
```

**AC7 enforcement:** `check-cross-domain-edges.mjs` rejects any per-domain `→ UC-LL-NN` line whose target prefix differs from the file's domain. Lines containing the literal `cross-domain-edges.json:` are exempt (legitimate cross-references).

**Proposal protocol:** lanes propose new edges via PR description block `## Cross-Domain Edge Proposals`. Lane Z merges deterministically (alphabetical by `{source, target}`).

---

## 6. Diagram primary (D4)

`.usecase.puml` is the diagram source-of-truth. `.mmd` is generator output, **deferred to Phase 4**. Until then we ship `.puml` only. Per-domain pumls live at `domains/<d>/diagrams/<d>.usecase.puml` (copied from `docs/architecture/usecases/`).

**Read-only in Phase 1:** lanes copy puml into `domains/<d>/diagrams/` but do not edit it. The single sanctioned new puml is Lane D's `device-mgmt.usecase.puml` (KD5 — addresses the missing 6-UC domain).

---

## 7. Acceptance criteria & validators

See `.omc/plans/usecase-model-mobile.md` §2 for AC1–AC14. Run validators from repo root:

```bash
node scripts/usecases/check-index-coverage.mjs        # AC1, AC11, AC14
node scripts/usecases/check-uc-sections.mjs           # AC2
node scripts/usecases/check-backend-sentinel.mjs      # AC4, AC5
node scripts/usecases/check-edge-case-enum.mjs        # AC6
node scripts/usecases/check-cross-domain-edges.mjs    # AC7
node scripts/usecases/check-lane-coverage.mjs         # AC8
node scripts/usecases/check-known-defects.mjs         # AC12
```

All scripts ≤ 100 LOC, pure ESM, node-only deps.

---

## 7.5. Actor cross-walk to sequence allow-list

`reference/actor-glossary.md` (added 2026-05-12) maps every UC actor in `actors/` to the canonical participant name in `docs/sequences/_actors.md` (frozen 118-entry allow-list). Read this any time a UC body needs to cross-reference a sequence diagram or a new sequence references a UC. Closes audit anomalies AN-12 + AN-13.

---

## 8. Layout

```
docs/usecases/
├── README.md                        ← this file
├── ADR-0005-usecase-model-structure.md
├── actors/
│   ├── child.md / parent.md / guest.md / authenticated-user.md
│   └── external/
│       ├── rotjtjbot-device.md / realtime-voice-service.md / google-oauth.md
│       ├── apple-sign-in.md / payment-provider.md / device-os.md / wifi-network.md
├── domains/<d>/                     ← 14 domains (13 puml + device-mgmt KD5)
│   ├── use-cases.md
│   ├── backend-mapping.md
│   ├── edge-cases.md
│   ├── diagrams/<d>.usecase.puml
│   └── hot/UC-XX.md                 ← optional, hot-UC governance §6.2 of plan
├── reference/
│   ├── use-case-index.json
│   ├── alias-overrides.json
│   ├── cross-domain-edges.json
│   ├── multi-agent-execution.md
│   ├── known-defects.md
│   ├── backlog.md
│   ├── actor-glossary.md            ← UC actor ↔ docs/sequences/_actors.md cross-walk (P1.3, 2026-05-12)
│   ├── backend-mapping.md           ← generated rollup (Phase 2)
│   └── clean-architecture-recs.md   ← Phase 2
├── diagrams/overview.puml
└── templates/
    ├── use-cases.template.md
    ├── backend-mapping.template.md
    └── hot-uc.template.md
```

---

## 9. Lane ownership

See `reference/multi-agent-execution.md`. Single-writer-per-file. Lane Z owns `actors/`, `reference/`, `templates/`, `diagrams/overview.puml`, `ADR-0005-*.md`, scripts, and integration.
