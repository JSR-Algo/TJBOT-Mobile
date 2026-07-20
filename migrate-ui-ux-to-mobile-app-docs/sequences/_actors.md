# Sequence Actors — Canonical Allow-List (FROZEN)

This file is the **canonical participant allow-list** for `docs/sequences/**/*.sequence.mmd`. Every name appearing in a frontmatter `actors:` array or as a `participant` in the body MUST be on this list.

**Status:** FROZEN — 2026-05-11 by Phase 3 Lane Z2 after Phase 2 lanes A/B/C/D reported validate-clean. AC-9 in `scripts/sequences/validate-sequences.mjs` is now **BLOCKING** (no warn-only). Foreign actors fail the validator.

**Canonicalization decisions applied at freeze time:**
- `Postgres` → `PostgreSQL` (longer canonical form; 25 files renamed by Z2).
- `Server` → `RealtimeService` (`Server` was a generic remote-endpoint placeholder in 18-wire-protocol; renamed for symmetry with the constituent sys-04 service).
- `Identity` candidate avoided in favor of `IdentityService` (Service-suffix convention).
- `GoogleLiveFlash` kept distinct from `GoogleLiveFlashPrimary` / `GoogleLiveFlashFallback` — the latter two are semantically distinct (provider-failover sequence).
- `SecurityEngineer` (one-person ceremony) kept distinct from `SecurityEngineerOne` / `SecurityEngineerTwo` (dual-control ceremony).

**Conventions:**
- PascalCase identifier (no spaces, no hyphens).
- Prefer the longer-named / Service-suffixed canonical form.
- External SaaS or AWS services use their literal product name (`SES`, `Stripe`, `KMS`, `S3`, `CloudFront`, `SQS`, `SNS`, `Redis`, `FCM`, `EventBridge`, `Kinesis`, `PagerDuty`, `YubiHSM`).
- Inbound consumer surfaces are named by client role, not by transport (`ParentApp`, `Device`, `AdminConsole`, `FactoryCLI`, `CI`).

## Allow-list (frozen — 118 actors)

### Consumer surfaces / human roles

- `ParentApp` — parent-facing mobile application (sys-16 consumer surface)
- `SourceParentApp` — source-account parent during device transfer (sys-02)
- `TargetParentApp` — target-account parent during device transfer (sys-02)
- `Device` — tjbot device on Wi-Fi after provisioning (cloud-bound across sys-02..18)
- `BLEDevice` — tjbot device exposed over BLE during provisioning (sys-02/16 boundary)
- `AdminConsole` — admin-operator UI (sys-12)
- `ReviewerConsole` — content-reviewer UI (sys-20)
- `AuthoringConsole` — content-authoring UI (sys-20)
- `FactoryCLI` — factory provisioning CLI (sys-02, sys-15)
- `DemoCLI` — retail-demo build CLI (sys-22)
- `Operator` — human factory or demo operator (sys-15, sys-22)
- `SecurityEngineer` — single-engineer ceremony role (sys-08 KMS key rotation)
- `SecurityEngineerOne` — dual-control engineer 1 (sys-13 OTA key rotation)
- `SecurityEngineerTwo` — dual-control engineer 2 (sys-13 OTA key rotation)
- `CI` — GitHub Actions / CI runner (sys-21)
- `OS` — iOS / Android mobile operating system facility (sys-16)

### tjbot backend services

