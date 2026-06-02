# ERD — TBOT 22 Backend Systems

**Status:** in-progress (Phase 1 — tooling + conventions + folder skeleton complete; Phase 2 — per-system entity extraction pending).
**Plan of record:** `.omc/plans/erd-22-systems-design.md`.
**Format:** DBML primary + per-entity markdown (mirrors `docs/sequences/` per-system folder convention).
**Replaces:** the previous "TBD" placeholder. Do not re-introduce that sketch.

The ERD is the contract between backend implementers, mobile app, firmware, and authoring tools. Every backend service in `docs/sequences/_actors.md` either owns at least one entity here or carries the `@stateless` annotation in its folder `README.md`.

## How to read

- One folder per backend system, named `<NN>-<system>/`, mirroring `docs/site/software/systems/` and `docs/sequences/`.
- Each entity is two files: `<table>.dbml` (schema) + `<table>.md` (business purpose, lifecycle, related APIs/sequences).
- Cross-cutting tables live in `_shared/` (e.g. `audit_log`, `idempotency_keys`).
- The assembled global ERD lives in `_global/global-erd.dbml` (auto-built) plus a Mermaid projection `_global/global-erd.mmd`.
- Conventions: `CONVENTIONS.md`. Lane ownership: `AGENTS.md`. Template: `templates/entity.{md,dbml}`.

## Domain map

| Folder | System spec | Owning service(s) | Status |
|---|---|---|---|
| `01-identity/` | `docs/site/software/systems/01-identity-household-access.md` | IdentityService | in-progress: 1 of N entities authored (coppa_consents — Phase 2 Lane Z kickoff) |
| `02-device/` | `docs/site/software/systems/02-device-provisioning-registry.md` | DeviceService, OfflineSweepWorker, DecommissionWorker, TransferWorker | in-progress: 1 of N entities authored (pairing_attempts — Phase 2 Lane Z kickoff) |
| `03-device-runtime/` | `docs/site/software/systems/03-device-runtime-local-interaction.md` | RuntimeApp (mostly device-local) | pending |
| `04-realtime/` | `docs/site/software/systems/04-realtime-session-orchestrator.md` | RealtimeService, Orchestrator, ControlPlane, RetentionScheduler | in-progress: 1 of N entities authored (realtime_sessions — Phase 2 Lane Z kickoff) |
| `05-safety/` | `docs/site/software/systems/05-conversation-intelligence-and-safety.md` | SafetyService, BlocklistCache, TopicClassifier, PIIDetector | pending |
| `06-content/` | `docs/site/software/systems/06-content-and-personalization.md` | ContentService, SummaryService, DecayScheduler, ModerationWorker | pending |
| `07-parent/` | `docs/site/software/systems/07-parent-controls-summary.md` | ControlsService, SummaryWorker | pending |
| `08-config/` | `docs/site/software/systems/08-config-fleet-management.md` | ConfigService, ConfigAssembler, ConfigSigner, CohortResolver | pending |
| `09-ota/` | `docs/site/software/systems/09-ota-release-management.md` | OtaService, CrashMonitorWorker | in-progress: 1 of N entities authored (firmware_releases — Phase 2 Lane Z kickoff) |
| `10-notifications/` | `docs/site/software/systems/10-notifications.md` | NotificationService | pending |
| `11-telemetry/` | `docs/site/software/systems/11-telemetry-audit-cost.md` | TelemetryService, AuditBuffer, MutationHandler, CostAttributionWorker | pending |
| `12-admin/` | `docs/site/software/systems/12-support-admin-operations.md` | AdminAuthService, AdminCommandService, SafetyInvestigationService, DeviceTransferService | pending |
| `13-security/` | `docs/site/software/systems/13-security-secrets-management.md` | SecurityService, SecretsCache, BruteForceDetector, CertificateVerifier | pending |
| `14-retention/` | `docs/site/software/systems/14-retention-deletion-backup.md` | AccountDeletionService, DeletionExecutor, RetentionWorker | pending |
| `15-manufacturing/` | `docs/site/software/systems/15-manufacturing-provisioning-factory-test.md` | FactoryCLI workflows | pending |
| `16-mobile/` | `docs/site/software/systems/16-parent-mobile-application.md` | ParentApp (projection-only) | pending |
| `17-gateway/` | `docs/site/software/systems/17-api-gateway-rate-limiting.md` | Gateway / WAF | pending |
| `18-wire-protocol/` | `docs/site/software/systems/18-wire-protocol-domain-types.md` | wire-protocol (shared types) | pending |
| `19-billing/` | `docs/site/software/systems/19-billing-subscription.md` | BillingService | in-progress: 1 of N entities authored (orders updated to P3.C schema — Phase 2 Lane Z kickoff) |
| `20-authoring/` | `docs/site/software/systems/20-content-authoring-review.md` | AuthoringService, ReviewerConsole, AuthoringConsole | pending |
| `21-testing/` | `docs/site/software/systems/21-integration-test-infrastructure.md` | CI (likely stateless) | pending |
| `22-demo/` | `docs/site/software/systems/22-demo-retail-mode.md` | DemoCLI | pending |
| `_shared/` | n/a | platform-wide | in-progress: 1 of N entities authored (audit_logs — Phase 2 Lane Z kickoff) |
| `_global/` | n/a | assembled | pending |

