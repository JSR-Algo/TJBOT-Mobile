# ERD Ownership Matrix (§12)

Final multi-agent ownership matrix after Phase 2 + Phase 3 convergence. Source: `docs/erd/AGENTS.md` lane assignments + per-lane completion reports.

## Lane → folder → entity counts

| Lane | Agent (Phase 2) | Folders | Entities | Owning service(s) |
|---|---|---|---|---|
| A — tooling + cross-cutting | worker-1 (Phases 1, 3, 4, 5) | `templates/`, `_shared/`, `_global/`, `scripts/erd/`, `CONVENTIONS.md`, `AGENTS.md`, `README.md` | 6 in `_shared/` + 1 template fixture | platform-wide |
| B — identity / admin / security | worker-1 | `01-identity/`, `12-admin/`, `13-security/` | 19 (9 + 5 + 5) | `IdentityService`, `AdminAuthService`, `AdminCommandService`, `SafetyInvestigationService`, `SecurityService`, `SecretsCache`, `BruteForceDetector`, `CertificateVerifier` |
| C — device + runtime + manufacturing | worker-2 | `02-device/`, `03-device-runtime/`, `15-manufacturing/` | 11 (5 + 3 + 3) | `DeviceService`, `OfflineSweepWorker`, `DecommissionWorker`, `TransferWorker`, `RuntimeApp` (mostly device-local), `FactoryCLI` |
| D — realtime + safety | worker-3 | `04-realtime/`, `05-safety/` | 10 (5 + 5) | `RealtimeService`, `Orchestrator`, `ControlPlane`, `PhraseCache`, `RetentionScheduler`, `SafetyService`, `FallbackTemplateStore` |
| E — content + parent + authoring | worker-4 | `06-content/`, `07-parent/`, `20-authoring/` | 19 (10 + 4 + 5) | `ContentService`, `SummaryService`, `DecayScheduler`, `ModerationWorker`, `ControlsService`, `SummaryWorker`, `AuthoringService`, `ReviewerConsole`, `AuthoringConsole` |
| F — config / OTA / notifications / telemetry / retention | worker-5 | `08-config/`, `09-ota/`, `10-notifications/`, `11-telemetry/`, `14-retention/` | 24 (6 + 5 + 5 + 4 + 4) | `ConfigService`, `ConfigAssembler`, `ConfigSigner`, `CohortResolver`, `SchemaTransformer`, `OtaService`, `CrashMonitorWorker`, `NotificationService`, `TelemetryService`, `AuditBuffer`, `MutationHandler`, `CostAttributionWorker`, `AccountDeletionService`, `DeletionExecutor`, `RetentionWorker`, `EmailService` |
| G — mobile / gateway / wire / billing / testing / demo | worker-6 | `16-mobile/` (projection), `17-gateway/`, `18-wire-protocol/` (types), `19-billing/`, `21-testing/` (stateless), `22-demo/` | 13 (0 + 2 + 1 type-file + 8 + 0 + 2) | `BillingService`, `Gateway/WAF`, `ParentApp` (projection), `DemoCLI`, wire-protocol shared types, `CI` stateless |

**Totals: 102 entity tables across 7 lanes + 1 template fixture + 6 cross-cutting `_shared/` tables.**

## Phase ownership reservations

| Phase | Owner | Scope |
|---|---|---|
| Phase 1 | worker-1 (Lane A) | Tooling + conventions + folder skeleton — `scripts/erd/`, `CONVENTIONS.md`, `AGENTS.md`, `README.md`, `templates/`, 24 lane READMEs. |
| Phase 2 | workers 1-6 (Lanes B..G in parallel) | Per-system entity extraction. One agent per `<NN>-<system>/` folder. |
| Phase 3 | worker-1 (Lane A) | Cross-system reconciliation, `_shared/` 6 entities, `_shared/cross-domain-data-flow.md`, `CONVENTIONS` micro-amendment, validator tightening, 2 follow-up stub plans. |
| Phase 4 | worker-1 (Lane A) | Global assembly — 11 narrative MDs under `_global/`. |
| Phase 5 | worker-1 (Lane A) | Validation, critique-before-close, evidence record. Pending cleanups: 7 LIVE cross-folder Refs (Lane C + Lane F), `key_rotations.md` state_machine flip, `provider_failover_records` + `mutation_log` workaround-rename unwinds, `@stateless` annotations in lane READMEs for 22 stateless services. |

## Per-folder ownership (one-line)

| Folder | Owner | Entities | Status |
|---|---|---|---|
| `01-identity/` | Lane B | 9 | landed |
| `02-device/` | Lane C | 5 | landed |
| `03-device-runtime/` | Lane C | 3 | landed |
| `04-realtime/` | Lane D | 5 | landed |
| `05-safety/` | Lane D | 5 | landed |
| `06-content/` | Lane E | 10 | landed |
| `07-parent/` | Lane E | 4 | landed |
| `08-config/` | Lane F | 6 | landed |
| `09-ota/` | Lane F | 5 | landed |
| `10-notifications/` | Lane F | 5 | landed |
| `11-telemetry/` | Lane F | 4 | landed |
| `12-admin/` | Lane B | 5 | landed |
| `13-security/` | Lane B | 5 | landed |
| `14-retention/` | Lane F | 4 | landed |
| `15-manufacturing/` | Lane C | 3 | landed |
| `16-mobile/` | Lane G | 0 (projection-only) | landed |
| `17-gateway/` | Lane G | 2 | landed |
| `18-wire-protocol/` | Lane G | 1 type-file | landed |
| `19-billing/` | Lane G | 8 | landed |
| `20-authoring/` | Lane E | 5 | landed |
| `21-testing/` | Lane G | 0 (stateless) | landed |
| `22-demo/` | Lane G | 2 | landed |
| `_shared/` | Lane A | 6 | landed |
| `_global/` | Lane A | 11 narratives + 2 build artefacts | this phase |

## Conflict-prevention rules (carried from AGENTS.md)

- One agent per `<NN>-<system>/` folder during Phase 2.
- `_shared/` and `_global/` are touched only by Lane A (worker-1) in Phases 3-5.
- `scripts/erd/` touched only by Lane A.
- Cross-domain FKs declared in the **owning** entity file as a comment; live `Ref:` lines stay intra-folder. Cross-folder refs documented in `_shared/cross-domain-data-flow.md`.