- `IdentityService` — identity, household, sessions (sys-01)
- `DeviceService` — device-provisioning-registry (sys-02)
- `DeviceTransferService` — admin transfer assist (sys-12)
- `OfflineSweepWorker` — device-offline housekeeping (sys-02)
- `DecommissionWorker` — device decommission worker (sys-02)
- `TransferWorker` — device-transfer worker (sys-02)
- `RuntimeApp` — on-device runtime app (sys-03)
- `Bootloader` — device bootloader (sys-03)
- `Hardware` — device hardware abstraction (sys-03)
- `SafetySupervisor` — device-local safety supervisor (sys-03)
- `RealtimeService` — realtime-session-orchestrator (sys-04, also sys-18 wire-protocol counterparty)
- `Orchestrator` — internal realtime orchestrator role (sys-04, sys-05)
- `ControlPlane` — realtime control plane (sys-04)
- `PhraseCache` — realtime phrase cache (sys-04)
- `RetentionScheduler` — realtime retention scheduler (sys-04)
- `SafetyService` — conversation-intelligence-and-safety (sys-05)
- `BlocklistCache` — safety blocklist cache (sys-05)
- `TopicClassifier` — safety topic classifier (sys-05)
- `PIIDetector` — safety PII detector (sys-05)
- `FallbackTemplateStore` — safety fallback-template store (sys-05)
- `ContentService` — content-and-personalization (sys-06)
- `SummaryService` — summary backend (sys-06)
- `DecayScheduler` — topic-decay scheduler (sys-06)
- `DecayWorker` — topic-decay worker (sys-06)
- `ModerationWorker` — content-moderation worker (sys-06)
- `InvalidationWorker` — content-cache invalidation worker (sys-06)
- `ControlsService` — parent controls backend (sys-07)
- `SummaryWorker` — daily / weekly summary worker (sys-07)
- `NotificationQueue` — parent-notification queue interface (sys-07)
- `ConfigService` — config-fleet-management (sys-08)
- `ConfigAssembler` — config-assembly worker (sys-08)
- `ConfigSigner` — config-signing worker (sys-08)
- `CohortResolver` — device-cohort resolver (sys-08)
- `SchemaTransformer` — config schema-migration worker (sys-08)
- `MqttBroker` — MQTT broker internal handle (sys-08)
- `TriggerSource` — config-push trigger source (sys-08)
- `OtaService` — ota-release-management (sys-09)
- `CrashMonitorWorker` — OTA crash-rate auto-pause worker (sys-09)
- `NotificationService` — notification-delivery (sys-10)
- `TelemetryService` — telemetry-audit-cost (sys-11)
- `AuditBuffer` — telemetry audit buffer (sys-11)
- `MutationHandler` — telemetry mutation handler (sys-11)
- `CostAttributionWorker` — telemetry cost attribution (sys-11)
- `AdminAuthService` — admin auth backend (sys-12)
- `AdminCommandService` — admin remote-command service (sys-12)
- `SafetyInvestigationService` — safety-investigation service (sys-12)
- `SecurityService` — security-secrets-management (sys-13)
- `SecretsCache` — secrets-cache (sys-13)
- `BruteForceDetector` — brute-force detector (sys-13)
- `CertificateVerifier` — mTLS certificate verifier (sys-13)
- `FleetDevices` — fleet-of-devices abstraction (sys-08, sys-13)
- `AccountDeletionService` — account-deletion (sys-14)
- `DeletionExecutor` — deletion-executor worker (sys-14)
- `RetentionWorker` — retention sweep worker (sys-14)
- `EmailService` — internal email facility (sys-14)
- `AuditLog` — audit-log abstraction (sys-12 cross-link)
- `BillingService` — billing-subscription (sys-19)
- `AuthoringService` — content-authoring backend (sys-20)
- `PublishOrchestrator` — authoring publish orchestrator (sys-20)
- `SafetyScreener` — authoring safety screener (sys-20)
- `BackendService` — generic downstream route handler placeholder (sys-13, sys-17)
- `Gateway` — API Gateway / rate-limit edge (sys-17)

### Test / demo / factory infrastructure

- `VoicePathRunner` — E2E voice-path harness orchestrator (sys-21)
- `DeviceSimulator` — software-ESP32 simulator (sys-21)
- `ProviderMocks` — Google Live Flash mock cluster (sys-21)
- `AssertionEngine` — harness assertion engine (sys-21)
- `RedTeamRunner` — safety-regression runner (sys-21, also sys-05 author)
- `AdversarialPromptLoader` — safety-regression prompt loader (sys-21)
- `SafetyResultEvaluator` — safety-regression result evaluator (sys-21)
- `RegressionReporter` — safety-regression reporter (sys-21)
- `DemoStateMachine` — retail-demo state machine (sys-22)
- `FlashImageBuilder` — retail-demo flash-image builder (sys-22)
- `ESPTool` — esptool flasher (sys-22)
- `FlashPartition` — device flash partition (sys-22)
- `NVS` — device NVS partition (sys-22)
- `AudioPlayer` — demo audio player (sys-22)
- `LabelPrinter` — factory label printer (sys-15)
- `IntermediateCA` — intermediate certificate authority (sys-02, sys-15)
- `AirGappedWorkstation` — air-gapped engineer workstation (sys-13)
- `YubiHSM` — YubiHSM hardware (sys-13)

### External services / SaaS / AWS

- `SES` — AWS Simple Email Service
- `SNS` — AWS Simple Notification Service
- `SQS` — AWS Simple Queue Service
- `KMS` — AWS Key Management Service
- `S3` — AWS Simple Storage Service
- `Redis` — managed Redis cache (ElastiCache)
- `PostgreSQL` — managed PostgreSQL (RDS)
- `EventBridge` — AWS EventBridge
- `CloudFront` — AWS CloudFront CDN
- `CloudWatch` — AWS CloudWatch metrics
- `CloudWatchLogs` — AWS CloudWatch Logs
- `KinesisFirehose` — AWS Kinesis Data Firehose
- `ALB` — AWS Application Load Balancer
- `PagerDuty` — PagerDuty incident routing
- `SecretsManager` — AWS Secrets Manager
- `FCM` — Firebase Cloud Messaging
- `Stripe` — Stripe billing provider
- `ClaudeHaiku` — Anthropic Claude Haiku (content-authoring screen)
- `GoogleLiveFlash` — Google Live Flash 3.1 provider (sys-04 main usage)
- `GoogleLiveFlashPrimary` — Google Live Flash primary region (sys-04 provider-failover)
- `GoogleLiveFlashFallback` — Google Live Flash fallback region (sys-04 provider-failover)
- `GoogleTTS` — Google Text-to-Speech (sys-22 build-time)
- `MQTT` — MQTT transport / AWS IoT Core (sys-07, sys-12, sys-08 user-facing handle)

## Freeze protocol — completed

This list was unioned from every per-system file authored by Phase 2 lanes A/B/C/D and Phase 3 Lane Z2's own files (10-notifications, 21-testing, _cross). Canonicalization rules applied at freeze time are documented above. Validator AC-9 is now blocking — any new `.sequence.mmd` referencing an actor outside this list fails `npm run sequences:validate`.

Adding a new actor: edit this file, append to the appropriate section, then re-run `npm run sequences:fast` to confirm the validator accepts it.