## How to edit

1. Pick or claim a `<NN>-<system>/` folder per `AGENTS.md` lane ownership.
2. Copy `templates/entity.{md,dbml}` to `<NN>-<system>/<table>.{md,dbml}`.
3. Replace the example contents while honouring every rule in `CONVENTIONS.md`.
4. Update the folder `README.md` entity list.
5. Cross-domain FKs go on the **owning** side only — never inline `[ref:]`.
6. Run `npm run erd:fast` — must exit 0 (zero FAIL findings).
7. After all entities for a lane are in: run `npm run erd:full` for the global build smoke check.

## Multi-agent ownership

See `AGENTS.md`. Phase 2 lanes B..G run in parallel and never touch each other's folders. `_shared/` + `_global/` + `scripts/erd/` + `CONVENTIONS.md` + `AGENTS.md` + this file are touched only by Lane A.

## Validation

```bash
npm run erd:fast         # lint per file, FK reachability, frontmatter schema (target <5s)
npm run erd:full         # erd:fast + assemble global-erd.dbml + render Mermaid (target <30s)
npm run erd:fast -- --rule fk-reachable   # single-rule mode
```

The validator implements rules AC-1..AC-13 from the plan. Exit code = number of FAIL findings. WARNs are advisory.

## Prisma emission

Every DBML folder emits a Prisma schema under `<NN>-<system>/schema.prisma` (plus `_shared/schema.prisma`). 23 schemas total: 21 with models + 2 stateless stubs (`16-mobile/`, `21-testing/`). Plan-of-record: `.omc/plans/erd-to-prisma-emission.md`. Final P3 status: `_global/prisma-emission-status.md`.

```bash
npm run prisma:emit                                          # regenerate all 23 schemas from DBML
npm run prisma:emit:dry                                      # preview without writing
npm run prisma:check                                         # parity check (DBML ↔ schema.prisma drift)
DATABASE_URL='postgresql://x:x@localhost/x' \
  npm run prisma:validate                                    # Prisma syntax validation across all schemas

node scripts/erd/dbml-to-prisma.mjs --folder 01-identity         # one folder
node scripts/erd/check-prisma-emission.mjs --folder 01-identity  # one folder parity check
```

Notes:
- Emitted schemas are **generator-owned**: do not hand-edit. Re-run `npm run prisma:emit` and commit.
- `prisma:validate` requires `DATABASE_URL` set (Prisma CLI quirk); a dummy URL satisfies the parser.
- Do NOT run `prisma:format` in CI — Prisma's formatter re-orders attributes and diverges from the emitter's canonical output; the emitter IS the formatter for this repo.
- Cross-folder Refs are **doc-only-comment** (no `@relation`); intra-folder Refs carry `onDelete` per `_global/relationships.md` cascade column.

## Pointers

| For | Look at |
|---|---|
| Plan of record | `.omc/plans/erd-22-systems-design.md` |
| Conventions | `CONVENTIONS.md` |
| Lane ownership | `AGENTS.md` |
| Entity template | `templates/entity.md` + `templates/entity.dbml` |
| Validator | `scripts/erd/validate-erd.mjs` |
| Prisma emitter | `scripts/erd/dbml-to-prisma.mjs` (+ `scripts/erd/lib/parse-dbml.mjs`) |
| Prisma parity check | `scripts/erd/check-prisma-emission.mjs` |
| Prisma final status | `_global/prisma-emission-status.md` |
| Service allow-list | `docs/sequences/_actors.md` |
| Sequence files (lifecycle evidence) | `docs/sequences/<NN>-<system>/*.sequence.mmd` |
