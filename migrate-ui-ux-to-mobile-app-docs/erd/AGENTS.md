# ERD Lane Ownership

Lane ownership mirrors `docs/sequences/AGENTS.md` (or the equivalent partitioning rule in `docs/sequences/`): **one agent per `<NN>-<system>/` folder during Phase 2**. `_shared/` and `_global/` are touched only in Phases 3-5 by the orchestrator. `scripts/erd/` is touched only in Phase 1.

## Lane map

| Lane | Agent | Folders | Rationale |
|---|---|---|---|
| A | worker-1 | `templates/`, `_shared/`, `_global/`, `scripts/erd/`, `CONVENTIONS.md`, `AGENTS.md`, `README.md` | Tooling + cross-cutting; serialised to avoid races. |
| B | worker-1 | `01-identity/`, `12-admin/`, `13-security/` | COPPA / auth / secret-management nuance; reasoning-heavy. |
| C | worker-2 | `02-device/`, `03-device-runtime/`, `15-manufacturing/` | Device + factory lifecycle; tight scope. |
| D | worker-3 | `04-realtime/`, `05-safety/` | Realtime + safety event flow; complex retention. |
| E | worker-4 | `06-content/`, `07-parent/`, `20-authoring/` | Content + parent + authoring; mutual references. |
| F | worker-5 | `08-config/`, `09-ota/`, `10-notifications/`, `11-telemetry/`, `14-retention/` | Fleet + telemetry + retention; hypertables and legal. |
| G | worker-6 | `16-mobile/`, `17-gateway/`, `18-wire-protocol/`, `19-billing/`, `21-testing/`, `22-demo/` | Mostly stateless or external; one heavy domain (billing). |

`_shared/` and `_global/` are reserved for worker-1 during Phases 3-5. No Phase 2 lane may add files there. If a Phase 2 lane discovers a cross-cutting entity (e.g. `audit_log`, `idempotency_keys`), it logs a TODO in the entity .md body and the orchestrator promotes it to `_shared/` in Phase 3.

## Phase order

1. **Phase 1 — Lane A (worker-1, sequential).** Tooling + conventions + skeleton + npm scripts. Blocks every Phase 2 lane.
2. **Phase 2 — Lanes B..G in parallel.** Per-system entity extraction. Lanes never read or write outside their assigned folders.
3. **Phase 3 — Lane A.** Cross-system reconciliation + populate `_shared/`.
4. **Phase 4 — Lane A.** Global assembly + 14 deliverables in `_global/`.
5. **Phase 5 — Lane A.** Validation + critique-before-close + evidence record.

## Cross-system FK rule

Cross-system foreign keys are declared in the **owning** entity's `.dbml` file (the side that owns the target table) with a comment `// cross-domain ref → OwnerService`. The consuming side carries the column only. Phase 3 reconciles direction.

## Validator gate

`npm run erd:fast` runs the validator (`scripts/erd/validate-erd.mjs`). Every lane runs it after each new entity. CI fails on any FAIL-severity finding.

## Out-of-bounds writes

If a lane edits another lane's folder, the change is reverted by Phase 3 reconciliation. If it must do so (e.g. to fix a typo), it must coordinate via the shared task list first.
